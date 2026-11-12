(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header border once the page scrolls
  const header = document.querySelector("[data-header]");
  const onScroll = () => header.toggleAttribute("data-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  initPointCloud(document.getElementById("pointcloud"), reduceMotion);
  initQuoteForm(document.getElementById("quote-form"));
})();

/* ---------- Hero point cloud: a lattice cell tower assembling bottom-up ---------- */

function initPointCloud(canvas, reduceMotion) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const COLORS = {
    steel: [230, 238, 240],
    ground: [111, 152, 166],
    signal: [242, 194, 48],
  };

  const points = buildTower();
  const H = 31;

  let width = 0, height = 0, dpr = 1;
  let yaw = 0.6, yawVel = 0;
  const pitch = -0.32;
  const autoSpin = reduceMotion ? 0 : 0.16;
  const assemblyMs = reduceMotion ? 0 : 2600;
  let start = null, last = null, visible = true, rafId = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestFrame();
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function draw(now) {
    rafId = null;
    if (start === null) start = now;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.05);
    last = now;

    // Spin: drag velocity decays back toward the slow auto rotation
    yawVel += (autoSpin - yawVel) * Math.min(dt * 1.5, 1);
    if (!dragging) yaw += yawVel * dt;

    const elapsed = now - start;
    const progress = assemblyMs ? Math.min(elapsed / assemblyMs, 1) : 1;

    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height * 1.1) / 38;
    const cx = width / 2;
    const cy = height * 0.56;
    const camDist = 70;
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let x = p.x, y = p.y, z = p.z;

      if (progress < 1) {
        const local = Math.min(Math.max((elapsed - p.delay) / 1300, 0), 1);
        const e = easeOut(local);
        x = p.sx + (p.x - p.sx) * e;
        y = p.sy + (p.y - p.sy) * e;
        z = p.sz + (p.z - p.sz) * e;
        if (local === 0) continue;
      }

      // Rotate around Y (yaw), then X (pitch), centered on mid-height
      const yc = y - 13;
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;
      const ry = yc * cosP - rz * sinP;
      const rz2 = yc * sinP + rz * cosP;

      const persp = camDist / (camDist + rz2);
      const sx = cx + rx * scale * persp;
      const sy = cy - ry * scale * persp;

      const depth = Math.min(Math.max((rz2 + 16) / 32, 0), 1);
      const alpha = p.a * (1 - depth * 0.6);
      const c = COLORS[p.c];
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
      const size = p.s * persp;
      ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    }

    // Scan plane rising with the assembly
    if (progress < 1) {
      const scanY = cy - (easeOut(progress) * (H + 2) - 13) * scale * cosP;
      ctx.strokeStyle = `rgba(242,194,48,${0.55 * (1 - progress)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.08, scanY);
      ctx.lineTo(width * 0.92, scanY);
      ctx.stroke();
    }

    if (visible && (progress < 1 || autoSpin || Math.abs(yawVel) > 0.001)) requestFrame();
  }

  function requestFrame() {
    if (rafId === null) rafId = requestAnimationFrame(draw);
  }

  // Drag to rotate
  let dragging = false, lastX = 0, lastT = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    yaw += dx * 0.01;
    yawVel = (dx * 0.01) / Math.max((now - lastT) / 1000, 0.016);
    lastX = e.clientX;
    lastT = now;
    requestFrame();
  });
  const endDrag = () => { dragging = false; requestFrame(); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Pause when off screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    last = null;
    if (visible) requestFrame();
  }).observe(canvas);

  new ResizeObserver(resize).observe(canvas);
}

function buildTower() {
  const pts = [];
  const rand = mulberry32(107);
  const H = 31;

  function add(x, y, z, c, s, a) {
    // Start somewhere in a loose cloud around the final position
    const r = 18 + rand() * 18;
    const t = rand() * Math.PI * 2;
    const u = rand() * 2 - 1;
    pts.push({
      x, y, z, c, s, a,
      sx: x + r * Math.sqrt(1 - u * u) * Math.cos(t),
      sy: y + r * u * 0.6,
      sz: z + r * Math.sqrt(1 - u * u) * Math.sin(t),
      delay: (Math.max(y, 0) / H) * 1100 + rand() * 260,
    });
  }

  function line(a, b, spacing, c = "steel", s = 1.7, alpha = 0.95) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(2, Math.round(d / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = 0.04;
      add(
        a[0] + (b[0] - a[0]) * t + (rand() - 0.5) * j,
        a[1] + (b[1] - a[1]) * t + (rand() - 0.5) * j,
        a[2] + (b[2] - a[2]) * t + (rand() - 0.5) * j,
        c, s, alpha
      );
    }
  }

  // Tapered four-leg lattice tower
  const halfWidth = (y) => 3.2 + (0.9 - 3.2) * (y / 26);
  const corner = (y, i) => {
    const w = halfWidth(y);
    const sx = i === 0 || i === 3 ? -1 : 1;
    const sz = i < 2 ? -1 : 1;
    return [sx * w, y, sz * w];
  };

  for (let i = 0; i < 4; i++) line(corner(0, i), corner(26, i), 0.22);

  const levels = [0, 3.2, 6.2, 9, 11.6, 14, 16.2, 18.2, 20.1, 21.9, 23.6, 26];
  for (let l = 0; l < levels.length; l++) {
    const y = levels[l];
    for (let i = 0; i < 4; i++) line(corner(y, i), corner(y, (i + 1) % 4), 0.3, "steel", 1.4, 0.8);
    if (l < levels.length - 1) {
      const y2 = levels[l + 1];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        line(corner(y, i), corner(y2, j), 0.34, "steel", 1.2, 0.6);
        line(corner(y, j), corner(y2, i), 0.34, "steel", 1.2, 0.6);
      }
    }
  }

  // Mast above the lattice
  line([0, 26, 0], [0, H, 0], 0.18, "steel", 1.8, 1);

  // Antenna platform and three sectors of panel antennas
  for (let s = 0; s < 3; s++) {
    const ang = (s / 3) * Math.PI * 2 + Math.PI / 6;
    const ang2 = ((s + 1) / 3) * Math.PI * 2 + Math.PI / 6;
    const r = 2.3;
    line([Math.cos(ang) * r, 27.2, Math.sin(ang) * r], [Math.cos(ang2) * r, 27.2, Math.sin(ang2) * r], 0.25, "steel", 1.4, 0.85);
    line([0, 27.2, 0], [Math.cos(ang) * r, 27.2, Math.sin(ang) * r], 0.3, "steel", 1.2, 0.6);

    for (let k = -1; k <= 1; k++) {
      const a = ang + Math.PI / 3 + k * 0.32;
      const px = Math.cos(a) * 2.45, pz = Math.sin(a) * 2.45;
      const tx = -Math.sin(a) * 0.22, tz = Math.cos(a) * 0.22;
      for (let yy = 26.1; yy <= 28.9; yy += 0.16) {
        for (let w = -1; w <= 1; w++) {
          add(px + tx * w, yy, pz + tz * w, "signal", 1.6, 0.95);
        }
      }
    }
  }

  // Microwave dish
  for (let i = 0; i < 70; i++) {
    const t = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * 0.75;
    add(1.6 + 0.15, 22.5 + Math.sin(t) * rr, 0.4 + Math.cos(t) * rr, "steel", 1.5, 0.9);
  }

  // Equipment shelter
  const box = (x0, x1, z0, z1, h) => {
    const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i];
      const [bx, bz] = c[(i + 1) % 4];
      line([ax, 0, az], [bx, 0, bz], 0.3, "steel", 1.3, 0.7);
      line([ax, h, az], [bx, h, bz], 0.3, "steel", 1.3, 0.7);
      line([ax, 0, az], [ax, h, az], 0.3, "steel", 1.3, 0.7);
    }
  };
  box(5.5, 9, -3.5, -1, 2.6);

  // Fence around the compound
  const f = 11;
  const fence = [[-f, -f], [f, -f], [f, f], [-f, f]];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = fence[i];
    const [bx, bz] = fence[(i + 1) % 4];
    line([ax, 1.8, az], [bx, 1.8, bz], 0.45, "ground", 1.2, 0.55);
    line([ax, 0.9, az], [bx, 0.9, bz], 0.6, "ground", 1, 0.35);
  }

  // Ground scatter
  for (let i = 0; i < 1100; i++) {
    const t = rand() * Math.PI * 2;
    const rr = Math.pow(rand(), 0.7) * 17;
    const x = Math.cos(t) * rr, z = Math.sin(t) * rr;
    add(x, (rand() - 0.5) * 0.15, z, "ground", 1.3, 0.25 + rand() * 0.35);
  }

  // Ground control point markers
  [[-9, -8], [9, -8], [9, 8], [-9, 8]].forEach(([x, z]) => {
    line([x - 0.8, 0, z], [x + 0.8, 0, z], 0.12, "signal", 1.7, 1);
    line([x, 0, z - 0.8], [x, 0, z + 0.8], 0.12, "signal", 1.7, 1);
  });

  return pts;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Quote form ---------- */

function initQuoteForm(form) {
  if (!form) return;
  const status = document.getElementById("form-status");
  const button = form.querySelector("button[type=submit]");
  const CONTACT_EMAIL = "hello@californiadrones.io";

  const setStatus = (msg, state) => {
    status.textContent = msg;
    status.dataset.state = state || "";
  };

  form.addEventListener("input", (e) => {
    if (e.target.hasAttribute("aria-invalid") && e.target.checkValidity()) e.target.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const invalid = [...form.querySelectorAll("[required]")].filter((el) => !el.checkValidity());
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (invalid.length) {
      invalid.forEach((el) => el.setAttribute("aria-invalid", "true"));
      invalid[0].focus();
      setStatus("Add your name, a valid email, the project location and a few details, then send again.", "error");
      return;
    }

    const data = new FormData(form);
    if (data.get("botcheck")) return;

    const services = data.getAll("services");
    data.delete("services");
    data.set("services", services.length ? services.join(", ") : "Not specified");

    // Until a form key is configured, fall back to the visitor's email app
    if (data.get("access_key") === "YOUR_WEB3FORMS_ACCESS_KEY" /* unset key */) {
      const body = [
        `Name: ${data.get("name")}`,
        `Company: ${data.get("company") || "-"}`,
        `Email: ${data.get("email")}`,
        `Phone: ${data.get("phone") || "-"}`,
        `Services: ${data.get("services")}`,
        `Location: ${data.get("location")}`,
        `Timeline: ${data.get("timeline")}`,
        "",
        data.get("message"),
      ].join("\n");
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Project request")}&body=${encodeURIComponent(body)}`;
      setStatus("Your email app should open with the request filled in. Press send there to finish.", "ok");
      return;
    }

    button.disabled = true;
    button.textContent = "Sending…";
    setStatus("", "");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.statusText);
      form.reset();
      setStatus("Request sent. We'll reply by email soon.", "ok");
    } catch (err) {
      setStatus(`The request didn't send. Try again, or email ${CONTACT_EMAIL} directly.`, "error");
    } finally {
      button.disabled = false;
      button.textContent = "Send project request";
    }
  });
}
