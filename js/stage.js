// The fixed 3D stage behind the first five sections. One point cloud morphs between
// five shapes as the page scrolls while a camera drone, then an FPV quad, flies each job.

import {
  Scene, PerspectiveCamera, WebGLRenderer, Points, LineSegments, BufferGeometry, BufferAttribute, ShaderMaterial,
  LineBasicMaterial, PointsMaterial, Vector3, Vector4, PMREMGenerator, DirectionalLight, HemisphereLight,
  AdditiveBlending, SRGBColorSpace, ACESFilmicToneMapping, DynamicDrawUsage, MathUtils, RoomEnvironment,
} from 'three';
import { buildMavic, buildFpv } from './drones.js';
import { buildShapes, terrainHeight, tubeCenter, TUNNEL, LA_WORLD } from './shapes.js';

const { lerp, clamp, smoothstep } = MathUtils;
const LAST = 4;

// Camera position and target per chapter
const KEYS = [
  { cam: [-2.8, 28.5, 40.5], look: [-2.8, 0.6, 1.2], scale: 2.1 },
  { cam: [17, 9, 43], look: [0, 12.2, 0], scale: 1.0 },
  { cam: [-6, 20, 31], look: [-3.5, 1.5, 0], scale: 0.9 },
  { cam: [18, 10, 31], look: [1, 2.2, 0], scale: 0.8 },
  { cam: [-3.2, 1.5, 12.5], look: [0, 0, 0], scale: 1.05 },
];

const POINT_VERT = /* glsl */`
  attribute vec3 aTo;
  attribute vec4 aColA;
  attribute vec4 aColB;
  attribute vec4 aRnd;
  uniform float uMix, uTime, uScale, uIntro, uTravel, uFlowA, uFlowB, uScanAmt, uFadeNear, uFadeFar;
  uniform vec4 uScan;   // plane normal xyz, offset w
  uniform vec4 uPulse;  // center xz, radius, strength
  varying vec4 vCol;

  const float ZMIN = ${TUNNEL.zMin.toFixed(1)};
  const float ZLEN = ${TUNNEL.zLen.toFixed(1)};

  vec2 tube(float zw) {
    return vec2(sin(zw * 0.045) * 3.2 + sin(zw * 0.021 + 1.3) * 2.0, sin(zw * 0.037 + 0.7) * 1.6);
  }
  vec3 flow(vec3 q) {
    float z = ZMIN + mod(q.z - ZMIN - uTravel, ZLEN);
    return vec3(q.xy + tube(z + uTravel), z);
  }

  void main() {
    vec3 a = position;
    vec3 b = aTo;
    if (uFlowA > 0.5) a = flow(a);
    if (uFlowB > 0.5) b = flow(b);

    float m = clamp(uMix * 1.6 - aRnd.x * 0.6, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(a, b, m);
    float burst = sin(3.14159 * m);
    p += (aRnd.yzw - 0.5) * 6.0 * burst;
    p.y += burst * 1.5 * aRnd.x;

    float i = clamp(uIntro * 1.5 - aRnd.z * 0.5, 0.0, 1.0);
    i = 1.0 - pow(1.0 - i, 3.0);
    p += (aRnd.wxy - 0.5) * vec3(60.0, 34.0, 60.0) * (1.0 - i);
    p += 0.02 * sin(uTime * 1.3 + aRnd.w * 40.0);

    vec4 col = mix(aColA, aColB, m);
    float d = dot(p, uScan.xyz) - uScan.w;
    float s = exp(-d * d * 5.0) * uScanAmt;
    float pr = length(p.xz - uPulse.xy) - uPulse.z;
    s += exp(-pr * pr * 2.2) * uPulse.w;
    s = clamp(s, 0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    float px = col.a * (1.0 + s * 1.3) * uScale / max(depth, 0.1);
    gl_PointSize = max(px, 1.2);

    float alpha = 0.78 * i * min(px / 1.2, 1.0);
    alpha *= smoothstep(0.6, 3.5, depth) * (1.0 - smoothstep(uFadeNear, uFadeFar, depth));
    vCol = vec4(mix(col.rgb, vec3(1.0, 0.86, 0.42), s * 0.75) * (1.0 + s * 0.6), alpha);
  }
`;

const POINT_FRAG = /* glsl */`
  precision mediump float;
  varying vec4 vCol;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, r) * vCol.a;
    gl_FragColor = vec4(vCol.rgb * a, a);
  }
`;

const WIRE_VERT = /* glsl */`
  varying float vX;
  void main() { vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const WIRE_FRAG = /* glsl */`
  precision mediump float;
  uniform float uOpacity, uReveal;
  varying float vX;
  void main() {
    float shown = 1.0 - smoothstep(uReveal - 0.4, uReveal + 0.4, vX);
    float edge = exp(-(vX - uReveal) * (vX - uReveal) * 1.2);
    float a = uOpacity * (shown * 0.5 + edge * 0.9);
    gl_FragColor = vec4(vec3(0.44, 0.89, 0.93) * a + vec3(1.0, 0.8, 0.3) * edge * uOpacity * 0.35, a);
  }
`;

export function createStage({ canvas, chapters, reduceMotion }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const N = small ? 30000 : 72000;
  const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 2);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.3, 500);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  scene.add(new HemisphereLight(0xcfeeff, 0x06202b, 0.7));
  const key = new DirectionalLight(0xffffff, 2.4); key.position.set(6, 12, 9); scene.add(key);
  const rim = new DirectionalLight(0x6fe3ee, 2.2); rim.position.set(-9, 3, -10); scene.add(rim);
  const kick = new DirectionalLight(0xf2c230, 0.7); kick.position.set(8, -6, 2); scene.add(kick);

  /* Point cloud */
  const shapes = buildShapes(N);
  const geo = new BufferGeometry();
  const attr = (size) => { const a = new BufferAttribute(new Float32Array(N * size), size); a.setUsage(DynamicDrawUsage); return a; };
  const aFrom = attr(3), aTo = attr(3), aColA = attr(4), aColB = attr(4);
  const rnd = new Float32Array(N * 4);
  let seed = 9;
  for (let i = 0; i < rnd.length; i++) { seed = (seed * 16807) % 2147483647; rnd[i] = seed / 2147483647; }
  geo.setAttribute('position', aFrom);
  geo.setAttribute('aTo', aTo);
  geo.setAttribute('aColA', aColA);
  geo.setAttribute('aColB', aColB);
  geo.setAttribute('aRnd', new BufferAttribute(rnd, 4));
  const uniforms = {
    uMix: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1 }, uIntro: { value: reduceMotion ? 1 : 0 },
    uTravel: { value: 0 }, uFlowA: { value: 0 }, uFlowB: { value: 0 },
    uScan: { value: new Vector4(0, 1, 0, 0) }, uScanAmt: { value: 0 }, uPulse: { value: new Vector4(LA_WORLD[0], LA_WORLD[2], 0, 0) },
    uFadeNear: { value: 60 }, uFadeFar: { value: 400 },
  };
  const cloud = new Points(geo, new ShaderMaterial({
    uniforms, vertexShader: POINT_VERT, fragmentShader: POINT_FRAG,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  cloud.frustumCulled = false;
  scene.add(cloud);

  let pair = -1;
  function setPair(i) {
    if (i === pair) return;
    pair = i;
    aFrom.array.set(shapes[i].pos); aTo.array.set(shapes[i + 1].pos);
    aColA.array.set(shapes[i].col); aColB.array.set(shapes[i + 1].col);
    aFrom.needsUpdate = aTo.needsUpdate = aColA.needsUpdate = aColB.needsUpdate = true;
    uniforms.uFlowA.value = i === LAST ? 1 : 0;
    uniforms.uFlowB.value = i + 1 === LAST ? 1 : 0;
  }

  /* Depth dust */
  {
    const d = new Float32Array(900 * 3);
    for (let i = 0; i < d.length; i += 3) { d[i] = (rnd[i] - 0.5) * 110; d[i + 1] = rnd[i + 1] * 46 - 6; d[i + 2] = (rnd[i + 2] - 0.5) * 110; }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(d, 3));
    scene.add(new Points(g, new PointsMaterial({ color: 0x4f8b9b, size: 0.11, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending })));
  }

  /* Terrain mesh that draws itself over the survey points */
  const wireUniforms = { uOpacity: { value: 0 }, uReveal: { value: -16 } };
  {
    const S = 30, n = 34, v = [];
    const P = (i, j) => { const x = (i / n - 0.5) * S, z = (j / n - 0.5) * S; return [x, terrainHeight(x, z) + 0.04, z]; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      v.push(...P(i, j), ...P(i + 1, j), ...P(i, j), ...P(i, j + 1), ...P(i, j), ...P(i + 1, j + 1));
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
    const wire = new LineSegments(g, new ShaderMaterial({ uniforms: wireUniforms, vertexShader: WIRE_VERT, fragmentShader: WIRE_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending }));
    wire.frustumCulled = false;
    scene.add(wire);
  }

  /* Camera footprint under the mapping drone */
  const footGeo = new BufferGeometry();
  const footPos = new BufferAttribute(new Float32Array(16 * 3), 3); footPos.setUsage(DynamicDrawUsage);
  footGeo.setAttribute('position', footPos);
  const footMat = new LineBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const foot = new LineSegments(footGeo, footMat); foot.frustumCulled = false; scene.add(foot);

  /* Aircraft */
  const mavic = buildMavic(), fpv = buildFpv();
  scene.add(mavic.group, fpv.group);
  fpv.group.visible = false;

  /* Flight paths. Each returns position, yaw (0 = nose toward +Z) and gimbal pitch. */
  const tmpA = { pos: new Vector3(), yaw: 0, gimbal: 0 }, tmpB = { pos: new Vector3(), yaw: 0, gimbal: 0 }, tmpC = { pos: new Vector3() };
  function lawnmower(t, out) {
    const lanes = 5, u = ((t * 0.045) % 1) * lanes, lane = Math.floor(u), f = u - lane;
    const dir = lane % 2 ? -1 : 1, z0 = -8 + lane * 4, z1 = -8 + ((lane + 1) % lanes) * 4;
    const run = smoothstep(f, 0.0, 0.82), turn = smoothstep(f, 0.8, 1.0);
    out.pos.set(3.2 + dir * (-7.8 + 15.6 * run), 8.2, lerp(z0, z1, turn));
    return out;
  }
  function mavicPose(ch, t, out) {
    if (ch === 0) {
      out.pos.set(4.7 + Math.sin(t * 0.5) * 0.3, 8.4 + Math.sin(t * 0.9) * 0.28, -0.5 + Math.cos(t * 0.4) * 0.3);
      out.yaw = -0.5 + Math.sin(t * 0.3) * 0.12; out.gimbal = -0.35;
    } else if (ch === 1) {
      const a = t * 0.2 + 0.9;
      out.pos.set(Math.sin(a) * 8.6, 20.6 + Math.sin(t * 0.6) * 0.6, Math.cos(a) * 8.6);
      out.yaw = a + Math.PI; out.gimbal = -0.05;
    } else if (ch === 2) {
      lawnmower(t, out);
      const ahead = lawnmower(t + 0.25, tmpC).pos;
      out.yaw = Math.atan2(ahead.x - out.pos.x, ahead.z - out.pos.z); out.gimbal = -Math.PI / 2;
    } else {
      const a = 0.78 + Math.sin(t * 0.17) * 0.5;
      out.pos.set(Math.sin(a) * 11, 6.4 + Math.sin(t * 0.5) * 0.3, Math.cos(a) * 11 + 0.5);
      out.yaw = a + Math.PI; out.gimbal = -0.42;
    }
    return out;
  }
  const lerpAngle = (a, b, t) => a + (((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * t;

  /* Scroll and pointer state */
  let centers = [], stageEnd = 0, p = 0, pTarget = 0;
  let time = 0, last = 0, raf = 0, intro = reduceMotion ? 1 : 0, live = false;
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  const camPos = new Vector3(), camLook = new Vector3(), prev = new Vector3(), vel = new Vector3();
  let tiltP = 0, tiltR = 0, portrait = 0, distMul = 1, hasPrev = false;

  function measure() {
    centers = chapters.map((el) => { const r = el.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
    const lastRect = chapters[LAST].getBoundingClientRect();
    stageEnd = lastRect.bottom + window.scrollY;
    readScroll();
  }
  function readScroll() {
    const yc = window.scrollY + window.innerHeight / 2;
    let v = 0;
    for (let i = 0; i < LAST; i++) if (yc >= centers[i]) v = i + clamp((yc - centers[i]) / (centers[i + 1] - centers[i]), 0, 1);
    pTarget = v;
  }
  const onStage = () => window.scrollY < stageEnd - 4;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    portrait = 1 - smoothstep(aspect, 0.6, 1.3);
    camera.fov = lerp(35, 50, portrait);
    distMul = lerp(1, 1.62, portrait);
    camera.aspect = aspect;
    // Push the subject to the right of the text on wide screens, above it on tall ones
    camera.setViewOffset(w, h, -w * 0.17 * (1 - portrait), h * 0.25 * portrait, w, h);
    camera.updateProjectionMatrix();
    uniforms.uScale.value = ((h * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360))) * (small ? 1.35 : 1);
    measure();
  }

  function update(dt) {
    if (!reduceMotion) time += dt;
    intro = Math.min(1, intro + dt / 2.8);
    p += (pTarget - p) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6.5));
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3);
    mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3);

    const i = Math.min(Math.floor(p), LAST - 1), t = smoothstep(p - i, 0.2, 0.8);
    setPair(i);
    const w = [0, 0, 0, 0, 0]; w[i] = 1 - t; w[i + 1] = t;
    const travel = time * 34;
    const tc = tubeCenter(travel), tc2 = tubeCenter(travel + 1.5);

    uniforms.uMix.value = t;
    uniforms.uTime.value = time;
    uniforms.uIntro.value = intro;
    uniforms.uTravel.value = travel;
    uniforms.uFadeNear.value = lerp(60, 24, w[4]);
    uniforms.uFadeFar.value = lerp(400, 96, w[4]);

    /* Camera */
    const A = KEYS[i], B = KEYS[i + 1];
    for (let k = 0; k < 3; k++) {
      camLook.setComponent(k, lerp(A.look[k], B.look[k], t));
      camPos.setComponent(k, lerp(A.cam[k], B.cam[k], t));
    }
    camPos.sub(camLook).multiplyScalar(lerp(distMul, 1, w[4] * 0.6)).add(camLook);
    camPos.x += mouse.sx * 1.4 + tc[0] * 0.7 * w[4];
    camPos.y += -mouse.sy * 0.9 + tc[1] * 0.5 * w[4];
    camLook.x += tc[0] * 0.9 * w[4];
    camLook.y += tc[1] * 0.8 * w[4];
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    /* Camera drone */
    const exit = i === LAST - 1 ? t : 0;
    mavic.group.visible = exit < 0.97;
    if (mavic.group.visible) {
      const a = mavicPose(Math.min(i, 3), time, tmpA);
      let yaw = a.yaw, gimbal = a.gimbal;
      const pos = a.pos;
      if (i < 3) {
        const yawA = a.yaw, gA = a.gimbal, px = pos.x, py = pos.y, pz = pos.z;
        const b = mavicPose(i + 1, time, tmpB);
        pos.set(lerp(px, b.pos.x, t), lerp(py, b.pos.y, t), lerp(pz, b.pos.z, t));
        yaw = lerpAngle(yawA, b.yaw, t); gimbal = lerp(gA, b.gimbal, t);
      }
      pos.y += exit * exit * 30 + (1 - intro) * (1 - intro) * 16;
      pos.x += exit * 5 + mouse.sx * 0.35 * w[0];
      yaw += mouse.sx * 0.3 * w[0];
      if (dt > 0 && hasPrev) {
        vel.copy(pos).sub(prev).divideScalar(dt);
        const vf = vel.x * Math.sin(yaw) + vel.z * Math.cos(yaw), vl = vel.x * Math.cos(yaw) - vel.z * Math.sin(yaw);
        tiltP += (clamp(vf * 0.035, -0.3, 0.3) - tiltP) * Math.min(1, dt * 4);
        tiltR += (clamp(-vl * 0.035, -0.3, 0.3) - tiltR) * Math.min(1, dt * 4);
      }
      prev.copy(pos); hasPrev = true;
      mavic.group.position.copy(pos);
      mavic.group.rotation.set(tiltP + Math.sin(time * 1.1) * 0.012, yaw, tiltR + Math.sin(time * 0.8) * 0.015, 'YXZ');
      mavic.group.scale.setScalar(lerp(A.scale, B.scale, t) * lerp(1, 0.82, portrait));
      mavic.update(time, !reduceMotion, gimbal - tiltP);

      // Mapping footprint
      footMat.opacity = w[2] * 0.75 * (0.6 + 0.4 * Math.sin(time * 9));
      if (w[2] > 0.01) {
        const hw = 2.3, hd = 1.6, f = footPos.array;
        const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([dx, dz]) => { const x = pos.x + dx, z = pos.z + dz; return [x, terrainHeight(x, z) + 0.08, z]; });
        for (let k = 0; k < 4; k++) {
          const q = c[k], r = c[(k + 1) % 4];
          f.set([pos.x, pos.y - 0.4, pos.z, q[0], q[1], q[2]], k * 12);
          f.set([q[0], q[1], q[2], r[0], r[1], r[2]], k * 12 + 6);
        }
        footPos.needsUpdate = true;
      }
      // Scan line: sweeps the tower, follows the mapping drone
      if (w[1] >= w[2]) { uniforms.uScan.value.set(0, 1, 0, 12.4 + Math.sin(time * 0.55) * 12.4); uniforms.uScanAmt.value = w[1]; }
      else { uniforms.uScan.value.set(1, 0, 0, pos.x); uniforms.uScanAmt.value = w[2] * 0.8; }
    } else {
      footMat.opacity = 0; uniforms.uScanAmt.value = 0;
    }

    /* Home-base pulse across the map */
    const pr = (time * 3) % 24;
    uniforms.uPulse.value.z = pr;
    uniforms.uPulse.value.w = w[0] * 0.85 * (1 - pr / 24) * intro;

    /* Survey mesh */
    const cyc = (time % 13) / 13;
    wireUniforms.uOpacity.value = w[2] * (cyc > 0.9 ? (1 - cyc) / 0.1 : 1);
    wireUniforms.uReveal.value = cyc < 0.55 ? -16 + 32 * (cyc / 0.55) : 17;

    /* FPV quad */
    fpv.group.visible = exit > 0.03;
    if (fpv.group.visible) {
      const e = 1 - exit, k = e * e;
      const dx = (tc2[0] - tc[0]) / 1.5, dy = (tc2[1] - tc[1]) / 1.5;
      fpv.group.position.set(tc[0] - 16 * k, tc[1] + 9 * k + Math.sin(time * 2.3) * 0.08, -44 * k);
      fpv.group.rotation.set(0.42 - dy * 1.4 + Math.sin(time * 1.7) * 0.03, Math.atan(dx) * 1.1 + mouse.sx * 0.15, -dx * 2.6 + Math.sin(time * 1.3) * 0.05, 'YXZ');
      fpv.group.scale.setScalar(lerp(1.05, 0.9, portrait));
      fpv.update(time, !reduceMotion);
    }
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0.016;
    last = now;
    update(dt);
    renderer.render(scene, camera);
    if (!live) { live = true; canvas.classList.add('is-live'); }
    const settling = Math.abs(pTarget - p) > 0.0005 || intro < 1;
    if (onStage() && !document.hidden && (!reduceMotion || settling)) request();
    else last = 0;
  }
  function request() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', () => { readScroll(); if (onStage()) request(); }, { passive: true });
  window.addEventListener('resize', () => { resize(); request(); });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  resize();
  request();
  // settle() jumps past the intro and scroll easing; used when capturing still frames
  return { measure, settle(t) { intro = 1; p = pTarget; if (t !== undefined) time = t; last = 0; request(); } };
}
