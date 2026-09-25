/**
 * Accessibility check with axe-core on every built page, in light and dark
 * mode (WCAG 2.2 A/AA rules). Run after `npm run build`:
 *
 *   npx playwright install chromium   (once)
 *   npm run qa:a11y
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml' };

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return pages(full);
    return name.endsWith('.html') ? ['/' + relative(DIST, full).replace(/index\.html$/, '')] : [];
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
    res.end();
  }
}).listen(4398);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let violations = 0;
for (const scheme of ['light', 'dark']) {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const path of pages(DIST)) {
      await page.goto(`http://localhost:4398${path}`, { waitUntil: 'load' });
      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      for (const v of result.violations) {
        violations += v.nodes.length;
        console.log(`✗ [${scheme} ${width}px] ${path} — ${v.id} (${v.impact}): ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`     ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1] ?? ''}`);
      }
    }
    await context.close();
  }
}
await browser.close();
server.close();
console.log(violations ? `\n${violations} accessibility issue(s) found.` : 'No axe violations in light or dark mode.');
process.exit(violations ? 1 : 0);
