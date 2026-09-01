const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const metroRoot = path.join(projectRoot, 'node_modules', 'metro');
const targetFile = path.join(
  metroRoot,
  'private',
  'lib',
  'TerminalReporter.js'
);
const sourceFile = path.join(metroRoot, 'src', 'lib', 'TerminalReporter.js');

if (!fs.existsSync(metroRoot)) {
  console.log('[postinstall] metro not found, skipping reporter compatibility fix.');
  process.exit(0);
}

if (fs.existsSync(targetFile)) {
  console.log('[postinstall] metro private TerminalReporter already exists.');
  process.exit(0);
}

if (!fs.existsSync(sourceFile)) {
  console.warn(
    '[postinstall] metro src TerminalReporter not found; cannot create compatibility shim.'
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(targetFile), { recursive: true });
fs.writeFileSync(
  targetFile,
  'module.exports = require("../../src/lib/TerminalReporter");\n',
  'utf8'
);

console.log('[postinstall] created metro/private/lib/TerminalReporter.js compatibility shim.');
