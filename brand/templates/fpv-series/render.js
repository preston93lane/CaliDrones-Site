// Render generated HTML assets to PNG (and the checklist to PDF + PNG preview).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const only = process.argv[3] || '';
(async () => {
  const b = await chromium.launch();
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json')));
  const outDir = path.join(dir, 'png'); fs.mkdirSync(outDir, { recursive: true });
  for (const [file, w, h] of manifest) {
    if (only && !file.includes(only)) continue;
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(dir, file), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const over = await p.evaluate(() => [...document.querySelectorAll('h1,h2,ul,.sub,.note,.ctabtn')].some(el => { const r = el.getBoundingClientRect(); return r.bottom > innerHeight - 110 || r.right > innerWidth - 40; }));
    await p.screenshot({ path: path.join(outDir, file.replace('.html', '.png')) });
    if (over) console.log('OVERFLOW?', file);
    await p.close();
  }
  if (!only || only === 'checklist') {
    const p = await b.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(dir, 'checklist.html'), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(dir, 'FPV-one-take-checklist.pdf'), width: '8.5in', height: '11in', printBackground: true });
    await p.screenshot({ path: path.join(dir, 'checklist-preview.png') });
  }
  await b.close();
  console.log('done');
})();
