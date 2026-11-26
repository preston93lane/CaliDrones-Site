// Service and area pages: footer year and the quote form. No 3D stage here, so these pages stay light.
import { initQuoteForm } from './quote-form.js';

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
initQuoteForm(document.getElementById('quote-form'));
