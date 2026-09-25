/**
 * /publications.bib: every paper as BibTeX, generated at build time.
 */
import type { APIRoute } from 'astro';
import { formatBibtex, getPapers } from '../lib/research';
import { profile } from '../lib/data';

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() ?? '').replace(/\/$/, '');
  const papers = (await getPapers()).filter((p) => p.data.status !== 'work-in-progress');
  const header = `% Publications and working papers of ${profile.name}\n% ${base}/publications/\n% Generated ${new Date().toISOString().slice(0, 10)}\n\n`;
  const body = papers.map((p) => formatBibtex(p, base)).join('\n\n');
  return new Response(header + body + '\n', {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
};
