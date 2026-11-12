// Point-cloud shapes the stage morphs between. Every builder returns exactly n points
// as { pos: Float32Array(n*3), col: Float32Array(n*4) } where col = r, g, b, size.

import { CA_OUTLINE, LA } from './california.js';

const C = {
  ice: [0.9, 0.96, 0.97],
  cyan: [0.44, 0.89, 0.93],
  mid: [0.3, 0.66, 0.75],
  deep: [0.17, 0.42, 0.5],
  dim: [0.11, 0.29, 0.35],
  signal: [0.95, 0.76, 0.19],
  warm: [1.0, 0.72, 0.3],
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), u), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), u), v);
}
function fbm(x, y) {
  return vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 7.3, y * 2.1 - 2.9) * 0.3 + vnoise(x * 4.3 - 1.7, y * 4.3 + 5.1) * 0.15;
}

function builder(seed) {
  const parts = [];
  const rand = mulberry32(seed);
  const api = {
    rand,
    // fn(k, emit) should emit k points; shortfalls are padded, extras dropped
    part(weight, fn) { if (weight > 0) parts.push({ weight, fn }); },
    line(a, b, density, col, size = 0.09, jit = 0.015) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      api.part(len * density, (k, emit) => {
        for (let j = 0; j < k; j++) {
          const t = (j + rand()) / k;
          emit(lerp(a[0], b[0], t) + (rand() - 0.5) * jit, lerp(a[1], b[1], t) + (rand() - 0.5) * jit, lerp(a[2], b[2], t) + (rand() - 0.5) * jit, col, size);
        }
      });
    },
    poly(pts, density, col, size, closed = true) {
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) api.line(pts[i], pts[(i + 1) % pts.length], density, col, size);
    },
    // Regular grid on a parallelogram: origin o, edge vectors u and v
    face(o, u, v, density, col, size = 0.07, fn) {
      const lu = Math.hypot(...u), lv = Math.hypot(...v);
      api.part(lu * lv * density, (k, emit) => {
        const nu = Math.max(1, Math.round(Math.sqrt(k * lu / lv))), nv = Math.max(1, Math.floor(k / nu));
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
          const s = (i + 0.5) / nu, t = (j + 0.5) / nv;
          const p = [o[0] + u[0] * s + v[0] * t, o[1] + u[1] * s + v[1] * t, o[2] + u[2] * s + v[2] * t];
          if (fn) { const r = fn(p, s, t); if (r) { emit(p[0], p[1], p[2], r.col || col, r.size || size); continue; } }
          emit(p[0], p[1], p[2], col, size);
        }
      });
    },
    build(n) {
      const total = parts.reduce((s, p) => s + p.weight, 0);
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 4);
      let idx = 0, acc = 0;
      parts.forEach((p, pi) => {
        acc += p.weight;
        const end = pi === parts.length - 1 ? n : Math.min(n, Math.round(n * acc / total));
        const k = end - idx;
        if (k <= 0) return;
        let c = 0;
        const emit = (x, y, z, color, size) => {
          if (c >= k) return;
          const o = idx + c;
          pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
          col[o * 4] = color[0]; col[o * 4 + 1] = color[1]; col[o * 4 + 2] = color[2]; col[o * 4 + 3] = size;
          c++;
        };
        p.fn(k, emit);
        while (c < k) { // pad by repeating earlier points of this part
          const o = idx + c;
          if (c === 0) { col[o * 4 + 3] = 0; c++; continue; }
          const s = idx + Math.floor(rand() * c);
          pos[o * 3] = pos[s * 3]; pos[o * 3 + 1] = pos[s * 3 + 1]; pos[o * 3 + 2] = pos[s * 3 + 2];
          col[o * 4] = col[s * 4]; col[o * 4 + 1] = col[s * 4 + 1]; col[o * 4 + 2] = col[s * 4 + 2]; col[o * 4 + 3] = col[s * 4 + 3] * 0.5;
          c++;
        }
        idx = end;
      });
      return { pos, col };
    },
  };
  return api;
}

/* ---------- 0. California relief map ---------- */

const MAP = 2.55; // world units per projected degree
export const LA_WORLD = [LA[0] * MAP, 0, -LA[1] * MAP];

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function ridge(px, py, pts, width) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return Math.exp(-(d * d) / (width * width));
}
const SIERRA = [[-1.51, 2.95], [-0.72, 1.3], [0.2, -0.3], [0.88, -1.55]];
const COAST = [[-3.35, 3.75], [-2.39, 1.05], [-1.51, -0.95], [-0.64, -2.35]];
const TRANSVERSE = [[-0.16, -2.65], [0.9, -2.95], [1.91, -3.05]];
const PENINSULAR = [[1.99, -3.45], [2.39, -4.55]];

function caElevation(px, py) {
  const n = fbm(px * 1.7 + 11, py * 1.7 + 4);
  let h = ridge(px, py, SIERRA, 0.42) * (0.75 + n * 0.6);
  h += ridge(px, py, COAST, 0.3) * (0.3 + n * 0.35);
  h += ridge(px, py, TRANSVERSE, 0.24) * 0.5;
  h += ridge(px, py, PENINSULAR, 0.24) * 0.38;
  h += Math.exp(-((px + 2.2) ** 2 + (py - 4.0) ** 2) / 0.7) * (0.45 + n * 0.4); // Klamath and Cascades
  h += Math.exp(-((px + 2.0) ** 2 + (py - 4.1) ** 2) / 0.02) * 0.5; // Shasta
  return h + n * 0.1;
}

function california(n, seed) {
  const b = builder(seed);
  const O = CA_OUTLINE, nv = O.length / 2;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, area = 0;
  for (let i = 0; i < nv; i++) {
    const x = O[i * 2], y = O[i * 2 + 1], j = (i + 1) % nv;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    area += x * O[j * 2 + 1] - O[j * 2] * y;
  }
  area = Math.abs(area / 2);

  // Interior: scanline-filled grid, colored by elevation
  b.part(74, (k, emit) => {
    const step = Math.sqrt(area / (k * 1.03));
    const pts = [];
    for (let y = minY + step * 0.5; y < maxY; y += step) {
      const xs = [];
      for (let i = 0; i < nv; i++) {
        const j = (i + 1) % nv, y1 = O[i * 2 + 1], y2 = O[j * 2 + 1];
        if ((y1 > y) !== (y2 > y)) xs.push(O[i * 2] + ((y - y1) / (y2 - y1)) * (O[j * 2] - O[i * 2]));
      }
      xs.sort((p, q) => p - q);
      for (let s = 0; s + 1 < xs.length; s += 2) {
        for (let x = Math.ceil((xs[s] - minX) / step) * step + minX; x < xs[s + 1]; x += step) pts.push(x, y);
      }
    }
    // Shuffle so trimming to k thins the map evenly
    const m = pts.length / 2;
    const order = new Uint32Array(m);
    for (let i = 0; i < m; i++) order[i] = i;
    for (let i = m - 1; i > 0; i--) { const j = Math.floor(b.rand() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    for (let q = 0; q < Math.min(m, k); q++) {
      const i = order[q], px = pts[i * 2], py = pts[i * 2 + 1];
      const h = caElevation(px, py);
      const t = clamp01(h / 1.1);
      const col = t < 0.5 ? mixc(C.deep, C.mid, t * 2) : mixc(C.mid, C.ice, (t - 0.5) * 2);
      emit(px * MAP, h * 1.7, -py * MAP, col, 0.075 + t * 0.04);
    }
  });

  // Coast and borders
  for (let i = 0; i < nv; i++) {
    const j = (i + 1) % nv;
    const a = [O[i * 2] * MAP, 0.02, -O[i * 2 + 1] * MAP], c = [O[j * 2] * MAP, 0.02, -O[j * 2 + 1] * MAP];
    b.line(a, c, 0.32, C.cyan, 0.11, 0.02);
  }

  // Home base: rings and a beam over Los Angeles
  const [lx, , lz] = LA_WORLD;
  for (const r of [0.45, 0.9, 1.4]) {
    b.part(r * 0.9, (k, emit) => {
      for (let j = 0; j < k; j++) { const a = (j / k) * Math.PI * 2; emit(lx + Math.cos(a) * r, 0.12, lz + Math.sin(a) * r, C.signal, 0.12); }
    });
  }
  b.part(2.2, (k, emit) => {
    for (let j = 0; j < k; j++) {
      const t = j / k, a = b.rand() * Math.PI * 2, r = 0.05 + b.rand() * 0.1 * (1 - t);
      emit(lx + Math.cos(a) * r, 0.1 + t * 4.6, lz + Math.sin(a) * r, C.signal, 0.1 * (1 - t * 0.5));
    }
  });
  return b.build(n);
}

/* ---------- 1. Lattice cell tower ---------- */

function tower(n, seed) {
  const b = builder(seed);
  const S = 0.8;
  const P = (x, y, z) => [x * S, y * S, z * S];
  const halfWidth = (y) => 3.2 + (0.9 - 3.2) * (y / 26);
  const corner = (y, i) => {
    const w = halfWidth(y), sx = i === 0 || i === 3 ? -1 : 1, sz = i < 2 ? -1 : 1;
    return P(sx * w, y, sz * w);
  };

  // Ground: survey rings
  for (let r = 2.5; r <= 19; r += 1.5) {
    b.part(r * 0.5, (k, emit) => {
      for (let j = 0; j < k; j++) {
        const a = ((j + b.rand() * 0.6) / k) * Math.PI * 2;
        emit(Math.cos(a) * r * S, 0, Math.sin(a) * r * S, r > 14 ? C.dim : C.deep, 0.07);
      }
    });
  }

  for (let i = 0; i < 4; i++) b.line(corner(0, i), corner(26, i), 2.6, C.ice, 0.1);
  const levels = [0, 3.2, 6.2, 9, 11.6, 14, 16.2, 18.2, 20.1, 21.9, 23.6, 26];
  for (let l = 0; l < levels.length; l++) {
    const y = levels[l];
    for (let i = 0; i < 4; i++) b.line(corner(y, i), corner(y, (i + 1) % 4), 1.8, C.ice, 0.085);
    if (l < levels.length - 1) {
      const y2 = levels[l + 1];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        b.line(corner(y, i), corner(y2, j), 1.3, C.cyan, 0.075);
        b.line(corner(y, j), corner(y2, i), 1.3, C.cyan, 0.075);
      }
    }
  }
  b.line(P(0, 26, 0), P(0, 31, 0), 3, C.ice, 0.1);

  // Antenna platform, three sectors of panel antennas
  for (let s = 0; s < 3; s++) {
    const ang = (s / 3) * Math.PI * 2 + Math.PI / 6, ang2 = ((s + 1) / 3) * Math.PI * 2 + Math.PI / 6, r = 2.3;
    b.line(P(Math.cos(ang) * r, 27.2, Math.sin(ang) * r), P(Math.cos(ang2) * r, 27.2, Math.sin(ang2) * r), 2, C.ice, 0.085);
    b.line(P(0, 27.2, 0), P(Math.cos(ang) * r, 27.2, Math.sin(ang) * r), 1.4, C.cyan, 0.075);
    for (let q = -1; q <= 1; q++) {
      const a = ang + Math.PI / 3 + q * 0.32;
      const px = Math.cos(a) * 2.5, pz = Math.sin(a) * 2.5, tx = -Math.sin(a) * 0.3, tz = Math.cos(a) * 0.3;
      b.face(P(px - tx, 26, pz - tz), [tx * 2 * S, 0, tz * 2 * S], [0, 3 * S, 0], 16, C.signal, 0.1);
    }
  }
  // Second, lower antenna ring
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * Math.PI * 2 + Math.PI / 2;
    const px = Math.cos(a) * 1.9, pz = Math.sin(a) * 1.9, tx = -Math.sin(a) * 0.28, tz = Math.cos(a) * 0.28;
    b.face(P(px - tx, 21.3, pz - tz), [tx * 2 * S, 0, tz * 2 * S], [0, 2.2 * S, 0], 14, C.signal, 0.095);
  }
  // Microwave dish
  b.part(3, (k, emit) => {
    for (let j = 0; j < k; j++) {
      const t = b.rand() * Math.PI * 2, rr = Math.sqrt(b.rand()) * 0.85;
      emit((1.75 + rr * rr * 0.3) * S, (17.4 + Math.sin(t) * rr) * S, (0.4 + Math.cos(t) * rr) * S, C.ice, 0.085);
    }
  });

  // Shelter, fence, ground control points
  const box = (x0, x1, z0, z1, h, d, col) => {
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i], [bx, bz] = c[(i + 1) % 4];
      b.line(P(ax, 0, az), P(bx, 0, bz), d, col, 0.08); b.line(P(ax, h, az), P(bx, h, bz), d, col, 0.08); b.line(P(ax, 0, az), P(ax, h, az), d, col, 0.08);
    }
  };
  box(5.5, 9, -3.5, -1, 2.6, 1.5, C.mid);
  const f = 11, fence = [[-f, -f], [f, -f], [f, f], [-f, f]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = fence[i], [bx, bz] = fence[(i + 1) % 4];
    b.line(P(ax, 1.8, az), P(bx, 1.8, bz), 0.9, C.mid, 0.075);
    b.line(P(ax, 0.9, az), P(bx, 0.9, bz), 0.5, C.deep, 0.07);
  }
  [[-9, -8], [9, -8], [9, 8], [-9, 8]].forEach(([x, z]) => {
    b.line(P(x - 0.9, 0.02, z), P(x + 0.9, 0.02, z), 4, C.signal, 0.1);
    b.line(P(x, 0.02, z - 0.9), P(x, 0.02, z + 0.9), 4, C.signal, 0.1);
  });
  return b.build(n);
}

/* ---------- 2. Survey terrain with a job site ---------- */

const PAD_Y = 0.5;
const sbox = (x, a, b, e) => smooth(a - e, a + e, x) * (1 - smooth(b - e, b + e, x));
const cone = (x, z, cx, cz, r, h) => Math.max(0, 1 - Math.hypot(x - cx, z - cz) / r) * h;

export function terrainHeight(x, z) {
  let h = fbm(x * 0.085 + 3.1, z * 0.085 - 1.7) * 6.2 - 2.4;
  h += 2.2 * Math.exp(-((x - 10) ** 2 + (z + 9) ** 2) / 34);
  h += 1.4 * Math.exp(-((x + 11) ** 2 + (z + 8) ** 2) / 26);
  const pad = sbox(x, -7.2, 3.2, 1.3) * sbox(z, -3.8, 4.8, 1.3);
  h = lerp(h, PAD_Y, pad);
  h -= 1.9 * Math.exp(-((x - 8.5) ** 2 / 7 + (z - 7) ** 2 / 5));
  return h + cone(x, z, 6.6, -1.4, 1.9, 2.1) + cone(x, z, 9, 0.9, 1.5, 1.6);
}

function terrain(n, seed) {
  const b = builder(seed);
  const SIZE = 30;
  b.part(640, (k, emit) => {
    const side = Math.floor(Math.sqrt(k));
    for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) {
      const x = ((i + 0.5) / side - 0.5) * SIZE, z = ((j + 0.5) / side - 0.5) * SIZE;
      const h = terrainHeight(x, z);
      const t = clamp01((h + 2.2) / 6.5);
      let col = t < 0.5 ? mixc(C.deep, C.mid, t * 2) : mixc(C.mid, C.ice, (t - 0.5) * 2);
      let size = 0.088;
      const band = Math.abs(((h / 0.6) % 1 + 1) % 1 - 0.5); // contour lines every 0.6
      if (band > 0.42) { col = mixc(col, C.cyan, 0.8); size = 0.115; }
      if (cone(x, z, 6.6, -1.4, 1.9, 2.1) + cone(x, z, 9, 0.9, 1.5, 1.6) > 0.15) col = mixc(col, C.signal, 0.75);
      emit(x, h, z, col, size);
    }
  });

  // Steel frame going up on the graded pad
  const xs = [-5.6, -3.3, -1, 1.3], zs = [-2.4, -0.4, 1.6, 3.6], floors = [PAD_Y, 2.1, 3.7, 5.3];
  for (const x of xs) for (const z of zs) b.line([x, PAD_Y, z], [x, 5.3, z], 1.4, C.ice, 0.078);
  for (const y of floors.slice(1)) {
    for (const z of zs) b.line([xs[0], y, z], [xs[3], y, z], 1.1, C.cyan, 0.07);
    for (const x of xs) b.line([x, y, zs[0]], [x, y, zs[3]], 1.1, C.cyan, 0.07);
  }
  // Tower crane
  const cx = 2.9, cz = -2.9, top = 8.6;
  for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [0.25, 0.25], [-0.25, 0.25]]) b.line([cx + dx, PAD_Y, cz + dz], [cx + dx, top, cz + dz], 2, C.signal, 0.085);
  for (let y = PAD_Y; y < top; y += 0.9) b.line([cx - 0.25, y, cz - 0.25], [cx + 0.25, y + 0.9, cz + 0.25], 1.4, C.signal, 0.07);
  b.line([cx + 2.2, top, cz], [cx - 6.4, top, cz], 2.4, C.signal, 0.09);
  b.line([cx + 2.2, top, cz], [cx, top + 1.3, cz], 1.5, C.signal, 0.075);
  b.line([cx, top + 1.3, cz], [cx - 6.4, top, cz], 1.5, C.signal, 0.075);
  b.line([cx - 4.6, top, cz], [cx - 4.6, top - 2.6, cz], 1.8, C.ice, 0.07);
  return b.build(n);
}

/* ---------- 3. House on a lot ---------- */

function house(n, seed) {
  const b = builder(seed);
  const E = 2.4; // edge density
  const boxEdges = (x0, x1, y0, y1, z0, z1, col = C.ice) => {
    for (const y of [y0, y1]) b.poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], E, col, 0.09);
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) b.line([x, y0, z], [x, y1, z], E, col, 0.09);
  };

  // Lot
  b.face([-13, 0, -10], [26, 0, 0], [0, 0, 19], 0.9, C.dim, 0.065);
  b.poly([[-13, 0, -10], [13, 0, -10], [13, 0, 9], [-13, 0, 9]], 0.9, C.deep, 0.075);
  b.poly([[-13, 1.2, 9], [-13, 1.2, -10], [13, 1.2, -10], [13, 1.2, 9]], 0.8, C.mid, 0.07, false); // fence
  b.line([-16, 0, 10.2], [16, 0, 10.2], 1, C.deep, 0.075); // street
  b.line([-16, 0, 13], [16, 0, 13], 1, C.deep, 0.075);

  // Main house with a gable roof
  const X0 = -5, X1 = 4, Z0 = -3.5, Z1 = 2.5, H = 3.4, R = 5.7, ZR = -0.5;
  boxEdges(X0, X1, 0, H, Z0, Z1);
  const warmWin = (p, s, t, wins) => { for (const [a, c, d, e] of wins) if (s > a && s < c && t > d && t < e) return { col: C.warm, size: 0.12 }; return null; };
  b.face([X0, 0, Z1], [X1 - X0, 0, 0], [0, H, 0], 7, C.mid, 0.065, (p, s, t) => warmWin(p, s, t, [[0.08, 0.3, 0.32, 0.76], [0.44, 0.56, 0.04, 0.68], [0.7, 0.92, 0.32, 0.76]]));
  b.face([X0, 0, Z0], [0, 0, Z1 - Z0], [0, H, 0], 5, C.mid, 0.065);
  b.face([X1, 0, Z0], [0, 0, Z1 - Z0], [0, H, 0], 6, C.mid, 0.065, (p, s, t) => warmWin(p, s, t, [[0.12, 0.42, 0.34, 0.74]]));
  b.face([X0 - 0.4, H, Z1 + 0.4], [X1 - X0 + 0.8, 0, 0], [0, R - H, ZR - Z1 - 0.4], 8, C.cyan, 0.07);
  b.face([X0 - 0.4, H, Z0 - 0.4], [X1 - X0 + 0.8, 0, 0], [0, R - H, ZR - Z0 + 0.4], 6, C.mid, 0.065);
  b.line([X0 - 0.4, R, ZR], [X1 + 0.4, R, ZR], E, C.ice, 0.1);
  for (const x of [X0 - 0.4, X1 + 0.4]) { b.line([x, H, Z1 + 0.4], [x, R, ZR], E, C.ice, 0.09); b.line([x, H, Z0 - 0.4], [x, R, ZR], E, C.ice, 0.09); }
  boxEdges(-3.6, -2.7, R - 1.2, R + 0.9, -2.2, -1.4, C.mid); // chimney

  // Garage wing
  const GX0 = 4, GX1 = 9.2, GZ0 = -1.5, GZ1 = 3.6, GH = 2.9;
  boxEdges(GX0, GX1, 0, GH, GZ0, GZ1);
  b.face([GX0, 0, GZ1], [GX1 - GX0, 0, 0], [0, GH, 0], 6, C.mid, 0.065, (p, s, t) => (s > 0.12 && s < 0.88 && t < 0.78 && Math.abs((t * 5) % 1 - 0.5) > 0.38 ? { col: C.ice, size: 0.08 } : null));
  b.face([GX1, 0, GZ0], [0, 0, GZ1 - GZ0], [0, GH, 0], 5, C.mid, 0.065);
  b.face([GX0, GH, GZ0], [GX1 - GX0, 0, 0], [0, 0, GZ1 - GZ0], 3, C.deep, 0.065);

  // Driveway and walk
  b.face([4.5, 0.02, 3.6], [4.2, 0, 0], [0, 0, 6.6], 3.2, C.deep, 0.07);
  b.poly([[4.5, 0.02, 3.6], [4.5, 0.02, 10.2], [8.7, 0.02, 10.2], [8.7, 0.02, 3.6]], 1.4, C.mid, 0.075, false);
  b.face([-1.4, 0.02, 2.5], [1.5, 0, 0], [0, 0, 7.7], 2.4, C.deep, 0.07);

  // Pool
  b.face([-11.4, 0.05, -3.2], [4.4, 0, 0], [0, 0, 5.6], 16, C.cyan, 0.085, (p) => { p[1] += Math.sin(p[0] * 2.4) * Math.cos(p[2] * 2.1) * 0.05; return null; });
  b.poly([[-11.8, 0.1, -3.6], [-6.6, 0.1, -3.6], [-6.6, 0.1, 2.8], [-11.8, 0.1, 2.8]], 2, C.ice, 0.09);

  // Trees
  for (const [tx, tz, r] of [[-10, -7.4, 1.7], [-3.5, -7.6, 1.5], [10.6, -6.6, 1.9], [11, 6, 1.5], [-10.6, 6.4, 1.6], [1.6, 6.6, 1.1]]) {
    b.line([tx, 0, tz], [tx, r * 1.25, tz], 2.2, C.mid, 0.08);
    b.part(r * r * 4.2, (k, emit) => {
      for (let j = 0; j < k; j++) {
        const u = b.rand() * 2 - 1, a = b.rand() * Math.PI * 2, s = Math.sqrt(1 - u * u), rr = r * (0.82 + b.rand() * 0.18);
        emit(tx + Math.cos(a) * s * rr, r * 1.9 + u * rr * 0.9, tz + Math.sin(a) * s * rr, u > 0.2 ? C.mid : C.deep, 0.075);
      }
    });
  }
  return b.build(n);
}

/* ---------- 4. FPV tunnel ----------
   Stored in tunnel-local coordinates (ring x, ring y, distance along the tube). The stage
   shader scrolls the points along z and bends the tube, so this shape is always in motion. */

export const TUNNEL = { zMin: -110, zLen: 130, radius: 5.4 };

function tunnel(n, seed) {
  const b = builder(seed);
  const { zMin, zLen, radius: R } = TUNNEL;
  const rings = 52;
  for (let i = 0; i < rings; i++) {
    const z = zMin + (i / rings) * zLen, gate = i % 6 === 0;
    b.part(gate ? 3 : 1, (k, emit) => {
      for (let j = 0; j < k; j++) {
        const a = (j / k) * Math.PI * 2, r = gate ? R * (0.97 + (j % 3) * 0.03) : R;
        emit(Math.cos(a) * r, Math.sin(a) * r, z + (gate ? (j % 3) * 0.12 : 0), gate ? C.signal : C.cyan, gate ? 0.13 : 0.09);
      }
    });
  }
  const lines = 28;
  for (let i = 0; i < lines; i++) {
    const a = (i / lines) * Math.PI * 2 + 0.11;
    b.part(2.1, (k, emit) => {
      for (let j = 0; j < k; j++) emit(Math.cos(a) * R, Math.sin(a) * R, zMin + ((j + b.rand()) / k) * zLen, i % 7 === 0 ? C.ice : C.mid, 0.07);
    });
  }
  // Spray inside the tube
  b.part(16, (k, emit) => {
    for (let j = 0; j < k; j++) {
      const a = b.rand() * Math.PI * 2, r = Math.sqrt(b.rand()) * R * 0.92;
      emit(Math.cos(a) * r, Math.sin(a) * r, zMin + b.rand() * zLen, C.ice, 0.05);
    }
  });
  return b.build(n);
}

// Tube centerline, mirrored in the stage vertex shader
export function tubeCenter(zw) {
  return [Math.sin(zw * 0.045) * 3.2 + Math.sin(zw * 0.021 + 1.3) * 2.0, Math.sin(zw * 0.037 + 0.7) * 1.6];
}

export function buildShapes(n) {
  return [california(n, 11), tower(n, 107), terrain(n, 23), house(n, 41), tunnel(n, 57)];
}
