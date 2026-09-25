/**
 * Link checker for the built site (run `npm run build` first).
 *
 *   npm run qa:links              internal links, assets and #anchors
 *   npm run qa:links -- --external   also requests every external link
 *
 * Internal problems always fail the run. External links that cannot be
 * reached are reported; many publishers block automated requests (403/429),
 * so those are listed as warnings rather than errors.
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const SITE = 'https://odbarrerar.github.io';
const checkExternal = process.argv.includes('--external');

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

const pages = htmlFiles(DIST);
const idsByFile = new Map();
const getIds = (file) => {
  if (!idsByFile.has(file)) {
    const html = readFileSync(file, 'utf8');
    idsByFile.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idsByFile.get(file);
};

/** Maps a site path to the file that serves it (GitHub Pages rules). */
function resolveFile(pathname) {
  const clean = decodeURIComponent(pathname);
  const candidates = clean.endsWith('/')
    ? [join(DIST, clean, 'index.html')]
    : [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, `${clean}.html`)];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

const errors = [];
const external = new Map(); // url -> Set(pages)

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const pagePath = '/' + relative(DIST, file).replace(/index\.html$/, '');
  const refs = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0])),
  ];
  for (const raw of refs) {
    const ref = raw.replace(/&amp;/g, '&');
    if (/^(mailto:|tel:|data:|javascript:)/.test(ref)) continue;
    let url;
    try {
      url = new URL(ref, `${SITE}${pagePath}`);
    } catch {
      errors.push(`${pagePath}: malformed link "${ref}"`);
      continue;
    }
    if (url.origin !== SITE) {
      if (!external.has(url.href)) external.set(url.href, new Set());
      external.get(url.href).add(pagePath);
      continue;
    }
    const target = resolveFile(url.pathname);
    if (!target) {
      errors.push(`${pagePath}: broken internal link → ${url.pathname}`);
      continue;
    }
    if (url.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      if (id !== 'top' && !getIds(target).has(id)) {
        errors.push(`${pagePath}: missing anchor → ${url.pathname}${url.hash}`);
      }
    }
  }
}

console.log(`Checked ${pages.length} pages.`);
if (errors.length) {
  console.log(`\n✗ ${errors.length} internal problem(s):`);
  for (const e of [...new Set(errors)]) console.log(`  ${e}`);
} else {
  console.log('✓ All internal links, assets and anchors resolve.');
}

mkdirSync(fileURLToPath(new URL('../qa-report/', import.meta.url)), { recursive: true });
const list = [...external.keys()].sort();
writeFileSync(new URL('../qa-report/external-links.txt', import.meta.url), list.join('\n') + '\n');
console.log(`${list.length} unique external links (listed in qa-report/external-links.txt).`);

let failures = 0;
if (checkExternal) {
  console.log('\nChecking external links…');
  const results = await Promise.all(
    list.map(async (href) => {
      for (const method of ['HEAD', 'GET']) {
        try {
          const res = await fetch(href, {
            method,
            redirect: 'follow',
            signal: AbortSignal.timeout(20000),
            headers: { 'User-Agent': 'Mozilla/5.0 (link check; +https://odbarrerar.github.io)' },
          });
          if (res.ok || method === 'GET') return { href, status: res.status };
        } catch (err) {
          if (method === 'GET') return { href, status: 0, error: err.message };
        }
      }
    }),
  );
  for (const r of results) {
    if (r.status >= 200 && r.status < 400) continue;
    const soft = [401, 403, 405, 429, 999].includes(r.status);
    if (!soft) failures++;
    console.log(`  ${soft ? '⚠' : '✗'} ${r.status || r.error} ${r.href}\n      on ${[...external.get(r.href)].slice(0, 3).join(', ')}`);
  }
  console.log(failures ? `✗ ${failures} external link(s) failed.` : '✓ External links reachable (warnings excepted).');
}

process.exit(errors.length || failures ? 1 : 0);
