// Validates that the built plugin is ready to publish to Figma.
// Run with: npm run release (builds, lints and tests first)
import { existsSync, readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const exists = (path) => existsSync(new URL(path, root));
const mtime = (path) => statSync(new URL(path, root)).mtimeMs;

const failures = [];
const passes = [];
const check = (ok, message) => (ok ? passes : failures).push(message);

// Manifest: what Figma reads when publishing
const manifest = JSON.parse(read('manifest.json'));
check(Boolean(manifest.name && manifest.id), 'manifest has a name and the existing plugin id');
check(manifest.api === '1.0.0', 'manifest uses plugin API 1.0.0');
check(manifest.documentAccess === 'dynamic-page', 'manifest uses dynamic-page document access');
check(JSON.stringify(manifest.editorType) === '["figma"]', 'manifest targets the Figma design editor only');
check(
  JSON.stringify(manifest.networkAccess?.allowedDomains) === '["none"]',
  'manifest declares no network access (shown as "No access" on the listing)',
);
check(manifest.main === 'code.js' && exists('code.js'), 'plugin code exists at manifest.main');
check(manifest.ui === 'dist/ui.html' && exists('dist/ui.html'), 'UI exists at manifest.ui');

// Build output must be newer than its sources
if (exists('code.js')) check(mtime('code.js') >= mtime('code.ts'), 'code.js is newer than code.ts');
if (exists('dist/ui.html')) {
  const sources = ['ui/index.html', 'ui/main.js', 'ui/styles.css', 'ui/icons.js'];
  check(sources.every((src) => mtime('dist/ui.html') >= mtime(src)), 'dist/ui.html is newer than ui/ sources');

  const html = read('dist/ui.html');
  check(!/<(script|link)[^>]+(src|href)=["']https?:/i.test(html), 'UI loads no external scripts or stylesheets');
  check(!/sortablejs|cdn\.jsdelivr|unpkg\.com/i.test(html), 'UI contains no CDN references');
  const sizeKb = Math.round(Buffer.byteLength(html) / 1024);
  check(sizeKb < 2048, `UI bundle is ${sizeKb} KB (limit used here: 2048 KB)`);
}

// Plugin code must not ship debug logging
check(/const DEBUG = false;/.test(read('code.ts')), 'DEBUG logging is off');

// Version bookkeeping
const { version } = JSON.parse(read('package.json'));
const changelog = read('CHANGELOG.md');
check(new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\] - \\d{4}-\\d{2}-\\d{2}`, 'm').test(changelog), `CHANGELOG has a dated entry for ${version}`);

// Community listing assets
check(exists('publishing/icon-128.png'), 'publishing/icon-128.png exists');
check(exists('publishing/cover-1920x1080.png'), 'publishing/cover-1920x1080.png exists');
check(exists('publishing/LISTING.md'), 'publishing/LISTING.md exists');

passes.forEach((message) => console.log(`  ✓ ${message}`));
failures.forEach((message) => console.log(`  ✗ ${message}`));

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed. Fix them before publishing.`);
  process.exit(1);
}
console.log(`\nReady to publish Syntaxer ${version} from the Figma desktop app.`);
