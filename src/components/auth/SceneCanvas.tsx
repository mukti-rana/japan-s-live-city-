"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

// Brings the sign-in picture to life without changing it. A small WebGL shader draws the very same picture (so nothing about its
// colours, light or composition changes) and moves its pixels, a little, in four places:
//
//  - The LAKE: every pixel of the water looks up the picture a little to one side and a little up or down, by a slowly flowing field
//    of noise stretched sideways into long low ripples, finer toward the horizon, with two slow swells on top that grow toward the
//    viewer, like gentle sea water. Because it is the picture's own pixels that move, the reflections of Mount Fuji, the trees and
//    the string of lights on the bridge and shore wobble and stretch with the water exactly as real reflections do; the lights and
//    the sun's path also sparkle a little as the ripples pass.
//  - The CHERRY BRANCHES: the big branch at the top left and the grove along the shore sway about their roots (a small rotation that
//    grows with distance from the root, from three slow waves that never quite repeat), and the blossom flutters on top of it.
//  - The SKY and MIST: the clouds at the right and the mist round the foot of the mountain drift and change shape, very slowly.
//  - The LIGHT: a very slow breathing of the dusk light and of the sun's glow.
//
// The petals and leaves are separate pieces of HTML in FujiBackdrop. All of this is drawn at the screen's own resolution (less on
// phones), paused while the tab is hidden, and not started at all for visitors who ask for less motion; if WebGL is unavailable
// nothing is drawn and the still picture underneath simply stays.

const VERT = `attribute vec2 aPos; varying vec2 vS; void main(){ vS = vec2(aPos.x*0.5+0.5, 0.5-aPos.y*0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vS;
uniform sampler2D uImg;
uniform float uT;
uniform vec4 uMap;   // screen -> picture: offset x, offset y, scale x, scale y
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
// A soft-edged ellipse: 1 inside, 0 outside.
float blob(vec2 u, vec2 c, vec2 r){ return 1.0 - smoothstep(0.62, 1.0, length((u - c) / r)); }
// The waterline across the picture (y at x): the shore on the left sits a little lower than the far bank.
float waterline(float x){ return mix(0.668, 0.652, smoothstep(0.12, 0.42, x)); }

// How much a point on the big branch of the top-left tree holds still: 1 along the thick limbs (which barely move) falling off
// quickly to the sides, so the twigs and blossom beside them are free to move. Polylines traced over the picture, in picture units
// (x across, y down), with a strength per limb (the main limb is the stiffest).
float limbStiff(vec2 u){
  vec2 P[16];
  P[0] = vec2(0.0, 0.242);  P[1] = vec2(0.036, 0.221); P[2] = vec2(0.072, 0.197); P[3] = vec2(0.108, 0.17);  P[4] = vec2(0.135, 0.154);
  P[5] = vec2(0.0, 0.202);  P[6] = vec2(0.018, 0.159); P[7] = vec2(0.042, 0.112); P[8] = vec2(0.069, 0.064); P[9] = vec2(0.09, 0.027);
  P[10] = vec2(0.135, 0.154); P[11] = vec2(0.16, 0.122); P[12] = vec2(0.197, 0.09); P[13] = vec2(0.25, 0.066);
  P[14] = vec2(0.135, 0.154); P[15] = vec2(0.18, 0.186);
  float best = 0.0;
  vec2 k = vec2(IA, 1.0);
  for (int i = 0; i < 15; i++) {
    if (i == 4 || i == 9 || i == 13) continue;       // the end of one limb is not joined to the start of the next
    vec2 a = P[i] * k, b = P[i + 1] * k, p = u * k;
    vec2 ab = b - a;
    float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    float dist = length(p - a - ab * h);
    float strength = i < 4 ? 0.97 : i < 9 ? 0.85 : 0.5;
    float rad = i < 4 ? 0.026 : i < 9 ? 0.02 : 0.012;
    best = max(best, strength * exp(-pow(dist / rad, 2.0)));
  }
  return best;
}

// A gust of wind travelling through the branches: a smooth field of intensity that drifts across the picture, mostly to the right
// and a little downward, so the tips of one branch are moved a moment before the next.
float gustAt(vec2 u, float t){
  float g = fbm(vec2(u.x * 2.4 - t * 0.2, u.y * 1.9 + 0.25 * sin(t * 0.09)) + vec2(4.0, 1.0));
  float wave = 0.5 + 0.5 * sin(dot(u, vec2(7.0, 2.0)) - t * 1.05 + fbm(u * 3.0 + vec2(t * 0.05, 0.0)) * 5.0);
  return clamp((g - 0.28) * 2.6, 0.0, 1.0) * (0.35 + 0.65 * wave);
}

// One tree: how its branches bend. root = where it is fixed.
vec2 bend(vec2 u, vec2 root, float mask, float stiff, float t, float amp){
  if (mask < 0.001) return vec2(0.0);
  vec2 q = (u - root) * vec2(IA, 1.0);
  float distRoot = length(q);
  // Hierarchy: the further from the root, the finer the wood and the more it gives; thick limbs hold still.
  float flex = (0.12 + 0.88 * smoothstep(0.02, 0.5, distRoot)) * (1.0 - 0.94 * stiff);
  // Slow bulk bending, a little, from three waves that never quite line up.
  float th = 0.0075 * sin(t * 0.5 + root.x * 7.0) + 0.0038 * sin(t * 0.83 + 1.3 + root.y * 5.0) + 0.002 * sin(t * 1.7 + 0.4);
  vec2 bulk = th * vec2(-q.y, q.x) / vec2(IA, 1.0);
  // The wind: its direction wanders a little; the gust travels through; tips bend with it.
  float ang = 0.12 * sin(t * 0.07) + 0.3;
  vec2 wind = vec2(cos(ang), sin(ang));
  float gust = gustAt(u, t);
  vec2 branch = wind * gust * 0.0042 * smoothstep(0.08, 0.6, distRoot);
  // The twigs and the blossom follow a moment later and shiver on top: finer, quicker, and only as the gust arrives.
  float gustLate = gustAt(u, t - 0.45);
  vec2 n1 = vec2(vnoise(u * 46.0 + vec2(-t * 0.8, 0.0)), vnoise(u * 46.0 + vec2(5.0, -t * 0.9))) - 0.5;
  vec2 n2 = vec2(vnoise(u * 105.0 + vec2(-t * 1.5, 3.0)), vnoise(u * 105.0 + vec2(8.0, -t * 1.3))) - 0.5;
  vec2 twig = (n1 * 0.0026 + n2 * 0.0011) * (0.25 + 0.75 * gustLate);
  return mask * amp * ((bulk * 0.7 + branch) * flex + twig * (0.35 + 0.65 * flex));
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

  if (lake) {
    // Time runs at a slightly varying pace, so nothing scrolls at a constant speed.
    float tw = t + 0.7 * sin(t * 0.11) + 0.4 * sin(t * 0.047 + 1.0);
    float z = 1.0 / (depth * 1.2 + 0.06);
    vec2 wp = vec2((u.x - 0.5) * IA * z * 0.55, z);
    // The ripple field is bent by two slow noises, so its crests are irregular, never ruled lines.
    vec2 wpw = wp + (vec2(fbm(wp * vec2(0.5, 1.5) + tw * vec2(0.03, 0.05)), fbm(wp * vec2(0.6, 1.7) + vec2(9.0, 2.0) - tw * vec2(0.02, 0.04))) - 0.5) * vec2(1.7, 0.9);
    // Calm slicks and ruffled patches wander across the lake.
    float rough = 0.45 + 0.9 * smoothstep(0.3, 0.75, fbm(vec2(u.x * 2.2 + tw * 0.012, depth * 2.5 - tw * 0.016) + 7.0));
    // Two ripple systems crossing each other in different directions and at different speeds, and a fine cross-chop.
    float nx = fbm(wpw * vec2(0.6, 4.2) + vec2(tw * 0.07, tw * 0.2) + vec2(3.1, 1.7));
    float nx2 = fbm(wpw * vec2(0.9, 6.3) - vec2(tw * 0.05, -tw * 0.13) + vec2(21.0, 6.0));
    float ny = fbm(wpw * vec2(0.75, 5.0) - vec2(tw * 0.056, tw * 0.16) + vec2(11.0, 4.3));
    float mx = vnoise(wpw * vec2(2.8, 9.0) + vec2(tw * 0.13, tw * 0.38));
    // Two slow swells that do not travel quite the same way.
    float swell = sin(z * 1.3 - tw * 0.62 + u.x * 1.7 + vnoise(wp * 0.5) * 4.0);
    float swell2 = sin(z * 2.7 - tw * 0.84 - u.x * 2.3 + 1.3 + vnoise(wp * 0.8 + 4.0) * 3.0);
    float ramp = smoothstep(0.0, 0.05, depth) * (0.4 + 0.9 * depth);   // calm at the far shore, livelier toward the viewer
    d += vec2((nx - 0.5) * 0.011 * rough + (nx2 - 0.5) * 0.007 * rough + (mx - 0.5) * 0.0042 * rough + swell * 0.0028 + swell2 * 0.0011,
              (ny - 0.5) * 0.0055 * rough + swell * 0.0022 + swell2 * 0.0009) * ramp;
    ripple = fbm(wpw * vec2(1.0, 12.0) + vec2(tw * 0.18, tw * 0.5) + vec2(5.0, 8.0));

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

  d += bend(u, vec2(0.0, 0.2), blob(u, vec2(0.2, 0.17), vec2(0.36, 0.28)), limbStiff(u), t, 1.0);
  d += bend(u, vec2(0.16, 0.7), blob(u, vec2(0.17, 0.52), vec2(0.29, 0.2)), 0.0, t + 7.0, 0.85);

  // The clouds at the right drift and change shape; the mist round the foot of the mountain flows.
  float edgeR = 0.27 + (u.x - 0.565) * 0.52;
  float sky = smoothstep(0.6, 0.68, u.x) * smoothstep(edgeR - 0.01, edgeR - 0.06, u.y);
  d += sky * vec2(fbm(vec2(u.x * 3.0 - t * 0.02, u.y * 6.0)) - 0.5, (fbm(vec2(u.x * 3.0 + 7.0 - t * 0.02, u.y * 6.0 + 3.0)) - 0.5) * 0.5) * 0.007;
  float band = smoothstep(0.4, 0.46, u.y) * smoothstep(0.6, 0.54, u.y);
  d += band * vec2(fbm(vec2(u.x * 2.0 + t * 0.018, u.y * 9.0)) - 0.5, 0.0) * 0.004;

  vec2 p = clamp(u + d, 0.0, 1.0);
  if (lake) p.y = max(p.y, W + 0.002);
  vec3 rgb = texture2D(uImg, p).rgb;

  if (lake) {
    // The lights and the sun's path sparkle as the ripples pass; a few warm glints run along the ripples and the rings catch the light.
    float L = dot(rgb, vec3(0.3, 0.59, 0.11));
    float near = smoothstep(0.0, 0.08, depth);
    rgb *= 1.0 + (ripple - 0.5) * 0.55 * smoothstep(0.3, 0.8, L) * near + ringShade * 0.1 * smoothstep(0.2, 0.7, L);
    rgb += vec3(1.0, 0.78, 0.84) * smoothstep(0.76, 0.95, ripple) * (0.05 + 0.2 * L) * near;
    rgb += vec3(0.9, 0.7, 0.85) * max(ringShade, 0.0) * 0.03;
  }
  // The dusk light breathes, and the sun's glow with it.
  rgb *= 1.0 + 0.018 * (breathe - 0.5);
  float sun = exp(-pow(length((u - vec2(0.232, 0.455)) * vec2(IA, 1.0)) * 7.0, 2.0));
  rgb += vec3(1.0, 0.62, 0.32) * sun * 0.06 * breathe;

  gl_FragColor = vec4(rgb, 1.0);
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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

const IMAGE_ASPECT = 1672 / 941;

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

      let img: HTMLImageElement;
      try {
        img = await loadImage(src);
      } catch {
        return;
      }
      if (dead) return;
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(prog, "uImg"), 0);
      const uT = gl.getUniformLocation(prog, "uT");
      const uMap = gl.getUniformLocation(prog, "uMap");

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
