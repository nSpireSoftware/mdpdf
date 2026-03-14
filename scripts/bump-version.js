#!/usr/bin/env node
/**
 * bump-version.js — Bumps the SW cache version for a single named app.
 *
 * Usage:
 *   node scripts/bump-version.js <appname>
 *   npm run bump <appname>
 *
 * Example:
 *   npm run bump mdpdf
 *
 * What it does:
 *   1. Reads src/<appname>/sw.js
 *   2. Finds the CACHE_NAME constant (e.g. 'md-to-pdf-v9')
 *   3. Increments N by 1
 *   4. Writes the updated file back
 *   5. Prints the old and new version strings
 *
 * Only the specified app's sw.js is touched. Other apps are never affected.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const appName = process.argv[2];

if (!appName) {
  console.error('Usage: node scripts/bump-version.js <appname>');
  console.error('Example: node scripts/bump-version.js mdpdf');
  process.exit(1);
}

const swPath = path.join(__dirname, '..', 'src', appName, 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error(`Error: Service worker not found at ${swPath}`);
  console.error(`Does src/${appName}/ exist and contain sw.js?`);
  process.exit(1);
}

const content = fs.readFileSync(swPath, 'utf8');

// Match: const CACHE_NAME = 'something-vN';  (single or double quotes)
const cacheVersionRegex = /^(const CACHE_NAME\s*=\s*['"])(.+?)(-v)(\d+)(['"];)$/m;
const match = content.match(cacheVersionRegex);

if (!match) {
  console.error(`Error: Could not find CACHE_NAME pattern in ${swPath}`);
  console.error('Expected format: const CACHE_NAME = \'some-slug-vN\';');
  process.exit(1);
}

const prefix = match[1];    // const CACHE_NAME = '
const slug   = match[2];    // some-slug
const dash   = match[3];    // -v
const oldN   = parseInt(match[4], 10);
const suffix = match[5];    // ';

const newN = oldN + 1;
const oldVersion = `${slug}${dash}${oldN}`;
const newVersion = `${slug}${dash}${newN}`;

const updated = content.replace(
  cacheVersionRegex,
  `${prefix}${slug}${dash}${newN}${suffix}`
);

fs.writeFileSync(swPath, updated, 'utf8');

console.log(`✅ Bumped ${appName} SW cache version:`);
console.log(`   ${oldVersion} → ${newVersion}`);
