# mdpdf

Convert Markdown to PDF with Mermaid diagrams and LaTeX math support. A fully offline-capable, installable Progressive Web App (PWA).

## Features

### 💻 Core Functionality
- **Markdown to PDF Conversion** — Convert Markdown files to beautifully formatted PDF documents with a single click
- **Live Preview** — Real-time side-by-side preview updates as you type
- **Drag & Drop** — Drag Markdown files directly into the browser for instant editing
- **Copy HTML** — Copy rendered HTML to clipboard with rich formatting

### 📊 Advanced Rendering
- **Mermaid Diagrams** — Built-in support for flowcharts, sequence diagrams, class diagrams, and more
- **LaTeX Math** — Full math support using KaTeX for beautiful equations and formulas

### 📱 Progressive Web App
- **Works Offline** — Full functionality without an internet connection after first load
- **Installable** — Add to home screen on mobile and desktop
- **File Association** — Open `.md` files directly from your operating system (File Handling API)
- **Update Notifications** — Automatic prompts when new versions are available

## Implementation

### Tech Stack

| Library | Purpose |
|---------|---------|
| [marked](https://marked.js.org/) | Markdown parser and compiler |
| [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) | Client-side PDF generation |
| [Mermaid](https://mermaid.js.org/) | Diagram and flowchart rendering |
| [KaTeX](https://katex.org/) | Fast math typesetting |

### Architecture

```
mdpdf/
├── index.html      # Main application with embedded CSS/JS
├── manifest.json   # PWA manifest with file handlers
├── sw.js           # Service worker for offline caching
├── icon-*.png      # Application icons
└── README.md       # Documentation
```

### Service Worker (`sw.js`)

The service worker implements a "cache-first" strategy for offline support:

- **Install Phase**: Caches static assets including CDN libraries for offline use
- **Activate Phase**: Cleans up old cache versions
- **Fetch Phase**: Serves from cache when available, falls back to network
- **Font Caching**: Dynamically caches KaTeX fonts as they're requested

### Key Implementation Details

**PDF Generation**: Uses html2pdf.js with custom configuration for reliable rendering:
- High-resolution canvas rendering (scale: 2)
- A4 page format with margins
- Automatic page breaks
- Mermaid SVG scaling for proper PDF output

**PWA Install Flow**: 
1. Listens for `beforeinstallprompt` event
2. Shows custom install banner
3. Handles user choice and hides banner when installed

**File Handling**: Implements the File Handling API allowing users to:
- Right-click a `.md` file and "Open with" the app
- Double-click Markdown files on desktop (when installed as PWA)

**Update Mechanism**: 
- Service worker checks for updates on each page load
- Shows a banner prompting users to refresh when updates are available

## Usage

### Online
Simply open `index.html` in a modern browser or visit the hosted version.

### Install Locally
1. Open the app in your browser
2. Click **"Install App"** in the banner (Chrome/Edge)
3. Or use the browser menu → Install/PWA option

### Open Markdown Files
After installation, you can:
- Drag `.md` files into the browser window
- Use "Open with" from your file manager
- Double-click Markdown files (on supported platforms)

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 93+ (some PWA features limited)
- Safari 16.4+ (File Handling API not supported)

## License

MIT License
