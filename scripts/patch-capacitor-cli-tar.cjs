#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'node_modules', '@capacitor', 'cli', 'dist', 'util', 'template.js');

if (!fs.existsSync(templatePath)) {
  console.log('[patch-capacitor-cli-tar] Skip: @capacitor/cli template.js not found.');
  process.exit(0);
}

const source = fs.readFileSync(templatePath, 'utf8');

if (source.includes('Patched for tar v7 compatibility')) {
  console.log('[patch-capacitor-cli-tar] Already patched.');
  process.exit(0);
}

const target = '    await tar_1.default.extract({ file: src, cwd: dir });';
if (!source.includes(target)) {
  console.warn('[patch-capacitor-cli-tar] Target snippet not found; leaving file unchanged.');
  process.exit(0);
}

const replacement = [
  '    // Patched for tar v7 compatibility.',
  '    const tarCompat = tar_1.default ?? tar_1;',
  '    const extract = tarCompat.extract ?? tarCompat.default?.extract;',
  '    if (typeof extract !== "function") {',
  '        throw new TypeError("Capacitor CLI template extractor unavailable");',
  '    }',
  '    await extract({ file: src, cwd: dir });',
].join('\n');

const updated = source.replace(target, replacement);
fs.writeFileSync(templatePath, updated, 'utf8');
console.log('[patch-capacitor-cli-tar] Applied patch to @capacitor/cli template extractor.');
