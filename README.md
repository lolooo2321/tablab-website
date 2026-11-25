# TabLab website

Static site: `index.html`, `css/`, `js/`, `assets/`, and the three concept sites in `work/`.

## Run it locally
The live previews need a web server (they do not work from a double-clicked file). Node is all you need, no install step:

```
cd C:\Users\38591\Desktop\TabLabweb\site
npm run dev
```
Then open http://127.0.0.1:5520/ (if that port is busy it takes the next free one and prints it). Saving a file in `index.html`, `css/`, `js/` or `assets/` reloads the page. Ctrl+C stops it.

## Still to fill in
- **Email:** `index.html`, the `data-fill="email"` span in the contact section (and its Croatian text `contact.email-soon` in `js/i18n.js`). Replace the span with a `mailto:` link.
- **Phone:** the `data-fill="phone"` span, same as above.
- **Contact form:** put the form service URL (Formspree or similar) in `data-endpoint=""` on the `<form>`. Until then the form checks the fields and says that nothing was sent.

## Text
English is written in `index.html`. Croatian is in `js/i18n.js` (same keys as the `data-i18n` attributes).

## Concept sites
- `work/fashion/`: rebuilt from `stranicapremiumroba` with relative paths (`vite build --base=./`, then `/data/` and `/images/` paths made relative).
- `work/streetwear/`: copy of `stranica roba/dist` (54 MB of product images; it loads only when its tab is opened).
- `work/crypto/`: copy of `stranicacrypto`.

If you change a concept site, rebuild or recopy it into `work/`.
