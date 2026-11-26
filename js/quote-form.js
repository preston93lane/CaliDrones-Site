// Quote form (Web3Forms) shared by every page, plus lead-source capture.
// Campaign parameters from the link a visitor arrived on (utm_* and gclid) and the first page they
// landed on are kept for the browser session and sent with the request, so each lead email shows
// which ad or page it came from. No cookies, no third parties.

const CONTACT_EMAIL = 'hello@californiadrones.io';
const SOURCE_KEY = 'cd-lead-source';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];

function readStored() {
  try { return JSON.parse(sessionStorage.getItem(SOURCE_KEY)) || null; } catch { return null; }
}

function store(value) {
  try { sessionStorage.setItem(SOURCE_KEY, JSON.stringify(value)); } catch { /* storage blocked: keep going */ }
}

// Record where this visit came from. The first landing page sticks; a later link with campaign
// parameters replaces the parameters, so the most recent ad click wins.
export function captureLeadSource() {
  const url = new URL(window.location.href);
  const found = {};
  for (const key of PARAMS) {
    const v = url.searchParams.get(key);
    if (v) found[key] = v.slice(0, 200);
  }
  const stored = readStored();
  const next = stored ? { ...stored } : { landing_page: url.pathname, referrer: document.referrer ? new URL(document.referrer).hostname : '' };
  if (Object.keys(found).length) {
    for (const key of PARAMS) delete next[key];
    Object.assign(next, found);
  }
  store(next);
  return next;
}

export function initQuoteForm(form) {
  const source = captureLeadSource();
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type=submit]');
  const buttonLabel = button.textContent;

  const setStatus = (msg, state) => {
    status.textContent = msg;
    status.dataset.state = state || '';
  };

  form.addEventListener('input', (e) => {
    if (e.target.hasAttribute('aria-invalid') && e.target.checkValidity()) e.target.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const invalid = [...form.querySelectorAll('[required]')].filter((el) => !el.checkValidity());
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (invalid.length) {
      invalid.forEach((el) => el.setAttribute('aria-invalid', 'true'));
      invalid[0].focus();
      setStatus('Add your name, a valid email, the project location and a few details, then send again.', 'error');
      return;
    }

    const data = new FormData(form);
    if (data.get('botcheck')) return;

    const services = data.getAll('services');
    data.delete('services');
    data.set('services', services.length ? services.join(', ') : 'Not specified');

    // Where the lead came from
    const lead = readStored() || source;
    data.set('sent_from_page', window.location.pathname);
    data.set('landing_page', lead.landing_page || window.location.pathname);
    if (lead.referrer) data.set('referrer', lead.referrer);
    for (const key of PARAMS) if (lead[key]) data.set(key, lead[key]);

    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('', '');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.statusText);
      form.reset();
      setStatus("Request sent. You'll get a reply by email soon.", 'ok');
    } catch (err) {
      setStatus(`The request didn't send. Try again, or email ${CONTACT_EMAIL} directly.`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = buttonLabel;
    }
  });
}
