# AGENTS.md — Repository Governance

This document is the single source of truth for all AI agents, contributors, and automated
tools working in this repository. All other guidance files (`.clinerules`, `CLAUDE.md`, etc.)
defer entirely to this document.

---

## Purpose

This repository delivers multiple **Progressive Delivery Apps (PDAs)** — lightweight,
installable, offline-capable browser applications built as Progressive Web Apps (PWAs).
Each PDA is a self-contained app that solves a focused document-processing problem directly
in the browser, with no server-side logic.

The first PDA is **mdpdf** — a Markdown-to-PDF converter with Mermaid diagram and LaTeX
math support.

---

## Repository Layout

```
repo-root/
├── AGENTS.md                    ← this file (master governance)
├── .clinerules                  ← defers to AGENTS.md
├── CLAUDE.md                    ← defers to AGENTS.md
├── README.md                    ← repo-level portal page (lists all apps)
├── index.html                   ← Vercel root: portal landing page + redirect shim
├── vercel.json                  ← URL routing for all apps
├── package.json                 ← utility scripts (bump, scaffold, etc.)
├── core/                        ← canonical PDA templates (the "PDA essence")
│   ├── pwa-template.html        ← full PWA shell template
│   ├── sw-template.js           ← service worker template
│   └── manifest-template.json  ← web app manifest template
├── scripts/
│   ├── bump-version.js          ← bumps SW cache version for a single named app
│   └── new-app.js               ← scaffolds a new app from core/ templates
└── src/
    ├── shared/                  ← cross-app services (added when 2+ apps exist)
    │   ├── hub.js               ← SharedWorker: service registry + message routing
    │   └── opfs.js              ← shared OPFS helpers (namespaced path utilities)
    ├── mdpdf/                   ← first PDA
    │   ├── README.md
    │   ├── index.html
    │   ├── app.js
    │   ├── manifest.json
    │   ├── sw.js
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   └── icon.svg
    └── {appname}/               ← future PDAs follow the same pattern
```

---

## Inter-App Communication

### Architecture: SharedWorker + OPFS

PDAs communicate via a **SharedWorker service hub** (`src/shared/hub.js`) that acts as a
message router and service registry, with **OPFS (Origin Private File System)** as the data
plane. This is the canonical inter-app pattern for all PDAs in this repository.

```
App A                SharedWorker (/shared/hub.js)               App B
  │── postMessage ──►│                                             │
  │  { action,        │── forward to provider ────────────────────►│
  │    service,        │                                            │ reads OPFS
  │    inputPath,      │                                            │ does work
  │    outputPath }    │                                            │ writes OPFS
  │                   │◄── { status: 'done', outputPath } ─────────│
  │◄── postMessage ───│
```

**Key principles:**

1. **Messages are envelopes, not data carriers.** Messages contain only JSON metadata
   (`action`, `service`, `inputPath`, `outputPath`, `replyTo`). Binary data and large
   payloads are never passed through messages — they travel exclusively via OPFS paths.

2. **OPFS paths must be namespaced.** Every app must root its OPFS operations under a
   directory named after its own app slug, e.g.:
   ```js
   const root = await navigator.storage.getDirectory();
   const appDir = await root.getDirectoryHandle('mdpdf', { create: true });
   ```
   Never read or write to the OPFS root directly.

3. **Apps register their services with the hub on startup.** If an app provides callable
   services (e.g., `md-to-pdf`, `parse-csv`), it must announce them:
   ```js
   const hub = new SharedWorker('/shared/hub.js');
   hub.port.start();
   hub.port.postMessage({
     action: 'register',
     app: 'mdpdf',
     services: ['md-to-pdf']
   });
   ```

4. **The hub is at `/shared/hub.js` — a shared origin-root path.** All apps connect to
   the same URL regardless of their own path. Vercel routes `/shared/:path*` →
   `src/shared/:path*`.

5. **Build `src/shared/` only when two or more apps exist.** Do not create speculative
   shared infrastructure. The SharedWorker is added when a real integration need arises.

6. **Services must tolerate the target app being closed.** The hub cannot wake a closed
   app. If the target is unavailable, strategies include:
   - Write a queued task to the target app's OPFS mailbox directory; it reads on next open.
   - Return an error to the caller indicating the service is not currently available.

### Vercel routing for shared services

When `src/shared/` is created, add to `vercel.json`:
```json
{ "source": "/shared/:path*", "destination": "/src/shared/:path*" }
```

---

## Rules for All Apps

### 1. Directory Location
- **All app source code lives in `src/{appname}/`**. No app files belong at the repo root.
- The `{appname}` must be a lowercase, hyphen-separated slug (e.g., `mdpdf`, `csv-viewer`).

### 2. Mandatory App Files
Every app directory **must** contain:
| File | Purpose |
|------|---------|
| `README.md` | App documentation; must include a link to the live URL |
| `index.html` | Main app shell derived from `core/pwa-template.html` |
| `app.js` | App-specific logic |
| `manifest.json` | Web App Manifest derived from `core/manifest-template.json` |
| `sw.js` | Service worker derived from `core/sw-template.js` |
| `icon-192.png` | App icon 192×192 |
| `icon-512.png` | App icon 512×512 |
| `icon.svg` | Source SVG icon |

### 3. Templates Are the Canonical Pattern
- New apps **must** be scaffolded from `core/` templates using `npm run new-app <appname>`.
- `core/pwa-template.html`, `core/sw-template.js`, and `core/manifest-template.json`
  represent the definitive PDA design patterns. When the pattern needs updating, update the
  template first, then propagate to apps as appropriate.
- Templates contain `{{PLACEHOLDER}}` markers for app-specific values.

### 4. Service Worker Version Management
- Each app has its **own** SW cache name string, e.g., `'md-to-pdf-v9'`.
- **Only bump the SW cache version for the app that changed.** Never bump other apps'
  versions as a side effect.
- The version is bumped automatically by the GitHub Actions workflow on push to `main`
  whenever files under `src/{appname}/` have changed.
- To bump manually: `npm run bump <appname>`
- The version string format is: `'{app-slug}-vN'` where N is an integer.

### 5. URL Routing (Vercel)
- Each app is served at `/{appname}/` via Vercel rewrites defined in `vercel.json`.
- The app is stored at `src/{appname}/` on disk; Vercel rewrites the URL transparently.
- Relative paths within an app (`./manifest.json`, `./sw.js`, `./icon-192.png`) resolve
  correctly because the browser sees the `/{appname}/` URL path.
- The service worker registered at `/{appname}/sw.js` has scope `/{appname}/` and only
  intercepts requests for that app — it cannot and must not intercept other apps' requests.
- When adding a new app, add its rewrite rules to `vercel.json`.

### 6. Adding a New App
To add a new PDA to this repository:
1. Run `npm run new-app <appname>` to scaffold from templates.
2. Implement the app in `src/<appname>/`.
3. Add rewrite rules to `vercel.json`:
   ```json
   { "source": "/<appname>",        "destination": "/src/<appname>/index.html" },
   { "source": "/<appname>/:path*", "destination": "/src/<appname>/:path*" }
   ```
4. Add the app to the portal `index.html` (root) and root `README.md`.
5. Add the app to the GitHub Actions matrix in `.github/workflows/version-bump.yml`.
6. Ensure `src/<appname>/README.md` contains the live URL `https://mdpdf-nine.vercel.app/<appname>/`.

### 7. Per-App README
- Each `src/{appname}/README.md` is the **app's public-facing documentation**.
- It must include: app name, description, feature list, link to live URL, and basic usage.
- This file surfaces on the GitHub source view for the app directory.

### 8. Root Files
- `index.html` (root): Portal/landing page listing all apps. Also contains a short-lived JS
  redirect shim for users who had the old root-URL PWA installation (redirects to `/mdpdf/`).
  This shim should be removed once the old SW registration has had time to expire (~3 months).
- `README.md` (root): Repo-level portal. Lists all PDAs with descriptions and links.
- `vercel.json`: Managed centrally; all app teams add their routes here.
- `package.json`: Managed centrally; scripts apply to all apps.

### 9. No Build Toolchain for Apps
- Apps are pure HTML/CSS/JS with no bundler, transpiler, or framework dependencies.
- All libraries are loaded from CDN URLs (cached by the service worker for offline use).
- This is a deliberate architectural choice — keep deployment simple and Vercel-native.

### 10. Commit Hygiene
- The GitHub Actions version-bump bot commits with the message:
  `chore: bump {appname} SW cache version to vN`
- These commits must **not** trigger another version bump. The workflow skips runs where
  `github.actor` is `github-actions[bot]`.
- Human commits to `src/{appname}/` will trigger a bump for that app only.

---

## Vercel Deployment

- Vercel is configured to auto-deploy on every push to `main`.
- No build command is needed — Vercel serves the repo directory as static files.
- `vercel.json` rewrites map `/{appname}/*` → `src/{appname}/*` transparently.
- The root `/` serves `index.html` (the portal page) directly from the repo root.
- There is no `vercel.json` `build` step; `rewrites` only.

---

## Governance

- This `AGENTS.md` file takes precedence over all other guidance in the repo.
- `.clinerules` and `CLAUDE.md` exist solely to direct AI agents to read this file.
- When in doubt about any structural or process question, refer to this document.
- To propose a change to these rules, open a PR that updates `AGENTS.md` as the primary
  change, with rationale in the PR description.
