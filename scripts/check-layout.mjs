/**
 * Layout check: loads every built page at phone widths and reports any
 * element that sticks out horizontally (which would cause sideways scrolling
 * or clipped content). Run after `npm run build` with `npm run qa:layout`.
 */
import { chromium } from 'playwright';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json' };

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    // Skip redirect stubs (old addresses that forward to a new page)
    if (!name.endsWith('.html') || readFileSync(full, 'utf8').includes('http-equiv="refresh"')) return [];
    return ['/' + relative(DIST, full).replace(/index\.html$/, '')];
  });
}

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0]);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(DIST, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(4399);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let problems = 0;
for (const width of [320, 360, 390, 768, 1024, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();
  for (const path of pages(DIST)) {
    await page.goto(`http://localhost:4399${path}`, { waitUntil: 'load' });
    const offenders = await page.evaluate(() => {
      // Test the expanded state of disclosure widgets (e.g. "Cite")
      document.querySelectorAll('details').forEach((d) => (d.open = true));
      const vw = document.documentElement.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1) continue;
        // Ignore content inside horizontally scrollable containers
        let p = el.parentElement, scrollable = false;
        while (p && p !== document.body) {
          const s = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && p.getBoundingClientRect().right <= vw + 1) { scrollable = true; break; }
          p = p.parentElement;
        }
        if (el.closest('dialog:not([open])') || scrollable) continue;
        out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} → ${Math.round(r.right - vw)}px`);
      }
      return out.slice(0, 5);
    });
    if (offenders.length) {
      problems++;
      console.log(`✗ ${width}px ${path}\n   ${offenders.join('\n   ')}`);
    }
  }
  await context.close();
}
await browser.close();
server.close();
console.log(problems ? `\n${problems} page/width combinations overflow.` : 'No horizontal overflow at 320–1440px.');
process.exit(problems ? 1 : 0);
