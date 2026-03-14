# mdpdf — Markdown to PDF Converter

Convert Markdown to PDF with Mermaid diagrams and LaTeX math support.
A fully offline-capable, installable Progressive Web App (PWA).

🌐 **Live:** [https://mdpdf-nine.vercel.app/mdpdf/](https://mdpdf-nine.vercel.app/mdpdf/)

---

## Features

### 💻 Core Functionality
- **Markdown to PDF Conversion** — Convert Markdown files to beautifully formatted PDF documents using the browser's print-to-PDF capability
- **Live Preview** — Real-time side-by-side preview updates as you type (300ms debounced)
- **Drag & Drop** — Drag Markdown files directly into the browser for instant editing (supports `.md`, `.markdown`, `.txt`)
- **Copy HTML** — Copy rendered HTML to clipboard with rich formatting; includes optional SVG-to-PNG conversion for better Microsoft Word compatibility
- **Clear Editor** — One-click clearing of the markdown input

### 📊 Advanced Rendering
- **Mermaid Diagrams** — Built-in support for flowcharts, sequence diagrams, class diagrams, Gantt charts, state diagrams, ERDs, and more
- **LaTeX Math** — Full math support using KaTeX:
  - Inline math: `$...$` or `\(...\)`
  - Block math: `$$...$$` or `\[...\]`
- **SVG to PNG Conversion** — Optional toggle to convert SVG diagrams to PNG for better Word compatibility

### 📱 Progressive Web App
- **Works Offline** — Full functionality without an internet connection after first load
- **Installable** — Add to home screen on mobile and desktop
- **File Association** — Open `.md` files directly from your OS (File Handling API)
- **Update Notifications** — Automatic prompts when new versions are available

---

## Usage

### Online
Visit [https://mdpdf-nine.vercel.app/mdpdf/](https://mdpdf-nine.vercel.app/mdpdf/)

### Install
1. Open the app in Chrome or Edge
2. Click **"Install App"** in the banner, or use the browser menu → Install

### Open Markdown Files
- Drag `.md` files into the browser window
- Use "Open with" from your file manager (after installation)

### Export
- **Download PDF**: Click the download button → browser print dialog → Save as PDF
- **Copy HTML**: Copy rendered HTML with optional SVG-to-PNG conversion for Word

---

## Tech Stack

| Library | Purpose | Version |
|---------|---------|---------|
| [marked](https://marked.js.org/) | Markdown parser | 9.1.6 |
| [Mermaid](https://mermaid.js.org/) | Diagram rendering | 10.6.1 |
| [KaTeX](https://katex.org/) | Math typesetting | 0.16.9 |
| [html2canvas](https://html2canvas.hertzen.com/) | SVG-to-PNG conversion | 1.4.1 |

All libraries are loaded from CDN and cached by the service worker for offline use.

---

## File Structure

```
src/mdpdf/
├── index.html      # Main application shell + all CSS
├── app.js          # Application logic (modular, IIFE)
├── manifest.json   # PWA manifest with file handlers
├── sw.js           # Service worker (cache-first, versioned)
├── icon-192.png    # App icon 192×192
├── icon-512.png    # App icon 512×512
└── icon.svg        # SVG icon source
```

---

## Service Worker

Cache name: `md-to-pdf-vN` (N incremented automatically on each deployment that changes app files).

Strategy: **cache-first** for all static assets; dynamic caching for KaTeX WOFF2 fonts.

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome / Edge 90+ | Full (including File Handling API) |
| Firefox 93+ | PWA install limited; File Handling not supported |
| Safari 16.4+ | File Handling not supported |

---

## License

MIT
