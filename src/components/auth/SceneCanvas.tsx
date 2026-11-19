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
// A soft-edged ellipse: 1 inside, 0 outside.
float blob(vec2 u, vec2 c, vec2 r){ return 1.0 - smoothstep(0.62, 1.0, length((u - c) / r)); }
// The waterline across the picture (y at x): the shore on the left sits a little lower than the far bank.
float waterline(float x){ return mix(0.668, 0.652, smoothstep(0.12, 0.42, x)); }

void main(){
  vec2 u = uMap.xy + vS * uMap.zw;     // where this pixel is in the picture
  float t = uT;
  float breathe = 0.5 + 0.5 * sin(t * 0.12);
  vec2 d = vec2(0.0);

  float W = waterline(u.x);
  float depth = max(0.0, (u.y - W) / (1.0 - W));   // 0 at the shore, 1 at the bottom
  bool lake = u.y > W;
  float z = 1.0 / (depth * 1.2 + 0.06);
  vec2 wp = vec2((u.x - 0.5) * IA * z * 0.55, z);
  vec2 flow = vec2(t * 0.07, t * 0.2);
  float ripple = 0.0;

  if (lake) {
    // Long low ripples (noise stretched along x, flowing), smaller crossing ripples, and two slow swells.
    float nx = fbm(wp * vec2(0.6, 4.2) + flow + vec2(3.1, 1.7));
    float ny = fbm(wp * vec2(0.75, 5.0) - flow * 0.8 + vec2(11.0, 4.3));
    float mx = vnoise(wp * vec2(2.8, 9.0) + flow * 1.9);
    float swell = sin(z * 1.3 - t * 0.62 + vnoise(wp * 0.5) * 4.0);
    float swell2 = sin(z * 2.9 - t * 0.9 + u.x * 5.0);
    float ramp = smoothstep(0.0, 0.05, depth) * (0.4 + 0.9 * depth);   // calm at the far shore, livelier toward the viewer
    d += vec2((nx - 0.5) * 0.013 + (mx - 0.5) * 0.0045 + swell * 0.0032 + swell2 * 0.0012, (ny - 0.5) * 0.006 + swell * 0.0025) * ramp;
    ripple = fbm(wp * vec2(1.0, 12.0) + flow * 2.5 + vec2(5.0, 8.0));
  }

  // The big branch at the top left, rooted at the left edge, and the grove along the shore, rooted at the water's edge.
  vec2 q1 = (u - vec2(0.0, 0.2)) * vec2(IA, 1.0);
  float th1 = 0.008 * sin(t * 0.5) + 0.004 * sin(t * 0.83 + 1.3) + 0.002 * sin(t * 1.7 + 0.4);
  float m1 = blob(u, vec2(0.2, 0.17), vec2(0.36, 0.28));
  d += m1 * th1 * vec2(-q1.y, q1.x) / vec2(IA, 1.0);
  vec2 q2 = (u - vec2(0.16, 0.7)) * vec2(IA, 1.0);
  float th2 = 0.005 * sin(t * 0.43 + 0.8) + 0.003 * sin(t * 0.97 + 2.1);
  float m2 = blob(u, vec2(0.17, 0.52), vec2(0.29, 0.2));
  d += m2 * th2 * vec2(-q2.y, q2.x) / vec2(IA, 1.0);
  // The blossom flutters on the wood: small quick shivers that come and go in gusts.
  float gust = 0.55 + 0.45 * sin(t * 0.37 + u.x * 2.0 + u.y * 3.0);
  vec2 fl = (vec2(vnoise(u * 70.0 + vec2(t * 0.9, 0.0)), vnoise(u * 70.0 + vec2(5.0, t * 1.1))) - 0.5) * 0.0011 * gust;
  d += fl * clamp(m1 + m2, 0.0, 1.0);

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
    // The lights and the sun's path sparkle as the ripples pass; a few warm glints run along the ripples.
    float L = dot(rgb, vec3(0.3, 0.59, 0.11));
    float near = smoothstep(0.0, 0.08, depth);
    rgb *= 1.0 + (ripple - 0.5) * 0.55 * smoothstep(0.3, 0.8, L) * near;
    rgb += vec3(1.0, 0.78, 0.84) * smoothstep(0.76, 0.95, ripple) * (0.05 + 0.2 * L) * near;
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
      const fsh = compile(gl, gl.FRAGMENT_SHADER, FRAG);
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

      const small = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 700;
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
