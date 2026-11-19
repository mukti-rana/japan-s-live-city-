"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { PHOTO_ASPECT, TREE_ASPECT, TREES, WATER, treeSrc } from "@/components/auth/sakuraScene";

// The living water, the drifting sky and the valley mist of the sign-in scenery, drawn by a small WebGL shader over the photograph.
//
// The shader looks at the same photograph and, for every pixel of the lake, looks up the picture a little to one side and
// a little up or down instead: a slowly flowing field of noise, stretched sideways into long low ripples and made finer toward the
// horizon (perspective), with a long gentle swell on top. Because it moves the photograph's own pixels, Mount Fuji's reflection,
// the hill's reflection and the shore wobble and drift with the water, exactly as a real reflection does, and the cherry trees'
// reflection (drawn into a second picture) moves with them. Sparse glints of light run along the ripples, and the light on the
// water breathes very slowly. Above the shore, thin cloud drifts across the sky (never in front of the mountain) and a soft mist
// lies along the valley.
//
// Only the lake is repainted opaquely; everywhere else the canvas is nearly transparent and carries just a faint cloud or mist, so
// the full-resolution photograph underneath stays the picture. It is drawn at a modest resolution (less on phones), paused while the
// tab is hidden, switched off for visitors who ask for less motion, and if WebGL or the cross-origin picture is unavailable
// nothing is drawn and the page simply keeps the still photograph. The photograph is read straight from Wikimedia Commons (which
// allows it), not copied into the project.

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform sampler2D uTrees;
uniform float uT;
const float ASPECT = ${PHOTO_ASPECT.toFixed(4)};
const float WATER = ${WATER.toFixed(3)};

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}
// The mountain's skyline across the photograph (y of the silhouette at x), so clouds stay in the sky.
float skyline(float x){
  if (x < 0.19) return mix(0.33, 0.345, x / 0.19);
  if (x < 0.54) return mix(0.345, 0.158, (x - 0.19) / 0.35);
  if (x < 0.762) return mix(0.158, 0.319, (x - 0.54) / 0.222);
  return mix(0.319, 0.375, (x - 0.762) / 0.238);
}

void main(){
  vec2 uv = vUv;
  float t = uT;
  float breathe = 0.5 + 0.5 * sin(t * 0.11);           // the light on the water, very slowly
  vec4 P = vec4(0.0); // premultiplied colour and coverage

  if (uv.y >= WATER) {
    // ── The lake ───────────────────────────────────────────────────────────────────────────────────────────────────
    float d = (uv.y - WATER) / (1.0 - WATER);            // 0 at the shore, 1 at the bottom of the picture
    float z = 1.0 / (d * 1.15 + 0.07);                   // perspective: ripples are finer and denser far away
    vec2 wp = vec2((uv.x - 0.5) * ASPECT * z * 0.5, z);
    vec2 flow = vec2(t * 0.06, t * 0.16);
    // Long low ripples: noise stretched along x, flowing slowly.
    float nx = fbm(wp * vec2(0.55, 4.6) + flow + vec2(3.1, 1.7));
    float ny = fbm(wp * vec2(0.7, 5.4) - flow * 0.8 + vec2(11.0, 4.3));
    // Smaller crossing ripples.
    float mx = vnoise(wp * vec2(2.6, 9.0) + flow * 1.9);
    // A long gentle swell passing through.
    float swell = sin(z * 1.6 - t * 0.55 + vnoise(wp * 0.6) * 4.0);
    float ramp = smoothstep(0.0, 0.07, d) * (0.45 + 0.55 * d);
    vec2 off = vec2(
      ((nx - 0.5) * 0.018 + (mx - 0.5) * 0.006 + swell * 0.0032),
      ((ny - 0.5) * 0.0075 + swell * 0.0015)
    ) * ramp;
    vec2 p = vec2(clamp(uv.x + off.x, 0.0, 1.0), clamp(uv.y + off.y, WATER, 1.0));
    vec3 rgb = texture2D(uPhoto, p).rgb;
    // The cherry trees' reflection (already turned over in its own picture), moving with the same ripples.
    vec4 tr = texture2D(uTrees, p);
    float fade = smoothstep(0.0, 0.05, d) * (1.0 - d * 0.55);
    rgb = mix(rgb, tr.rgb * 0.82, tr.a * 0.62 * fade);
    // Glints: sparse bright dashes along the ripples, strongest under the mountain, flickering as the water moves.
    float g = smoothstep(0.7, 0.93, fbm(wp * vec2(0.9, 10.0) + flow * 2.4 + vec2(5.0, 8.0)));
    float under = 0.35 + 0.65 * exp(-pow((uv.x - 0.56) * 2.6, 2.0));
    rgb += vec3(1.0, 0.86, 0.9) * g * under * (0.16 + 0.14 * breathe) * smoothstep(0.02, 0.12, d);
    // The light on the water warms and cools a little.
    rgb *= vec3(1.0 + 0.035 * (breathe - 0.5), 1.0, 1.0 - 0.03 * (breathe - 0.5));
    P = vec4(rgb, 1.0);
  } else {
    // ── The sky: thin clouds, drifting at two speeds, only above the mountain's skyline ────────────────────────────
    float edge = skyline(uv.x);
    float sky = smoothstep(edge - 0.008, edge - 0.05, uv.y) * smoothstep(0.0, 0.05, uv.y);
    float c1 = fbm(vec2(uv.x * ASPECT * 1.5 - t * 0.012, uv.y * 5.2 + 3.0));
    float c2 = fbm(vec2(uv.x * ASPECT * 3.4 - t * 0.022, uv.y * 11.0 + 9.0));
    float cloud = smoothstep(0.48, 0.78, c1) * 0.42 + smoothstep(0.54, 0.8, c2) * 0.22;
    cloud *= sky;
    // A soft warm glow drifting in the upper right: the dusk light.
    float glow = exp(-pow(length((uv - vec2(0.8 + 0.04 * sin(t * 0.05), 0.2)) * vec2(1.4, 1.0)), 2.0) * 7.0) * (0.05 + 0.05 * breathe);
    vec3 cc = mix(vec3(0.97, 0.93, 0.98), vec3(1.0, 0.86, 0.9), smoothstep(0.1, 0.4, uv.y));
    P = vec4(cc * cloud + vec3(1.0, 0.82, 0.78) * glow, cloud + glow);
  }

  // ── Mist lying along the valley, above and over the shore ──────────────────────────────────────────────────────────
  float band = smoothstep(0.37, 0.49, uv.y) * smoothstep(0.62, 0.52, uv.y);
  float m = fbm(vec2(uv.x * ASPECT * 2.1 + t * 0.011, uv.y * 8.0 + sin(t * 0.04) * 0.6));
  float mist = smoothstep(0.42, 0.78, m) * band * 0.3;
  vec3 mc = vec3(0.9, 0.87, 0.97);
  P = P * (1.0 - mist) + vec4(mc * mist, mist);   // the mist laid over whatever is there

  gl_FragColor = P;
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function loadImage(src: string, cors: boolean) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// The trees in their reflection: every tree drawn turned over about the waterline, in a picture of the photograph's proportions.
async function reflectionCanvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  if (!ctx) return cv;
  const imgs = await Promise.all(TREES.map(async (t) => [await loadImage(treeSrc(t, "wood"), false), await loadImage(treeSrc(t, "bloom"), false)] as const));
  ctx.filter = "blur(1.2px)";
  TREES.forEach((t, i) => {
    const tw = t.w * w;
    const th = tw * TREE_ASPECT;
    const footX = t.x * w;
    const footY = t.y * h;
    ctx.save();
    ctx.translate(0, 2 * WATER * h); // turn over about the waterline
    ctx.scale(1, -1);
    ctx.translate(footX, footY);
    if (t.flip) ctx.scale(-1, 1);
    ctx.globalAlpha = t.back ? 0.8 : 1;
    ctx.drawImage(imgs[i][0], -tw / 2, -th, tw, th);
    ctx.drawImage(imgs[i][1], -tw / 2, -th, tw, th);
    ctx.restore();
  });
  return cv;
}

export default function WaterCanvas({ src }: { src: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    let dead = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: "low-power" });
      if (!gl) return;
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fsh = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fsh) return;
      const prog = gl.createProgram();
      if (!prog) return;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fsh);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const texture = (unit: number, source: TexImageSource) => {
        const tex = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
      };

      let photo: HTMLImageElement;
      let reflection: HTMLCanvasElement;
      try {
        photo = await loadImage(src, true);
        reflection = await reflectionCanvas(1024, Math.round(1024 / PHOTO_ASPECT));
      } catch {
        return; // no cross-origin picture or no trees: the still photograph stays
      }
      if (dead) return;
      texture(0, photo);
      texture(1, reflection);
      gl.uniform1i(gl.getUniformLocation(prog, "uPhoto"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uTrees"), 1);
      const uT = gl.getUniformLocation(prog, "uT");

      const small = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
      const fps = small ? 30 : 60;
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25);
        const w = Math.max(320, Math.min(small ? 1000 : 1700, Math.round(r.width * dpr * (small ? 0.75 : 1))));
        canvas.width = w;
        canvas.height = Math.round(w / PHOTO_ASPECT);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);

      const start = performance.now();
      let last = 0;
      let first = true;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (document.hidden || now - last < 1000 / fps - 2) return;
        last = now;
        gl.uniform1f(uT, ((now - start) / 1000) % 3600);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (first) {
          first = false;
          canvas.dataset.ready = "1";
        }
      };
      raf = requestAnimationFrame(frame);

      const lost = (e: Event) => {
        e.preventDefault();
        canvas.hidden = true;
      };
      canvas.addEventListener("webglcontextlost", lost);
      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("webglcontextlost", lost);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [src, reduced]);

  return <canvas ref={ref} aria-hidden="true" className="auth-water absolute inset-0 h-full w-full opacity-0 brightness-[1.28] contrast-[1.22] transition-opacity duration-[1600ms] data-[ready]:opacity-100" />;
}
