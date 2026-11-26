---
name: service-landing-page
description: Checklist for building or editing a service or area landing page on californiadrones.io so it ranks for one search intent, converts to quote requests and works as an ad landing page. Use when creating /<service>/ or /drone-services-<area>/ pages, or reviewing their SEO.
---

# Service and area landing pages

## Site constraints
- Static HTML, CSS and ES modules, no build step. Cloudflare Workers static assets serve `/slug/index.html` at `/slug/`.
- `_headers` sets a strict CSP. Inline executable scripts are blocked unless hashed; JSON-LD data blocks are fine. No third-party scripts or trackers (the privacy page promises none).
- Service and area pages use the `.plain` page style and skip the 3D stage, so they stay fast.
- Quote form logic lives in `js/quote-form.js` (Web3Forms). It also passes `utm_*`, `gclid` and the landing path as hidden fields, so each lead email shows its source.

## Page checklist
1. One primary query per page, for example "real estate drone photography Los Angeles". Put it naturally in the title (60 characters or fewer), H1, first paragraph and URL slug.
2. A meta description of 155 characters or fewer that names the service, the area and one proof point.
3. Canonical URL, Open Graph tags, and a single H1.
4. Sections: what you get (deliverables), who it's for, how it works, proof (facts only), FAQ (5 to 7 real questions), and the quote form with this page's service pre-checked.
5. JSON-LD: `Service` (provider = the ProfessionalService on the home page), `FAQPage`, `BreadcrumbList`.
6. Internal links to the related service pages, the area pages and home. Link back from home.
7. 700 to 1200 words of specific, plain copy. Area pages need genuinely local substance (airports and airspace, permits, terrain, local industries), not swapped city names.
8. Add the URL to `sitemap.xml` with `lastmod`.
9. Verify in Playwright at 390px and 1280px: no console errors, no horizontal scroll, the form submits to the right fields, and the UTM fields fill when the page is loaded with `?utm_source=test&gclid=abc`.

## Don't
- Invent reviews, clients, prices or stats. Make claims only from `.claude/business-facts.md`.
- Create near-duplicate city pages.
- Change the inline import map in `index.html` without updating its hash in `_headers`.
