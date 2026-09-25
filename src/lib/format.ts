/** Small formatting helpers shared across components. */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Formats "2025", "2025-06" or "2025-06-14" for display. */
export function formatPartialDate(value: string | undefined, style: 'long' | 'short' = 'long'): string {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  const names = style === 'long' ? MONTHS : MONTHS_SHORT;
  if (d) return `${Number(d)} ${names[Number(m) - 1]} ${y}`;
  if (m) return `${names[Number(m) - 1]} ${y}`;
  return y;
}

/** ISO-ish machine value for <time datetime>. */
export function toDatetime(value: string | undefined): string | undefined {
  return value || undefined;
}

export function formatDate(date: Date, style: 'long' | 'short' = 'long'): string {
  const names = style === 'long' ? MONTHS : MONTHS_SHORT;
  return `${date.getUTCDate()} ${names[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function monthName(month: number | undefined, style: 'long' | 'short' = 'short'): string {
  if (!month) return '';
  return (style === 'long' ? MONTHS : MONTHS_SHORT)[month - 1] ?? '';
}

/** "2019–2020", "2019–present", "2019" */
export function formatRange(start?: string, end?: string): string {
  const e = end && end.toLowerCase() === 'present' ? 'present' : end;
  if (start && e && start !== e) return `${start}–${e}`;
  return start || e || '';
}

/** Joins a list as "A, B and C". */
export function joinList(items: string[], conjunction = 'and'): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

/** Strips Markdown syntax for meta descriptions and JSON-LD. */
export function plainText(markdown: string | undefined): string {
  if (!markdown) return '';
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncates at a word boundary. */
export function truncate(text: string, max = 158): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export function isExternal(href: string | undefined): boolean {
  return !!href && /^https?:\/\//.test(href);
}

/** Hostname without "www." for link hints. */
export function hostname(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Language code → readable label. */
export const LANGUAGE_LABEL: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};
