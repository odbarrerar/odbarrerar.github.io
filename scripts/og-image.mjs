/**
 * Generates the social-sharing image (public/og/default.png, 1200×630)
 * from src/data/profile.yaml, the site fonts and, if present, the portrait
 * in src/assets/images/. Re-run after changing your name, position or photo:
 *
 *   npx playwright install chromium   (once)
 *   node scripts/og-image.mjs
 */
import { chromium } from 'playwright';
import { parse } from 'yaml';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const profile = parse(readFileSync(`${root}src/data/profile.yaml`, 'utf8'));
const themes = parse(readFileSync(`${root}src/data/themes.yaml`, 'utf8'));

const fonts = `${root}node_modules/@fontsource-variable`;
const portrait = ['jpg', 'jpeg', 'png', 'webp']
  .map((ext) => `${root}src/assets/images/portrait.${ext}`)
  .find((p) => existsSync(p));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Serif; src: url(file://${fonts}/newsreader/files/newsreader-latin-opsz-normal.woff2); font-weight: 200 800; }
@font-face { font-family: Sans; src: url(file://${fonts}/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2); font-weight: 400 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #faf8f3; color: #1c1a17; font-family: Sans; display: flex; }
.main { flex: 1; padding: 72px 64px 60px 80px; display: flex; flex-direction: column; }
.eyebrow { font-size: 19px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: #8a2a1d; }
h1 { margin-top: 26px; font-family: Serif; font-weight: 380; font-size: 94px; line-height: .98; letter-spacing: -0.028em; font-variation-settings: 'opsz' 72; }
.aff { margin-top: 30px; font-size: 26px; line-height: 1.35; color: #3a3833; }
.rule { width: 72px; height: 2px; background: #8a2a1d; margin-top: 34px; }
.themes { margin-top: 24px; font-size: 20px; line-height: 1.5; color: #57524a; }
.url { margin-top: auto; font-size: 20px; letter-spacing: .02em; color: #6d675d; }
.photo { width: 380px; height: 630px; background: #f2eee6 center 30% / cover no-repeat; flex-shrink: 0; }
.mono { width: 380px; display: grid; place-items: center; background: #8a2a1d; color: #faf8f3; font-family: Serif; font-size: 150px; font-weight: 420; letter-spacing: -0.02em; }
</style></head><body>
<div class="main">
  <p class="eyebrow">${esc(profile.position)}</p>
  <h1>${esc(profile.name).replace(' Rodríguez', '<br>Rodríguez')}</h1>
  <p class="aff">${esc(profile.institution)}<br>${esc(profile.department.replace(/\s*\(.*\)$/, ''))}</p>
  <div class="rule"></div>
  <p class="themes">${themes.slice(0, 4).map((t) => esc(t.short)).join(' · ')}</p>
  <p class="url">odbarrerar.github.io</p>
</div>
${portrait ? `<div class="photo" style="background-image:url(file://${portrait})"></div>` : '<div class="mono">OB</div>'}
</body></html>`;

mkdirSync(`${root}public/og`, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Load from a file:// URL so the local font files are allowed to load
const tmp = join(tmpdir(), `og-${Date.now()}.html`);
writeFileSync(tmp, html);
await page.goto(`file://${tmp}`, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
rmSync(tmp);
await page.screenshot({ path: `${root}public/og/default.png` });
await browser.close();
console.log(`Wrote public/og/default.png${portrait ? ' (with portrait)' : ''}`);
