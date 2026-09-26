/** Helpers for the research collection: sorting, grouping, author names, citations. */
import { getCollection, type CollectionEntry } from 'astro:content';
import { profile, themeById } from './data';
import { joinList } from './format';

export type Paper = CollectionEntry<'research'>;
export type Status = Paper['data']['status'];

export const STATUS_LABEL: Record<Status, string> = {
  published: 'Published',
  forthcoming: 'Forthcoming',
  'book-chapter': 'Book chapter',
  submitted: 'Submitted',
  'working-paper': 'Working paper',
  'work-in-progress': 'Work in progress',
};

/** Status groups used for sections and filters. */
export const GROUPS = [
  { id: 'published', label: 'Publications', singular: 'Published', statuses: ['published', 'forthcoming', 'book-chapter'] },
  { id: 'working', label: 'Working papers', singular: 'Working paper', statuses: ['submitted', 'working-paper'] },
  { id: 'progress', label: 'Work in progress', singular: 'Work in progress', statuses: ['work-in-progress'] },
] as const satisfies ReadonlyArray<{ id: string; label: string; singular: string; statuses: readonly Status[] }>;

export type GroupId = (typeof GROUPS)[number]['id'];

export function groupOf(status: Status): GroupId {
  return GROUPS.find((g) => (g.statuses as readonly Status[]).includes(status))!.id;
}

/** Sort key: newest first; papers without a date sort by `order`. */
function sortKey(p: Paper): string {
  const d = p.data.date ?? (p.data.year ? String(p.data.year) : '0000');
  return d.padEnd(10, '-');
}

export function sortPapers(list: Paper[]): Paper[] {
  return [...list].sort((a, b) => {
    // The job market paper always comes first
    if (a.data.job_market_paper !== b.data.job_market_paper) return a.data.job_market_paper ? -1 : 1;
    const byDate = sortKey(b).localeCompare(sortKey(a));
    if (byDate !== 0) return byDate;
    return (a.data.order ?? 99) - (b.data.order ?? 99) || a.data.title.localeCompare(b.data.title);
  });
}

export async function getPapers(): Promise<Paper[]> {
  const all = await getCollection('research', ({ data }) => !data.draft);
  for (const p of all) {
    for (const t of p.data.topics) {
      if (!themeById.has(t)) {
        throw new Error(
          `src/content/research/${p.id}.md → topics: "${t}" is not a theme id in src/data/themes.yaml`,
        );
      }
    }
  }
  const jmp = all.filter((p) => p.data.job_market_paper);
  if (jmp.length > 1) {
    throw new Error(
      `Only one paper can have "job_market_paper: true". Found it in: ${jmp
        .map((p) => `src/content/research/${p.id}.md`)
        .join(', ')}`,
    );
  }
  return sortPapers(all);
}

/** The paper marked `job_market_paper: true`, if any. */
export function jobMarketPaper(papers: Paper[]): Paper | undefined {
  return papers.find((p) => p.data.job_market_paper);
}

/** Turns a site path such as /files/paper.pdf into a full URL. */
export function absoluteUrl(href: string, site: string): string {
  return new URL(href, `${site.replace(/\/$/, '')}/`).toString();
}

export function byGroup(papers: Paper[]) {
  return GROUPS.map((g) => ({
    ...g,
    papers: papers.filter((p) => groupOf(p.data.status) === g.id),
  }));
}

export function featured(papers: Paper[]): Paper[] {
  return papers
    .filter((p) => p.data.featured)
    .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99));
}

export function paperUrl(p: Paper): string {
  return `/research/${p.id}/`;
}

/* ───────────────────────── names ───────────────────────── */

const selfNames = new Set(
  [profile.name, profile.full_name, ...profile.alternate_names]
    .filter(Boolean)
    .map((n) => normalise(n as string)),
);

function normalise(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-‐]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isSelf(name: string): boolean {
  return selfNames.has(normalise(name));
}

/**
 * Two-part (Spanish) surnames that must not be split when citing.
 * Add a line here if a co-author's family name has two words.
 */
const COMPOUND_SURNAMES = ['Barrera Rodríguez', 'Quintero Godínez', 'Barrera Rodriguez'];

/** Splits "Given Family" (or "Family, Given") into parts. */
export function splitName(name: string): { given: string; family: string } {
  if (name.includes(',')) {
    const [family, given] = name.split(',').map((s) => s.trim());
    return { given, family };
  }
  for (const c of COMPOUND_SURNAMES) {
    if (name.endsWith(` ${c}`)) return { given: name.slice(0, -c.length - 1), family: c };
  }
  const parts = name.trim().split(/\s+/);
  const family = parts.pop() ?? name;
  return { given: parts.join(' '), family };
}

function initials(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((g) =>
      g
        .split('-')
        .map((part) => `${part[0]}.`)
        .join('-'),
    )
    .join(' ');
}

/** Co-authors other than the site owner. */
export function coauthors(p: Paper): string[] {
  return p.data.authors.filter((a) => !isSelf(a));
}

/** Unique co-authors across all papers with a count, most frequent first. */
export function collaborators(papers: Paper[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of papers) for (const a of coauthors(p)) counts.set(a, (counts.get(a) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || splitName(a.name).family.localeCompare(splitName(b.name).family));
}

/* ───────────────────────── venue line ───────────────────────── */

/** "Journal of Public Economics 182, 104123" / book chapter details / status. */
export function venueParts(p: Paper): { venue?: string; details?: string } {
  const d = p.data;
  if (d.status === 'book-chapter') {
    const eds = d.book_editors?.length ? `ed. ${joinList(d.book_editors)}` : '';
    const details = [eds, d.publisher, d.year].filter(Boolean).join(', ');
    return { venue: d.venue, details };
  }
  if (d.venue) {
    let vol = d.volume ?? '';
    if (d.issue) vol += `(${d.issue})`;
    const details = [vol, d.pages].filter(Boolean).join(', ');
    return { venue: d.venue, details: [details, d.year].filter(Boolean).join(' · ') };
  }
  return { details: d.year ? String(d.year) : undefined };
}

export function themeTitles(p: Paper): { id: string; short: string; title: string }[] {
  return p.data.topics.map((t) => themeById.get(t)!).filter(Boolean);
}

/* ───────────────────────── citations ───────────────────────── */

export function doiUrl(doi?: string): string | undefined {
  return doi ? `https://doi.org/${doi}` : undefined;
}

/** APA 7-style reference as plain text. */
export function formatCitation(p: Paper, siteUrl: string): string {
  const d = p.data;
  const names = d.authors.map((a) => {
    const { given, family } = splitName(a);
    return `${family}, ${initials(given)}`;
  });
  let authorStr: string;
  if (names.length === 1) authorStr = names[0];
  else if (names.length === 2) authorStr = `${names[0]}, & ${names[1]}`;
  else authorStr = `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;

  const year = d.year ?? 'n.d.';
  const title = d.title.replace(/\.$/, '');
  const own = d.paper_url ?? d.pdf_url;
  const link = doiUrl(d.doi) ?? (own ? absoluteUrl(own, siteUrl) : `${siteUrl}/research/${p.id}/`);

  if (d.status === 'book-chapter') {
    const eds = d.book_editors?.length
      ? ` In ${joinList(d.book_editors.map((e) => { const s = splitName(e); return `${initials(s.given)} ${s.family}`; }), '&')} (Eds.),`
      : ' In';
    return `${authorStr} (${year}). ${title}.${eds} ${d.venue ?? ''}. ${d.publisher ?? ''}. ${link}`.replace(/\s+/g, ' ');
  }
  if (d.status === 'published' || d.status === 'forthcoming') {
    const vol = d.volume ? `, ${d.volume}${d.issue ? `(${d.issue})` : ''}` : '';
    const pages = d.pages ? `, ${d.pages}` : '';
    const when = d.status === 'forthcoming' ? 'in press' : year;
    return `${authorStr} (${when}). ${title}. ${d.venue}${vol}${pages}. ${link}`;
  }
  const kind = d.status === 'work-in-progress' ? 'Work in progress' : 'Working paper';
  return `${authorStr} (${year}). ${title} [${kind}]. ${link}`;
}

function bibEscape(s: string): string {
  return s.replace(/([&%$#_])/g, '\\$1');
}

export function bibKey(p: Paper): string {
  const first = splitName(p.data.authors[0]).family;
  const ascii = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const stop = new Set(['the', 'a', 'an', 'of', 'on', 'and', 'in', 'to', 'for']);
  const word = p.data.title.split(/[\s:,.]+/).map(ascii).find((w) => w && !stop.has(w)) ?? 'paper';
  return `${ascii(first)}${p.data.year ?? ''}${word}`;
}

/** BibTeX entry. */
export function formatBibtex(p: Paper, siteUrl: string): string {
  const d = p.data;
  const authors = d.authors
    .map((a) => {
      const { given, family } = splitName(a);
      return family.includes(' ') ? `{${family}}, ${given}` : `${family}, ${given}`;
    })
    .join(' and ');
  const fields: [string, string | undefined][] = [
    ['author', authors],
    ['title', `{${bibEscape(d.title)}}`],
  ];
  let type = 'unpublished';
  if (d.status === 'published' || d.status === 'forthcoming') {
    type = 'article';
    fields.push(['journal', d.venue ? bibEscape(d.venue) : undefined]);
    fields.push(['year', d.status === 'forthcoming' ? 'forthcoming' : d.year?.toString()]);
    fields.push(['volume', d.volume], ['number', d.issue], ['pages', d.pages]);
  } else if (d.status === 'book-chapter') {
    type = 'incollection';
    fields.push(['booktitle', d.venue ? `{${bibEscape(d.venue)}}` : undefined]);
    fields.push(['editor', d.book_editors?.map((e) => { const s = splitName(e); return `${s.family}, ${s.given}`; }).join(' and ')]);
    fields.push(['publisher', d.publisher], ['chapter', d.chapter], ['year', d.year?.toString()]);
  } else {
    fields.push(['note', d.status === 'work-in-progress' ? 'Work in progress' : STATUS_LABEL[d.status]]);
    fields.push(['year', d.year?.toString()]);
  }
  fields.push(['doi', d.doi]);
  const own = d.paper_url ?? d.pdf_url;
  fields.push(['url', d.doi ? undefined : own ? absoluteUrl(own, siteUrl) : `${siteUrl}/research/${p.id}/`]);
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k.padEnd(9)} = {${v}}`)
    .join(',\n');
  return `@${type}{${bibKey(p)},\n${body}\n}`;
}
