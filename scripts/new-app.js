#!/usr/bin/env node
/**
 * new-app.js — Scaffold a new PDA from core/ templates.
 *
 * Usage:
 *   node scripts/new-app.js <appname>
 *   npm run new-app <appname>
 *
 * Example:
 *   npm run new-app csv-viewer
 *
 * What it does:
 *   1. Creates src/<appname>/
 *   2. Copies core/pwa-template.html  → src/<appname>/index.html
 *   3. Copies core/sw-template.js     → src/<appname>/sw.js
 *   4. Copies core/manifest-template.json → src/<appname>/manifest.json
 *   5. Creates a stub src/<appname>/app.js
 *   6. Creates a stub src/<appname>/README.md
 *   7. Replaces {{PLACEHOLDER}} values with sensible defaults for the new app
 *
 * After scaffolding:
 *   - Add icon-192.png, icon-512.png, icon.svg to src/<appname>/
 *   - Implement your app in src/<appname>/app.js
 *   - Add routes to vercel.json
 *   - Add a card to the root index.html portal
 *   - Add a row to README.md
 *   - Add the app to .github/workflows/version-bump.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const appName = process.argv[2];

if (!appName) {
  console.error('Usage: node scripts/new-app.js <appname>');
  console.error('Example: node scripts/new-app.js csv-viewer');
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(appName)) {
  console.error('Error: appname must be lowercase letters, digits, and hyphens only.');
  console.error('Example: csv-viewer, md-editor, pdf-tools');
  process.exit(1);
}

const repoRoot  = path.join(__dirname, '..');
const coreDir   = path.join(repoRoot, 'core');
const targetDir = path.join(repoRoot, 'src', appName);

if (fs.existsSync(targetDir)) {
  console.error(`Error: src/${appName}/ already exists.`);
  process.exit(1);
}

// Derive human-readable names from slug
const appTitle     = appName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const appShortName = appTitle.substring(0, 12);  // PWA short names should be short

const replacements = {
  '{{APP_SLUG}}':        appName,
  '{{APP_NAME}}':        appTitle,
  '{{APP_FULL_NAME}}':   appTitle,
  '{{APP_SHORT_NAME}}':  appShortName,
  '{{APP_DESCRIPTION}}': `${appTitle} — a browser-native document app`,
  '{{APP_ICON}}':        '🚀',
  '{{THEME_COLOR}}':     '#6366f1',
  '{{FILE_MIME_TYPE}}':  'text/plain',
  '{{FILE_EXTENSION}}':  '.txt',
};

function applyReplacements(text) {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}

fs.mkdirSync(targetDir, { recursive: true });

// Copy and fill templates
const templates = [
  { src: 'pwa-template.html',      dest: 'index.html' },
  { src: 'sw-template.js',         dest: 'sw.js'      },
  { src: 'manifest-template.json', dest: 'manifest.json' },
];

for (const { src, dest } of templates) {
  const templatePath = path.join(coreDir, src);
  if (!fs.existsSync(templatePath)) {
    console.warn(`Warning: core/${src} not found — skipping ${dest}`);
    continue;
  }
  const raw     = fs.readFileSync(templatePath, 'utf8');
  const filled  = applyReplacements(raw);
  fs.writeFileSync(path.join(targetDir, dest), filled, 'utf8');
}

// Stub app.js
fs.writeFileSync(path.join(targetDir, 'app.js'), `// ${appTitle} — Application Logic
// Implement your app here. All code is in an IIFE to avoid global scope pollution.

(function () {
  'use strict';

  function init() {
    // TODO: implement ${appTitle}
    console.log('${appTitle} initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`, 'utf8');

// Stub README.md
fs.writeFileSync(path.join(targetDir, 'README.md'), `# ${appTitle}

> TODO: write a short description of this app.

🌐 **Live:** [https://mdpdf-nine.vercel.app/${appName}/](https://mdpdf-nine.vercel.app/${appName}/)

---

## Features

- TODO

---

## Usage

TODO

---

## License

MIT
`, 'utf8');

console.log(`\n✅ Scaffolded src/${appName}/`);
console.log('\nFiles created:');
['index.html', 'app.js', 'sw.js', 'manifest.json', 'README.md'].forEach(f => {
  console.log(`   src/${appName}/${f}`);
});

console.log('\nNext steps:');
console.log(`  1. Add icon-192.png, icon-512.png, icon.svg to src/${appName}/`);
console.log(`  2. Implement the app in src/${appName}/app.js`);
console.log(`  3. Add to vercel.json:`);
console.log(`       { "source": "/${appName}",        "destination": "/src/${appName}/index.html" },`);
console.log(`       { "source": "/${appName}/:path*", "destination": "/src/${appName}/:path*" }`);
console.log(`  4. Add a card to the root index.html portal`);
console.log(`  5. Add a row to README.md`);
console.log(`  6. Add "${appName}" to the matrix in .github/workflows/version-bump.yml`);
