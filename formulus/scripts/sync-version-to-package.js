const fs = require('fs');
const path = require('path');

/**
 * Generate src/version.ts from native source of truth (Android versionName).
 * Optional: warn if iOS MARKETING_VERSION differs.
 * Does NOT touch package.json or lockfiles.
 */

const ROOT = path.join(__dirname, '..');

function readFileSafe(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getAndroidVersionName() {
  const gradlePath = path.join(ROOT, 'android/app/build.gradle');
  const content = readFileSafe(gradlePath);
  const match = content.match(/versionName\s*=\s*["']([^"']+)["']/);
  if (!match) {
    throw new Error('versionName not found in android/app/build.gradle');
  }
  return match[1];
}

function getIosMarketingVersion() {
  const pbxPath = path.join(ROOT, 'ios/Formulus.xcodeproj/project.pbxproj');
  if (!fs.existsSync(pbxPath)) return null;
  const content = readFileSafe(pbxPath);
  const match = content.match(/MARKETING_VERSION\s*=\s*([0-9A-Za-z.-]+);/);
  return match ? match[1] : null;
}

function writeVersionTs(version) {
  const outPath = path.join(ROOT, 'src/version.ts');
  const contents = `/**
 * ⚠️ AUTO-GENERATED — DO NOT EDIT
 * Source: android/app/build.gradle versionName
 */

export const APP_VERSION = '${version}';
`;
  fs.writeFileSync(outPath, contents, 'utf8');
  console.log(`Generated src/version.ts with APP_VERSION=${version}`);
}

function main() {
  const androidVersion = getAndroidVersionName();
  const iosVersion = getIosMarketingVersion();

  if (iosVersion && iosVersion !== androidVersion) {
    console.warn(
      `Warning: iOS MARKETING_VERSION (${iosVersion}) differs from Android versionName (${androidVersion}). Align them to avoid mismatches.`,
    );
  }

  writeVersionTs(androidVersion);
}

try {
  main();
} catch (err) {
  console.error(`sync-version-to-package failed: ${err.message}`);
  process.exit(1);
}
