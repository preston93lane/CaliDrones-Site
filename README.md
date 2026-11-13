# californiadrones.io

Static site for California Drones. Plain HTML, CSS and JavaScript modules, no build step.

- `index.html`: home page. Five sections sit over a fixed 3D stage (intro and the four services), followed by track record, process and the quote form.
- `styles.css`: all styles; color and type tokens are at the top.
- `js/main.js`: header, section index, counters, quote form, and loading the 3D stage.
- `js/stage.js`: the three.js scene. One point cloud morphs between five shapes as the page scrolls while the drones fly each job.
- `js/shapes.js`: the point-cloud shapes (California relief map, cell tower, survey terrain, house, FPV tunnel).
- `js/drones.js`: the two procedural drone models (camera drone and FPV quad).
- `js/california.js`: California outline from US Census boundaries (public domain).
- `vendor/three.custom.min.js`: trimmed three.js build (MIT). Rebuild instructions are in `vendor/three.entry.js`.
- `privacy.html`, `404.html`, `robots.txt`, `sitemap.xml`, `favicon.svg`
- `_headers`: security headers. The content security policy allows the inline import map by its hash, so update the hash if that script changes.

The page works without WebGL and with reduced motion: the text and form are ordinary HTML and the stage is decoration.

## Quote form

The form posts to [Web3Forms](https://web3forms.com) using the access key in `index.html`.

## Local preview

    python3 -m http.server 8080

## Branches

- `main`: the live site.
- `v1-original`: the first, light design, kept as a restore point.
