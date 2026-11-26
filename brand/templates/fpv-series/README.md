# FPV, Flown Right: series templates

Generates the reel covers (1080×1920), carousel slides (1080×1350) and the one-take checklist PDF for the FPV teaching series, using the brand tokens and logo files in `brand/`.

```
python3 brand/templates/fpv-series/make_assets.py /tmp/fpv_assets     # writes HTML + manifest.json
node brand/templates/fpv-series/render.js /tmp/fpv_assets              # renders png/ and the PDF (needs Playwright)
```

Edit the `EPS` list (covers) and the `CAR` dict (carousel slides) in `make_assets.py` to add episodes. Cover text stays inside the middle 1080×1440 so the profile grid crop never cuts it. Legal slides end with "General information, not legal advice"; verify them against faa.gov before posting.
