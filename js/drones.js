// Procedural drone models. Both are built nose-forward along +Z, up along +Y,
// in units of roughly 10 cm, and scaled by the stage.

import {
  Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, BoxGeometry, CylinderGeometry,
  SphereGeometry, CircleGeometry, CanvasTexture, Sprite, SpriteMaterial, AdditiveBlending, DoubleSide,
  SRGBColorSpace, Vector3, Matrix4, MathUtils, RoundedBoxGeometry,
} from 'three';

const UP = new Vector3(0, 1, 0);
const V = (x, y, z) => new Vector3(x, y, z);

function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

// Rounded bar from a to b
function beam(a, b, w, h, mat, radius) {
  const len = a.distanceTo(b);
  const m = new Mesh(new RoundedBoxGeometry(w, h, len, 3, radius ?? Math.min(w, h) * 0.45), mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromRotationMatrix(new Matrix4().lookAt(b, a, UP));
  return m;
}

function rod(a, b, r0, r1, mat) {
  const len = a.distanceTo(b);
  const geo = new CylinderGeometry(r1, r0, len, 12);
  geo.rotateX(Math.PI / 2);
  const m = new Mesh(geo, mat);
  m.position.copy(a).lerp(b, 0.5);
  m.quaternion.setFromRotationMatrix(new Matrix4().lookAt(b, a, UP));
  return m;
}

function lens(r, depth, ringMat, glassMat) {
  const g = new Group();
  const barrel = new CylinderGeometry(r, r * 1.04, depth, 28);
  barrel.rotateX(Math.PI / 2);
  g.add(new Mesh(barrel, ringMat));
  g.add(at(new Mesh(new CircleGeometry(r * 0.8, 28), glassMat), 0, 0, depth / 2 + 0.002));
  const inner = new CylinderGeometry(r * 0.42, r * 0.42, 0.01, 20);
  inner.rotateX(Math.PI / 2);
  g.add(at(new Mesh(inner, ringMat), 0, 0, depth / 2 + 0.004));
  return g;
}

let glowTex;
function glow(color, size) {
  if (!glowTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    glowTex = new CanvasTexture(c);
  }
  const s = new Sprite(new SpriteMaterial({ map: glowTex, color, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size);
  return s;
}

function discTexture(tip, blades) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), grad = g.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, 'rgba(205,220,226,0)');
  grad.addColorStop(0.2, 'rgba(205,220,226,.07)');
  grad.addColorStop(0.82, 'rgba(205,220,226,.13)');
  grad.addColorStop(0.9, `rgba(${tip},.34)`);
  grad.addColorStop(0.965, `rgba(${tip},.2)`);
  grad.addColorStop(1, `rgba(${tip},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2;
    g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 120, a - 0.3, a + 0.3); g.closePath();
    g.fillStyle = 'rgba(225,235,240,.07)'; g.fill();
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace;
  return t;
}

// Propeller: real blades that spin fast plus a soft disc that sells the motion blur
function propeller({ radius, blades, chord, bladeMat, tipMat, discTex, dir }) {
  const g = new Group(), spinner = new Group();
  for (let i = 0; i < blades; i++) {
    const geo = new BoxGeometry(radius - 0.06, 0.014, chord, 8, 1, 1);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const u = p.getX(k) / (radius - 0.06) + 0.5; // 0 at hub, 1 at tip
      p.setZ(k, p.getZ(k) * (0.55 + 0.75 * Math.sin(Math.PI * Math.min(u * 1.15, 1)) - 0.25 * u));
    }
    geo.translate((radius - 0.06) / 2 + 0.05, 0, 0);
    const blade = new Mesh(geo, bladeMat);
    blade.rotation.x = 0.16 * dir;
    const arm = new Group(); arm.add(blade);
    if (tipMat) arm.add(at(new Mesh(new BoxGeometry(radius * 0.14, 0.016, chord * 0.5), tipMat), radius * 0.93, 0, 0));
    arm.rotation.y = (i / blades) * Math.PI * 2;
    spinner.add(arm);
  }
  spinner.add(new Mesh(new CylinderGeometry(0.055, 0.065, 0.05, 16), bladeMat));
  const disc = new Mesh(new CircleGeometry(radius, 48), new MeshBasicMaterial({ map: discTex, transparent: true, depthWrite: false, side: DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.012;
  g.add(spinner, disc);
  return { group: g, spinner, disc, dir };
}

function spinProps(props, time, spin) {
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    p.spinner.rotation.y = spin ? time * 47 * p.dir + i * 1.3 : i * 0.9;
    p.disc.rotation.z = spin ? time * 7.3 * p.dir + i : 0;
    p.disc.visible = spin;
  }
}

/* ---------- Mavic 3 Enterprise style camera drone ---------- */

export function buildMavic() {
  const shell = new MeshStandardMaterial({ color: 0x626970, roughness: 0.48, metalness: 0.2 });
  const shellDark = new MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.2 });
  const black = new MeshStandardMaterial({ color: 0x16191c, roughness: 0.42, metalness: 0.25 });
  const metal = new MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.28, metalness: 0.9 });
  const glass = new MeshPhysicalMaterial({ color: 0x070d14, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 });
  const white = new MeshStandardMaterial({ color: 0xe4e9ec, roughness: 0.4, metalness: 0.05 });
  const propMat = new MeshStandardMaterial({ color: 0x2f3338, roughness: 0.55, metalness: 0.1, transparent: true, opacity: 0.8 });
  const tipMat = new MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, emissive: 0x4a1c00 });

  const g = new Group();

  // Fuselage: rounded box, squeezed toward the nose and tail
  const bodyGeo = new RoundedBoxGeometry(0.94, 0.58, 2.2, 8, 0.2);
  const bp = bodyGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const z = bp.getZ(i);
    const n = MathUtils.smoothstep(z, 0.45, 1.125), t = MathUtils.smoothstep(-z, 0.5, 1.125);
    bp.setX(i, bp.getX(i) * (1 - 0.22 * n - 0.14 * t));
    bp.setY(i, bp.getY(i) * (1 - 0.3 * n - 0.2 * t) - 0.05 * n + 0.03 * t);
  }
  g.add(new Mesh(bodyGeo, shell));

  // Battery deck with charge lights
  g.add(at(new Mesh(new RoundedBoxGeometry(0.66, 0.07, 0.86, 3, 0.03), shellDark), 0, 0.27, -0.62));
  for (let i = 0; i < 4; i++) g.add(at(new Mesh(new SphereGeometry(0.02, 8, 8), new MeshBasicMaterial({ color: 0x8dffc0 })), -0.12 + i * 0.08, 0.3, -0.98));

  // Top-mounted RTK module, the tell of the Enterprise airframe
  g.add(at(new Mesh(new RoundedBoxGeometry(0.42, 0.15, 0.4, 3, 0.055), black), 0, 0.345, -0.05));
  const dome = new Mesh(new SphereGeometry(0.13, 20, 12), white); dome.scale.y = 0.42;
  g.add(at(dome, 0, 0.425, -0.05));

  // Forward vision sensors
  for (const sx of [-1, 1]) {
    const s = new Mesh(new SphereGeometry(0.07, 16, 12), glass); s.scale.set(1.2, 0.7, 0.45);
    g.add(at(s, sx * 0.17, 0.03, 1.07));
  }

  // Gimbal and dual camera
  const gimbal = new Group(); gimbal.position.set(0, -0.27, 0.82);
  gimbal.add(at(new Mesh(new RoundedBoxGeometry(0.44, 0.05, 0.4, 2, 0.02), black), 0, -0.02, 0));
  gimbal.add(at(new Mesh(new CylinderGeometry(0.085, 0.085, 0.1, 20), black), 0, -0.08, -0.04));
  gimbal.add(at(new Mesh(new RoundedBoxGeometry(0.34, 0.06, 0.09, 2, 0.025), black), 0.15, -0.13, -0.06));
  gimbal.add(at(new Mesh(new RoundedBoxGeometry(0.06, 0.24, 0.1, 2, 0.025), black), 0.3, -0.24, -0.02));
  const head = new Group(); head.position.set(0, -0.31, 0.04);
  head.add(new Mesh(new RoundedBoxGeometry(0.42, 0.33, 0.36, 3, 0.07), shellDark));
  head.add(at(new Mesh(new RoundedBoxGeometry(0.36, 0.27, 0.03, 2, 0.012), glass), 0, 0, 0.18));
  head.add(at(lens(0.105, 0.07, black, glass), -0.065, -0.035, 0.215));
  head.add(at(lens(0.066, 0.06, black, glass), 0.105, 0.065, 0.21));
  const pitchMotor = new CylinderGeometry(0.075, 0.075, 0.08, 20); pitchMotor.rotateZ(Math.PI / 2);
  head.add(at(new Mesh(pitchMotor, black), 0.26, 0, 0));
  gimbal.add(head);
  g.add(gimbal);

  // Arms, motors, legs
  const props = [], leds = [];
  const discTex = discTexture('255,122,26', 2);
  const arms = [
    { root: V(0.38, 0.1, 0.85), tip: V(1.3, 0.17, 1.35), front: true },
    { root: V(0.36, -0.08, -0.75), tip: V(1.3, 0.13, -1.45), front: false },
  ];
  let n = 0;
  for (const arm of arms) for (const sx of [1, -1]) {
    const root = arm.root.clone(), tip = arm.tip.clone(); root.x *= sx; tip.x *= sx;
    g.add(beam(root, tip, 0.17, 0.125, shell));
    g.add(at(new Mesh(new CylinderGeometry(0.105, 0.105, 0.17, 20), shellDark), root.x, root.y, root.z));
    g.add(at(new Mesh(new CylinderGeometry(0.165, 0.14, 0.2, 28), shellDark), tip.x, tip.y, tip.z));
    g.add(at(new Mesh(new CylinderGeometry(0.135, 0.14, 0.1, 28), metal), tip.x, tip.y + 0.15, tip.z));
    if (arm.front) {
      const foot = V(tip.x + sx * 0.05, -0.78, tip.z + 0.03);
      g.add(rod(V(tip.x, tip.y - 0.08, tip.z), foot, 0.05, 0.03, shellDark));
      g.add(at(new Mesh(new SphereGeometry(0.05, 12, 10), black), foot.x, foot.y, foot.z));
    } else {
      g.add(rod(V(tip.x, tip.y - 0.08, tip.z), V(tip.x, tip.y - 0.3, tip.z), 0.045, 0.03, shellDark));
    }
    const led = glow(arm.front ? 0xff3b30 : 0x53ff9a, 0.55);
    led.position.set(tip.x, tip.y - 0.03, tip.z + (arm.front ? 0.2 : -0.2));
    g.add(led); leds.push({ sprite: led, front: arm.front });
    const dir = (n++ % 2 ? 1 : -1) * (arm.front ? 1 : -1);
    const p = propeller({ radius: 1.18, blades: 2, chord: 0.2, bladeMat: propMat, tipMat, discTex, dir });
    p.group.position.set(tip.x, tip.y + 0.225, tip.z);
    g.add(p.group); props.push(p);
  }

  return {
    group: g, head,
    update(time, spin, gimbalPitch) {
      spinProps(props, time, spin);
      head.rotation.x = -gimbalPitch;
      for (const l of leds) l.sprite.material.opacity = l.front ? 0.9 : (spin ? (Math.sin(time * 5) > 0.2 ? 1 : 0.15) : 1);
    },
  };
}

/* ---------- 5.7-inch cinematic FPV quad ---------- */

export function buildFpv() {
  const carbon = new MeshStandardMaterial({ color: 0x15171a, roughness: 0.38, metalness: 0.45 });
  const shell = new MeshStandardMaterial({ color: 0x1d2024, roughness: 0.42, metalness: 0.25 });
  const alu = new MeshStandardMaterial({ color: 0xa3abb2, roughness: 0.3, metalness: 0.9 });
  const yellow = new MeshStandardMaterial({ color: 0xf2c230, roughness: 0.45, metalness: 0.3 });
  const grey = new MeshStandardMaterial({ color: 0x3b4046, roughness: 0.5, metalness: 0.2 });
  const glass = new MeshPhysicalMaterial({ color: 0x070d14, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03 });
  const led = new MeshBasicMaterial({ color: 0x9af4ff });
  const propMat = new MeshStandardMaterial({ color: 0xb9d6dc, roughness: 0.35, transparent: true, opacity: 0.55 });

  const g = new Group();

  // Carbon plates and arms
  g.add(at(new Mesh(new RoundedBoxGeometry(0.6, 0.035, 2.1, 2, 0.015), carbon), 0, -0.13, 0));
  g.add(at(new Mesh(new RoundedBoxGeometry(0.5, 0.03, 1.72, 2, 0.012), carbon), 0, 0.12, -0.03));
  const motors = [V(0.94, -0.1, 0.84), V(-0.94, -0.1, 0.84), V(0.94, -0.1, -0.84), V(-0.94, -0.1, -0.84)];
  for (const m of motors) g.add(beam(V(Math.sign(m.x) * 0.1, -0.1, Math.sign(m.z) * 0.22), m, 0.2, 0.055, carbon, 0.02));
  for (const z of [-0.8, -0.1, 0.62]) for (const sx of [-1, 1]) g.add(at(new Mesh(new CylinderGeometry(0.026, 0.026, 0.23, 10), yellow), sx * 0.2, 0, z));

  // Streamlined body shell with light strips down each side
  const pod = new Mesh(new SphereGeometry(1, 36, 20), shell); pod.scale.set(0.3, 0.2, 0.98);
  g.add(at(pod, 0, 0.14, -0.06));
  for (const sx of [-1, 1]) {
    g.add(at(new Mesh(new RoundedBoxGeometry(0.035, 0.2, 1.5, 2, 0.015), shell), sx * 0.285, 0, -0.05));
    g.add(at(new Mesh(new BoxGeometry(0.012, 0.03, 1.3), led), sx * 0.306, 0.03, -0.05));
    for (const z of [-0.5, 0, 0.45]) g.add(at(glow(0x6fe3ee, 0.5), sx * 0.34, 0.03, z));
  }

  // FPV camera in the nose, tilted up for forward flight
  const cam = new Group(); cam.position.set(0, 0.02, 1.0); cam.rotation.x = -0.42;
  cam.add(new Mesh(new RoundedBoxGeometry(0.27, 0.25, 0.24, 2, 0.04), shell));
  cam.add(at(lens(0.085, 0.08, carbon, glass), 0, 0, 0.14));
  g.add(cam);
  for (const sx of [-1, 1]) g.add(at(new Mesh(new RoundedBoxGeometry(0.02, 0.3, 0.3, 2, 0.008), alu), sx * 0.165, 0, 1.0));

  // Action camera for the hero shot
  const action = new Group(); action.position.set(0, 0.44, 0.6); action.rotation.x = -0.36;
  action.add(new Mesh(new RoundedBoxGeometry(0.6, 0.42, 0.3, 3, 0.05), grey));
  action.add(at(lens(0.105, 0.07, carbon, glass), 0.14, 0.04, 0.17));
  action.add(at(new Mesh(new RoundedBoxGeometry(0.2, 0.14, 0.012, 2, 0.005), glass), -0.16, 0.08, 0.152));
  g.add(action);
  g.add(at(new Mesh(new RoundedBoxGeometry(0.2, 0.12, 0.26, 2, 0.03), shell), 0, 0.22, 0.56));

  // Battery, strapped on top
  g.add(at(new Mesh(new RoundedBoxGeometry(0.42, 0.33, 0.96, 3, 0.045), shell), 0, 0.42, -0.42));
  g.add(at(new Mesh(new RoundedBoxGeometry(0.425, 0.21, 0.6, 2, 0.02), yellow), 0, 0.42, -0.42));
  g.add(at(new Mesh(new RoundedBoxGeometry(0.44, 0.345, 0.13, 2, 0.02), carbon), 0, 0.42, -0.24));
  g.add(at(new Mesh(new RoundedBoxGeometry(0.44, 0.345, 0.13, 2, 0.02), carbon), 0, 0.42, -0.64));
  g.add(at(new Mesh(new BoxGeometry(0.16, 0.09, 0.12), yellow), 0.08, 0.36, -0.95));

  // Tail: antennas and GPS
  for (const sx of [-1, 1]) {
    const a = V(sx * 0.1, 0.14, -0.95), b = V(sx * 0.42, 0.56, -1.36);
    g.add(rod(a, b, 0.022, 0.022, carbon));
    g.add(at(new Mesh(new CylinderGeometry(0.036, 0.036, 0.16, 10), shell), b.x, b.y, b.z));
  }
  const gps = new Mesh(new CylinderGeometry(0.115, 0.115, 0.045, 20), grey); gps.rotation.x = -0.5;
  g.add(at(gps, 0, 0.2, -1.1));
  g.add(at(glow(0xff3b30, 0.6), 0, 0.05, -1.08));

  // Motors and three-blade props
  const props = [];
  const discTex = discTexture('185,225,235', 3);
  motors.forEach((m, i) => {
    g.add(at(new Mesh(new CylinderGeometry(0.17, 0.17, 0.05, 28), carbon), m.x, m.y + 0.05, m.z));
    g.add(at(new Mesh(new CylinderGeometry(0.165, 0.165, 0.15, 28), shell), m.x, m.y + 0.15, m.z));
    g.add(at(new Mesh(new CylinderGeometry(0.168, 0.168, 0.028, 28), yellow), m.x, m.y + 0.1, m.z));
    g.add(at(new Mesh(new CylinderGeometry(0.1, 0.165, 0.04, 28), alu), m.x, m.y + 0.245, m.z));
    g.add(at(new Mesh(new CylinderGeometry(0.05, 0.05, 0.07, 6), yellow), m.x, m.y + 0.32, m.z));
    const dir = (i === 0 || i === 3) ? 1 : -1;
    const p = propeller({ radius: 0.72, blades: 3, chord: 0.19, bladeMat: propMat, discTex, dir });
    p.group.position.set(m.x, m.y + 0.285, m.z);
    g.add(p.group); props.push(p);
  });

  return {
    group: g,
    update(time, spin) { spinProps(props, time, spin); },
  };
}
