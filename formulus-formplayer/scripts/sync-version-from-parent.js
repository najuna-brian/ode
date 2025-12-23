const fs = require('fs');
const path = require('path');

/**
 * Generate formplayer/src/version.ts from the RN app's generated src/version.ts.
 * Does NOT modify package.json or lockfiles.
 */

const FORMULUS_VERSION_TS = path.join(__dirname, '..', '..', 'formulus', 'src', 'version.ts');
const OUT_PATH = path.join(__dirname, '..', 'src', 'version.ts');

function extractAppVersion(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/export const APP_VERSION = ['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error('APP_VERSION not found in formulus/src/version.ts');
  }
  return match[1];
}

function writeVersionTs(version) {
  const contents = `/**
 * ⚠️ AUTO-GENERATED — DO NOT EDIT
 * Source: formulus/src/version.ts
 */

export const APP_VERSION = '${version}';
`;
  fs.writeFileSync(OUT_PATH, contents, 'utf8');
  console.log(`Generated formplayer src/version.ts with APP_VERSION=${version}`);
}

function main() {
  const version = extractAppVersion(FORMULUS_VERSION_TS);
  writeVersionTs(version);
}

try {
  main();
} catch (err) {
  console.error(`sync-version-from-parent failed: ${err.message}`);
  process.exit(1);
}

