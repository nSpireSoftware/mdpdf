# nSpire PDAs

> **Progressive Delivery Apps** — lightweight, installable, offline-capable document tools
> that run entirely in the browser. No server. No build step. Just open and use.

🌐 **Portal:** [https://mdpdf-nine.vercel.app/](https://mdpdf-nine.vercel.app/)

---

## Apps

| App | Description | Live URL |
|-----|-------------|----------|
| [📄 mdpdf](src/mdpdf/) | Markdown → PDF with Mermaid diagrams & LaTeX math | [/mdpdf/](https://mdpdf-nine.vercel.app/mdpdf/) |

---

## What is a PDA?

A **Progressive Delivery App** is a PWA (Progressive Web App) that:

- **Runs entirely in the browser** — no server-side processing, no data leaves your device
- **Works offline** — service worker caches all assets after first load
- **Is installable** — add to home screen on mobile and desktop
- **Solves one focused problem** — each app does one thing well

---

## Repository Structure

```
repo-root/
├── AGENTS.md          ← governance rules for all contributors and AI agents
├── index.html         ← portal landing page (served at /)
├── vercel.json        ← URL routing for all apps
├── package.json       ← utility scripts
├── core/              ← canonical PDA templates
│   ├── pwa-template.html
│   ├── sw-template.js
│   └── manifest-template.json
├── scripts/
│   ├── bump-version.js   ← bump SW cache version for a named app
│   └── new-app.js        ← scaffold a new app from core/ templates
└── src/
    └── mdpdf/         ← Markdown to PDF converter
```

---

## Adding a New App

See [AGENTS.md](AGENTS.md) for full governance rules. Quick-start:

```bash
npm run new-app <appname>
```

This scaffolds `src/<appname>/` from `core/` templates. Then:

1. Implement your app in `src/<appname>/`
2. Add rewrites to `vercel.json`
3. Add a card to the portal `index.html`
4. Add a row to this `README.md`
5. Add the app to the GitHub Actions version-bump matrix

---

## Development

No build step. Open any app's `index.html` directly in a browser, or serve the repo root
with any static file server:

```bash
npx serve .
# then open http://localhost:3000/mdpdf/
```

---

## Deployment

Vercel auto-deploys on every push to `main`. No build command needed — Vercel serves
static files directly. URL routing is handled by `vercel.json` rewrites.

---

## License

MIT
