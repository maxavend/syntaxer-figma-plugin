// Renders the Figma Community listing images from the built UI.
// Run with: npm run assets   (needs `npm run build` first and Google Chrome;
// set CHROME_PATH if Chrome isn't in the default macOS location)
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = `${root}publishing/`;
const source = `${out}source/`;
const tmp = `${out}.tmp/`;
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(`${root}dist/ui.html`)) {
  console.error('dist/ui.html not found. Run `npm run build` first.');
  process.exit(1);
}
if (!existsSync(chrome)) {
  console.error(`Chrome not found at ${chrome}. Set CHROME_PATH.`);
  process.exit(1);
}

rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

// The built UI plus a mock of the plugin side
const ui = readFileSync(`${root}dist/ui.html`, 'utf8');
const mock = readFileSync(`${source}mock.js`, 'utf8');
writeFileSync(`${tmp}harness.html`, ui.replace('</body>', `<script>${mock}</script></body>`));
copyFileSync(`${source}frame.html`, `${tmp}frame.html`);
copyFileSync(`${source}slide.html`, `${tmp}slide.html`);
copyFileSync(`${root}assets/syntaxer-logo.png`, `${tmp}logo.png`);

function screenshot(page, file, width, height, scale, extraArgs = []) {
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    '--virtual-time-budget=5000',
    `--screenshot=${file}`,
    ...extraArgs,
    `file://${tmp}${page}`,
  ], { stdio: 'ignore' });
  console.log(`  ${file.replace(root, '')}`);
}

// 1. Plugin screenshots (320×640 window at 2x)
const shots = {
  dark: 'theme=dark',
  light: 'theme=light',
  naming: 'theme=dark&open=naming',
  levels: 'theme=dark&scroll=h-structure',
  preview: 'theme=dark&scroll=h-variables',
};
console.log('Plugin screenshots');
for (const [name, query] of Object.entries(shots)) {
  screenshot(`frame.html?h=640&${query}`, `${tmp}${name}.png`, 320, 640, 2);
}

// 2. Cover and carousel (1920×1080)
console.log('Listing images');
screenshot('slide.html?variant=cover', `${out}cover-1920x1080.png`, 1920, 1080, 1);
['presets', 'levels', 'preview'].forEach((variant, i) => {
  screenshot(`slide.html?variant=${variant}`, `${out}carousel-${i + 1}-${variant}.png`, 1920, 1080, 1);
});

// 3. Icon (128×128, transparent corners)
writeFileSync(
  `${tmp}icon.html`,
  '<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:128px;height:128px}</style><img src="logo.png">',
);
console.log('Icon');
screenshot('icon.html', `${out}icon-128.png`, 128, 128, 1, ['--default-background-color=00000000']);

rmSync(tmp, { recursive: true, force: true });
