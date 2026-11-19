"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { BONES, BONE_COUNT, sharedSim } from "@/components/auth/treeRig";

// Brings the sign-in picture to life without changing it. A WebGL shader draws the very same picture (so its colours, light and
// composition do not change) and moves its pixels in four ways:
//
//  - The LAKE is a real, if simple, water surface: a sum of seven wave trains of different sizes, directions and speeds (long slow
//    swells in the foreground, short quick chop further out, speeds from the deep-water rule that bigger waves travel faster),
//    each with its direction drifting and its crests bent by noise, so nothing is a straight, repeating ripple. Each pixel of the water
//    looks up the picture where the surface slope says the reflection comes from, so the reflections already in the picture (the
//    sunset, the cherry trees, Mount Fuji, the string of lights) stretch, break and slide with the waves exactly as real ones do; sun
//    glitter flashes from the wave facets that face the sun; calm slicks and ruffled patches wander over the lake, and now and then a
//    ring spreads from a drop and crosses the others.
//  - The CHERRY TREES are lifted off the picture and deformed with a skeleton (treeRig.ts), over a still plate of the sky behind them
//    (so the sky never moves with the branches; see scripts/make-tree-plate.mjs): every branch is a chain of bones traced over the picture, moved by a
//    wind simulation (breeze, random gusts sweeping in from the left, springs that lean, overshoot and settle), and every pixel near a
//    branch moves with that branch. Thick limbs stay almost still; thin branches give; twigs swing most and a little late; the blossom
//    and leaves go wherever their twig goes and shiver as it moves.
//  - The CLOUDS travel. The sky and the band of mist over the mountain are split (scripts/make-tree-plate.mjs) into a smooth, still base and the
//    cloud detail; the detail drifts through the base along the wind (higher clouds faster, mist slowest, reshaping as it goes, passing behind
//    the mountain's outline) while the sunset glow and the blue stay put.
//  - The LIGHT breathes, very slowly.
//
// The petals are separate (PetalField), lifted by the same gusts. This is drawn at the screen's own resolution (less on phones),
// paused while the tab is hidden, and not started at all for visitors who ask for less motion; if WebGL is unavailable (or its
// uniforms are too few for the skeleton) nothing is drawn and the still picture underneath simply stays.

const VERT = `attribute vec2 aPos; varying vec2 vS; void main(){ vS = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vS;
uniform sampler2D uImg;
uniform sampler2D uPlate; // the picture with the trees taken out and the sky behind them filled in
uniform sampler2D uTree;  // masks: R = tree (branch or blossom), G = sky above the skyline, B = the band of mist over the mountain
uniform sampler2D uBase;  // the still, smooth colour of the sky and of the mist band, with the cloud detail blurred away
uniform sampler2D uCloud; // the cloud detail itself (0.5 = none), which is slid across the base
uniform float uT;
uniform vec4 uMap;   // screen -> picture: offset x, offset y, scale x, scale y
uniform vec4 uSeg[NB];  // bones, in picture-height units with x scaled by the aspect: base x,y and tip x,y
uniform vec4 uRS[NB];   // per bone: how far its influence reaches (x), and how fast its tip is moving (y)
uniform vec4 uXf[NB];   // each bone's current motion: how far its base has been carried (x,y), cos and sin of its total rotation
const float IA = 1.7768;
#define OCT 4

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCT; i++) { v += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}
// The waterline across the picture (y at x): the shore on the left sits a little lower than the far bank.
float waterline(float x){ return mix(0.668, 0.652, smoothstep(0.12, 0.42, x)); }

// Skinning: every point of the picture near a branch moves with the branch (blended by how close it is). Returns the displacement
// (aspect space), how fast the wood nearby is moving, and how much wood there is nearby at all.
vec2 skin(vec2 P, out float act, out float cover){
  vec2 sum = vec2(0.0);
  float wsum = 0.0;
  act = 0.0;
  for (int i = 0; i < NB; i++) {
    vec4 s = uSeg[i];
    vec2 a = s.xy;
    vec2 ab = s.zw - a;
    float h = clamp(dot(P - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec2 q = P - a - ab * h;
    float rr = uRS[i].x;
    float d2 = dot(q, q) / (rr * rr);
    if (d2 > 9.0) continue;
    float w = exp(-d2);
    vec4 x = uXf[i];
    vec2 rel = P - a;
    vec2 rot = vec2(x.z * rel.x - x.w * rel.y, x.w * rel.x + x.z * rel.y);
    sum += w * (x.xy + rot - rel);
    wsum += w;
    act += w * uRS[i].y;
  }
  cover = clamp(wsum, 0.0, 1.0);
  act /= wsum + 0.03;
  return sum / (wsum + 0.03);
}

// The clouds: the smooth sky stays where it is and the cloud detail drifts through it, so the sunset and the blue never move but the
// clouds travel, as real ones do. Two copies of the detail, half a cycle apart, slide along the wind and cross-fade so the loop never
// shows; the high sky travels a little faster than the low sky, the mist more slowly still, and a slow noise reshapes the clouds as
// they go. Clouds are cut off by the mountain's outline (they pass behind it) because the mask is the sky only.
vec3 cloudsAt(vec2 u, vec3 fallback, float t){
  vec3 m = texture2D(uTree, u).rgb;
  float sky = m.g;
  float mist = m.b;
  float k = max(sky, mist);
  if (k < 0.004) return fallback;
  float spd = mix(mix(1.3, 0.65, smoothstep(0.04, 0.46, u.y)), 0.4, mist);
  float T = 80.0;
  float a = fract(t / T);
  float b = fract(t / T + 0.5);
  float w0 = 1.0 - abs(2.0 * a - 1.0);
  vec2 dir = vec2(1.0, 0.025);
  float D = 0.13 * spd;
  vec2 wob = (vec2(fbm(u * 3.0 + vec2(t * 0.012, 0.0)), fbm(u * 3.0 + vec2(5.0, -t * 0.014))) - 0.5) * 0.024;
  vec3 d0 = (texture2D(uCloud, clamp(u - dir * D * a + wob, 0.0, 1.0)).rgb - 0.5) * 0.8;
  vec3 d1 = (texture2D(uCloud, clamp(u - dir * D * b + wob, 0.0, 1.0)).rgb - 0.5) * 0.8;
  vec3 col = texture2D(uBase, u).rgb + mix(d1, d0, w0);
  return mix(fallback, col, k);
}

void main(){
  vec2 u = uMap.xy + vS * uMap.zw;     // where this pixel is in the picture
  float t = uT;
  float breathe = 0.5 + 0.5 * sin(t * 0.12);
  vec2 d = vec2(0.0);

  float W = waterline(u.x);
  float depth = max(0.0, (u.y - W) / (1.0 - W));   // 0 at the shore, 1 at the bottom
  bool lake = u.y > W;
  float ripple = 0.0;
  float ringShade = 0.0;
  float spec = 0.0;

  if (lake) {
    // Time runs at a slightly varying pace, a little faster than before, so nothing moves at a constant speed.
    float tw = (t + 0.7 * sin(t * 0.11) + 0.4 * sin(t * 0.047 + 1.0)) * 1.7;
    float z = 1.0 / (depth * 1.2 + 0.06);
    vec2 wp = vec2((u.x - 0.5) * IA * z * 0.55, z);
    vec2 wpw = wp + (vec2(fbm(wp * vec2(0.5, 1.5) + tw * vec2(0.02, 0.03)), fbm(wp * vec2(0.6, 1.7) + vec2(9.0, 2.0) - tw * vec2(0.015, 0.025))) - 0.5) * vec2(1.7, 0.9);
    // Calm slicks and ruffled patches wander across the lake.
    float rough = 0.5 + 0.9 * smoothstep(0.3, 0.75, fbm(vec2(u.x * 2.2 + tw * 0.008, depth * 2.5 - tw * 0.01) + 7.0));
    // Seven wave trains: from long slow swells to short quick chop, speeds from the deep-water rule (a wave of wavenumber k travels at
    // about sqrt(k)), each aimed a little differently with its aim slowly drifting, its crests bent by noise and its strength rising
    // and falling from place to place. The sum is the water's height; its slope decides where the reflection is picked up from.
    float hgt = 0.0;
    vec2 grad = vec2(0.0);
    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      float k = 2.0 * pow(1.45, fi);
      float aim = -1.5708 + (hash(vec2(fi, 1.0)) - 0.5) * 2.4 + 0.5 * sin(tw * 0.035 * (1.0 + fi * 0.31) + fi * 2.3);
      vec2 dir = vec2(cos(aim), sin(aim));
      float ph = dot(wpw, dir) * k - tw * sqrt(k) * 0.3 + fi * 1.9 + 2.2 * vnoise(wp * 0.35 + fi * 7.0 + tw * 0.015);
      float amp = (0.5 + 1.0 * vnoise(vec2(fi * 3.7, tw * 0.05) + wp * 0.12)) / pow(k, 0.8);
      hgt += amp * sin(ph);
      grad += amp * k * cos(ph) * dir;
    }
    float ramp = smoothstep(0.0, 0.05, depth) * (0.4 + 1.1 * pow(depth, 1.2));   // calm at the far shore, livelier toward the viewer
    d += vec2(-grad.x * 0.0036, -grad.y * 0.0021) * ramp * rough;
    // A fine cross-chop, and the noise that sparkles the lights.
    float mx = vnoise(wpw * vec2(2.8, 9.0) + vec2(tw * 0.07, tw * 0.18));
    d += vec2((mx - 0.5) * 0.0045, 0.0) * ramp * rough;
    ripple = fbm(wpw * vec2(1.0, 12.0) + vec2(tw * 0.08, tw * 0.22) + vec2(5.0, 8.0));
    // Sun glitter: flashes from the wave facets that face the sun, mostly along the sun's path.
    vec3 n = normalize(vec3(-grad.x * 0.1, 1.0, -grad.y * 0.1));
    vec3 V = normalize(vec3(0.0, 0.9, 0.45));
    vec3 Ld = normalize(vec3((0.24 - u.x) * 2.2, 0.55, 0.6));
    vec3 Hh = normalize(Ld + V);
    float path = exp(-pow((u.x - 0.27) / (0.1 + 0.4 * depth), 2.0));
    spec = pow(max(dot(n, Hh), 0.0), 140.0) * (0.25 + 0.75 * path) * smoothstep(0.02, 0.12, depth);

    // Rings spreading from the odd drop or rising fish: six sources, each reborn somewhere new every 8 to 14 seconds, on their own
    // beats, so the rings overlap and cross irregularly and never settle into a pattern.
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float period = 8.3 + fi * 1.13 + 0.7 * fract(fi * 0.618) * 3.0;
      float tt = t + fi * 3.7;
      float k = floor(tt / period);
      float age = tt - k * period;
      vec2 src = vec2(0.1 + 0.8 * hash(vec2(fi, k)), W + 0.07 + (0.97 - W - 0.07) * hash(vec2(k, fi + 3.3)));
      vec2 df = (u - src) * vec2(IA, 3.4);          // seen at a low angle: the rings are wide ellipses
      float dist = length(df);
      float r = age * 0.05;
      float w = 0.014 + age * 0.0035;
      float env = exp(-age * 0.3) * smoothstep(0.0, 0.4, age);
      float prof = sin((dist - r) * 150.0) * exp(-pow((dist - r) / w, 2.0)) * env;
      vec2 dir = df / max(dist, 0.001);
      d += dir * vec2(1.0 / IA, 1.0 / 3.4) * prof * 0.0052 * ramp * rough;
      ringShade += prof * ramp;
    }
  }

  // The trees: only the wood and blossom move, never the sky behind. The tree is lifted off the picture (the picture itself, wherever
  // the tree mask says "tree"), moved by the wind-bent skeleton with the blossom shivering on top, and laid back over the still sky plate.
  vec2 dTree = vec2(0.0);
  bool treeZone = u.x < 0.56 && u.y < 0.72 && !lake;
  if (treeZone) {
    float act;
    float cover;
    vec2 sk = skin(u * vec2(IA, 1.0), act, cover);
    dTree = sk / vec2(IA, 1.0);
    // Only the crowns move: the ground, the trunks, the huts and lanterns on the shore and the pagoda stay where they are, so it is the
    // trees that sway and never the land.
    float ground = 1.0 - smoothstep(0.535, 0.625, u.y);
    float pagoda = 1.0 - 0.95 * (1.0 - smoothstep(0.55, 1.0, length((u - vec2(0.129, 0.43)) / vec2(0.058, 0.045))));
    dTree *= ground * pagoda;
    float gust = clamp(act * 38.0, 0.0, 1.3);
    vec2 n1 = vec2(vnoise(u * 52.0 + vec2(-t * 0.8, 0.0)), vnoise(u * 52.0 + vec2(5.0, -t * 0.9))) - 0.5;
    vec2 n2 = vec2(vnoise(u * 118.0 + vec2(-t * 1.6, 3.0)), vnoise(u * 118.0 + vec2(8.0, -t * 1.4))) - 0.5;
    dTree += (n1 * 0.0013 + n2 * 0.0006) * (0.25 + 1.2 * gust) * cover * ground * pagoda;
  }

  vec2 p = clamp(u + d, 0.0, 1.0);
  if (lake) p.y = max(p.y, waterline(p.x) + 0.002);
  vec3 rgb = texture2D(uImg, p).rgb;
  if (treeZone) {
    // Behind the tree: the still sky plate, with the drifting clouds in it where there are clouds.
    vec2 q = clamp(u + dTree, 0.0, 1.0);
    float a = texture2D(uTree, q).r;
    rgb = mix(cloudsAt(u, texture2D(uPlate, u).rgb, t), texture2D(uImg, q).rgb, a);
  } else if (!lake) {
    rgb = cloudsAt(u, rgb, t);
  }

  if (lake) {
    // The lights and the sun's path sparkle as the waves pass; a few warm glints and the glitter; the rings catch the light.
    float L = dot(rgb, vec3(0.3, 0.59, 0.11));
    float near = smoothstep(0.0, 0.08, depth);
    rgb *= 1.0 + (ripple - 0.5) * 0.55 * smoothstep(0.3, 0.8, L) * near + ringShade * 0.1 * smoothstep(0.2, 0.7, L);
    rgb += vec3(1.0, 0.78, 0.84) * smoothstep(0.76, 0.95, ripple) * (0.04 + 0.16 * L) * near;
    rgb += vec3(1.0, 0.72, 0.5) * spec * 0.7;
    rgb += vec3(0.9, 0.7, 0.85) * max(ringShade, 0.0) * 0.03;
  }
  // The dusk light breathes, and the sun's glow with it.
  rgb *= 1.0 + 0.018 * (breathe - 0.5);
  float sun = exp(-pow(length((u - vec2(0.232, 0.455)) * vec2(IA, 1.0)) * 7.0, 2.0));
  rgb += vec3(1.0, 0.62, 0.32) * sun * 0.06 * breathe;

  gl_FragColor = vec4(rgb, 1.0);
}
`.replace(/NB/g, String(BONE_COUNT));

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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

const IMAGE_ASPECT = 1672 / 941; // = IMG_ASPECT in treeRig

// `anchor`: which part of the picture stays in view when the screen is narrower than the picture (0 = left edge, 1 = right edge),
// the same idea as object-position. Must match the still picture's object-position in FujiBackdrop.
export default function SceneCanvas({ src, anchor = [0.4, 0.5] }: { src: string; anchor?: [number, number] }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reduced) return;
    let dead = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
      if (!gl) return;
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const lite = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
      // The skeleton needs three vectors per bone; a device with fewer uniforms than that keeps the still picture.
      if ((gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) as number) < BONE_COUNT * 3 + 24 || (gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number) < 5) return;
      const fsh = compile(gl, gl.FRAGMENT_SHADER, lite ? FRAG.replace("#define OCT 4", "#define OCT 3") : FRAG);
      if (!vs || !fsh) return;
      const prog = gl.createProgram();
      if (!prog) return;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fsh);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      // The picture, the sky plate (the picture without the trees), the masks, the sky base and the cloud detail. If any is missing the still picture stays.
      let imgs: HTMLImageElement[];
      try {
        const base = src.replace(/\.webp$/, "");
        imgs = await Promise.all([loadImage(src), loadImage(`${base}-plate.webp`), loadImage(`${base}-masks.webp`), loadImage(`${base}-skybase.webp`), loadImage(`${base}-clouds.webp`)]);
      } catch {
        return;
      }
      if (dead) return;
      imgs.forEach((im, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      });
      gl.uniform1i(gl.getUniformLocation(prog, "uImg"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uPlate"), 1);
      gl.uniform1i(gl.getUniformLocation(prog, "uTree"), 2);
      gl.uniform1i(gl.getUniformLocation(prog, "uBase"), 3);
      gl.uniform1i(gl.getUniformLocation(prog, "uCloud"), 4);
      const uT = gl.getUniformLocation(prog, "uT");
      const uMap = gl.getUniformLocation(prog, "uMap");
      // The skeleton: where each bone starts and ends and how far its influence reaches never change; how it is moving does.
      const sim = sharedSim();
      const seg = new Float32Array(BONE_COUNT * 4);
      const rs = new Float32Array(BONE_COUNT * 4); // radius (fixed) and speed (updated every frame) of each bone
      BONES.forEach((b, i) => {
        seg.set([b.bx, b.by, b.ex, b.ey], i * 4);
        rs[i * 4] = b.rad;
      });
      gl.uniform4fv(gl.getUniformLocation(prog, "uSeg"), seg);
      const uXf = gl.getUniformLocation(prog, "uXf");
      const uRS = gl.getUniformLocation(prog, "uRS");

      const small = lite;
      const fps = small ? 30 : 60;
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.25);
        const w = Math.max(320, Math.min(1920, Math.round(r.width * dpr * (small ? 0.8 : 1))));
        const h = Math.max(240, Math.round((w * r.height) / Math.max(r.width, 1)));
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        // "Cover": the picture fills the screen, and what does not fit is cropped around the anchor.
        const va = r.width / Math.max(r.height, 1);
        let sx = 1;
        let sy = 1;
        if (va < IMAGE_ASPECT) sx = va / IMAGE_ASPECT;
        else sy = IMAGE_ASPECT / va;
        gl.uniform4f(uMap, anchor[0] * (1 - sx), anchor[1] * (1 - sy), sx, sy);
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
        sim.step(now / 1000);
        gl.uniform4fv(uXf, sim.xf);
        for (let i = 0; i < BONE_COUNT; i++) rs[i * 4 + 1] = sim.speed[i];
        gl.uniform4fv(uRS, rs);
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
  }, [src, anchor, reduced]);

  return <canvas ref={ref} aria-hidden="true" className="auth-canvas absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[1200ms] data-[ready]:opacity-100" />;
}
