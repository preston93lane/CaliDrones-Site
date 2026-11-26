import { initQuoteForm } from './quote-form.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const chapters = [...document.querySelectorAll('[data-chapter]')];

// Header background once the page scrolls
const header = document.querySelector('[data-header]');
const onScroll = () => header.toggleAttribute('data-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

initRail(document.querySelector('[data-rail]'));
initCounts();
initServiceLinks();
initQuoteForm(document.getElementById('quote-form'));
initStage(document.getElementById('stage'));

/* ---------- 3D stage ---------- */

function initStage(canvas) {
  if (!canvas || chapters.length !== 5) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
  import('./stage.js')
    .then((m) => { window.stage = m.createStage({ canvas, chapters, reduceMotion }); })
    .catch((err) => console.warn('3D stage unavailable', err));
}

/* ---------- Section index ---------- */

function initRail(rail) {
  if (!rail) return;
  const links = [...rail.querySelectorAll('a')];
  const update = () => {
    const mid = window.scrollY + window.innerHeight / 2;
    let active = 0;
    chapters.forEach((el, i) => { if (el.offsetTop <= mid) active = i; });
    links.forEach((a, i) => { if (i === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const last = chapters[chapters.length - 1];
    rail.toggleAttribute('data-hidden', window.scrollY > last.offsetTop + last.offsetHeight * 0.6);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/* ---------- Track record numbers count up once ---------- */

function initCounts() {
  const els = [...document.querySelectorAll('[data-count]')];
  if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
  const fmt = new Intl.NumberFormat('en-US');
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      const el = entry.target, target = Number(el.dataset.count), start = performance.now(), dur = 1300;
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* ---------- "Quote a ..." links preselect the service ---------- */

function initServiceLinks() {
  document.querySelectorAll('a[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const box = [...document.querySelectorAll('input[name="services"]')].find((el) => el.value === link.dataset.service);
      if (box) box.checked = true;
    });
  });
}
