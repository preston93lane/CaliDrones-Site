# californiadrones.io

Static site for California Drones. Plain HTML, CSS and JavaScript, no build step.

- `index.html`: home page (services, process, quote form)
- `styles.css`: all styles; color and type tokens are at the top
- `main.js`: hero point-cloud animation and quote form handling
- `privacy.html`, `404.html`, `robots.txt`, `sitemap.xml`, `favicon.svg`

## Quote form

The form posts to [Web3Forms](https://web3forms.com). Replace `YOUR_WEB3FORMS_ACCESS_KEY` in `index.html`
with the access key Web3Forms emails you. Until then the form opens the visitor's email app with the request filled in.

## Local preview

    python3 -m http.server 8080
