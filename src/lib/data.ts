/**
 * Loads and validates the YAML files in src/data/.
 *
 * Every file is checked when the site builds. If something is missing or
 * mistyped, the build stops with a message naming the file, the entry and
 * the field, e.g.  "src/data/talks.yaml → entry 3 (…) → year: Required".
 */
import { parse } from 'yaml';
import { z } from 'astro/zod';

import profileRaw from '../data/profile.yaml?raw';
import themesRaw from '../data/themes.yaml?raw';
import talksRaw from '../data/talks.yaml?raw';
import teachingRaw from '../data/teaching.yaml?raw';
import mediaRaw from '../data/media.yaml?raw';
import codeRaw from '../data/code.yaml?raw';
import newsRaw from '../data/news.yaml?raw';
import cvRaw from '../data/cv.yaml?raw';

/* ───────────────────────── helpers ───────────────────────── */

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^(https?:\/\/|\/|mailto:)/.test(v), {
    message: 'Must be a full link (https://…) or a site path starting with "/".',
  });

const requiredUrl = z
  .string()
  .trim()
  .refine((v) => /^(https?:\/\/|\/|mailto:)/.test(v), {
    message: 'Must be a full link (https://…) or a site path starting with "/".',
  });

/** Accepts 2025, "2025", "2025-06", "2025-06-14" or a YAML date. */
const partialDate = z
  .union([z.string(), z.number(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()))
  .refine((v) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v), {
    message: 'Use a date like "2025", "2025-06" or "2025-06-14".',
  });

function describe(entry: unknown): string {
  if (entry && typeof entry === 'object') {
    const e = entry as Record<string, unknown>;
    const label = e.title ?? e.event ?? e.course ?? e.text ?? e.degree ?? e.role ?? e.name;
    if (typeof label === 'string') return ` (“${label.slice(0, 60)}”)`;
  }
  return '';
}

function load<T extends z.ZodType>(file: string, raw: string, schema: T): z.output<T> {
  let data: unknown;
  try {
    data = parse(raw);
  } catch (err) {
    throw new Error(`Could not read src/data/${file}: ${(err as Error).message}`);
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const path = issue.path;
      let where = `src/data/${file}`;
      if (typeof path[0] === 'number' && Array.isArray(data)) {
        where += ` → entry ${path[0] + 1}${describe((data as unknown[])[path[0]])}`;
        path.shift();
      }
      const field = path.length ? ` → ${path.join('.')}` : '';
      return `  • ${where}${field}: ${issue.message}`;
    });
    throw new Error(`Problem in site data:\n${lines.join('\n')}`);
  }
  return result.data;
}

/* ───────────────────────── profile ───────────────────────── */

const ProfileSchema = z.object({
  name: z.string(),
  full_name: z.string().optional(),
  alternate_names: z.array(z.string()).default([]),
  position: z.string(),
  institution: z.string(),
  institution_short: z.string().optional(),
  institution_url: optionalUrl,
  department: z.string(),
  department_url: optionalUrl,
  project: z
    .object({
      name: z.string(),
      funder: z.string().optional(),
      grant: z.string().optional(),
      url: optionalUrl,
    })
    .optional(),
  other_affiliations: z
    .array(
      z.object({
        role: z.string(),
        organisation: z.string(),
        city: z.string().optional(),
        url: optionalUrl,
      }),
    )
    .default([]),
  seo_description: z.string(),
  statement: z.string(),
  bio: z.string(),
  research_interests: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  email: z.email(),
  office: z.string().optional(),
  cv: z.object({
    url: requiredUrl,
    updated: z.union([z.string(), z.number()]).transform(String).optional(),
  }),
  links: z.object({
    ucd: optionalUrl,
    scholar: optionalUrl,
    github: optionalUrl,
    x: optionalUrl,
    bluesky: optionalUrl,
    democracy_challenged: optionalUrl,
    wid: optionalUrl,
    orcid: optionalUrl,
    ssrn: optionalUrl,
    linkedin: optionalUrl,
  }),
  x_handle: z.string().optional(),
  /** Optional sentence shown with the job market paper in the homepage hero. */
  job_market_note: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  /** Content of the Google Search Console "HTML tag" verification. */
  google_site_verification: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  page_intros: z.record(z.string(), z.string()).default({}),
});

export type Profile = z.output<typeof ProfileSchema>;
export const profile: Profile = load('profile.yaml', profileRaw, ProfileSchema);

/* ───────────────────────── themes ───────────────────────── */

const ThemeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only.'),
  title: z.string(),
  short: z.string(),
  description: z.string(),
});
export type Theme = z.output<typeof ThemeSchema>;
export const themes: Theme[] = load('themes.yaml', themesRaw, z.array(ThemeSchema));
export const themeById = new Map(themes.map((t) => [t.id, t]));

/* ───────────────────────── talks ───────────────────────── */

export const TALK_TYPES = ['Conference', 'Seminar', 'Workshop', 'Webinar', 'Lecture', 'Meeting'] as const;

const TalkSchema = z.object({
  year: z.number().int(),
  date: partialDate.optional(),
  end_date: partialDate.optional(),
  month: z.number().int().min(1).max(12).optional(),
  event: z.string(),
  title: z.string().optional(),
  host: z.string().optional(),
  city: z.string(),
  country: z.string().default(''),
  type: z.enum(TALK_TYPES),
  url: optionalUrl,
  online: z.boolean().default(false),
  paper: z.string().optional(),
  slides: optionalUrl,
  note: z.string().optional(),
});
export type Talk = z.output<typeof TalkSchema>;
export const talks: Talk[] = load('talks.yaml', talksRaw, z.array(TalkSchema));

/* ───────────────────────── teaching ───────────────────────── */

const TeachingSchema = z.object({
  course: z.string(),
  level: z.enum(['Undergraduate', 'Master', 'PhD', 'Executive']),
  language: z.string().optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  syllabus: optionalUrl,
  sessions: z
    .array(
      z.object({
        institution: z.string(),
        term: z.string(),
        year: z.number().int(),
        city: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .min(1),
});
export type Course = z.output<typeof TeachingSchema>;
export const teaching: Course[] = load('teaching.yaml', teachingRaw, z.array(TeachingSchema));

/* ───────────────────────── media ───────────────────────── */

export const MEDIA_TYPES = ['blog', 'commentary', 'policy', 'coverage', 'profile'] as const;

const MediaSchema = z.object({
  title: z.string(),
  outlet: z.string(),
  type: z.enum(MEDIA_TYPES),
  url: requiredUrl,
  date: partialDate.optional(),
  coauthors: z.array(z.string()).default([]),
  language: z.string().default('en'),
  summary: z.string().optional(),
  paper: z.string().optional(),
});
export type MediaItem = z.output<typeof MediaSchema>;
export const media: MediaItem[] = load('media.yaml', mediaRaw, z.array(MediaSchema));

/* ───────────────────────── code & data ───────────────────────── */

const CodeSchema = z.object({
  title: z.string(),
  kind: z.enum(['code', 'data', 'replication']),
  url: requiredUrl,
  repo: z.string().optional(),
  paper: z.string().optional(),
  context: z.string().optional(),
  description: z.string(),
  languages: z.array(z.string()).default([]),
  availability: z.string().optional(),
  updated: partialDate.optional(),
  doi: z.string().optional(),
  license: z.string().optional(),
});
export type CodeItem = z.output<typeof CodeSchema>;
export const code: CodeItem[] = load('code.yaml', codeRaw, z.array(CodeSchema));

/* ───────────────────────── news ───────────────────────── */

const NewsSchema = z.object({
  date: partialDate,
  text: z.string(),
  url: optionalUrl,
  kind: z.enum(['publication', 'talk', 'paper', 'writing', 'other']).default('other'),
});
export type NewsItem = z.output<typeof NewsSchema>;
export const news: NewsItem[] = load('news.yaml', newsRaw, z.array(NewsSchema)).sort((a, b) =>
  b.date.localeCompare(a.date),
);

/* ───────────────────────── CV ───────────────────────── */

const period = z.union([z.string(), z.number()]).transform(String);

const CvSchema = z.object({
  positions: z
    .array(
      z.object({
        title: z.string(),
        organisation: z.string(),
        unit: z.string().optional(),
        location: z.string().optional(),
        start: period.optional(),
        end: period.optional(),
        note: z.string().optional(),
        current: z.boolean().default(false),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        location: z.string().optional(),
        start: period.optional(),
        end: period,
        thesis: z.string().optional(),
        advisors: z.string().optional(),
        committee: z.string().optional(),
      }),
    )
    .default([]),
  grants: z
    .array(
      z.object({
        title: z.string(),
        funder: z.string().optional(),
        years: period,
        note: z.string().optional(),
      }),
    )
    .default([]),
  consulting: z
    .array(
      z.object({
        role: z.string(),
        organisation: z.string(),
        years: period,
        description: z.string().optional(),
      }),
    )
    .default([]),
  visits: z
    .array(
      z.object({
        institution: z.string(),
        location: z.string().optional(),
        years: period,
        note: z.string().optional(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        role: z.string(),
        organisation: z.string(),
        years: period,
        description: z.string().optional(),
      }),
    )
    .default([]),
  skills: z.array(z.object({ label: z.string(), items: z.string() })).default([]),
  references: z
    .array(
      z.object({
        name: z.string(),
        details: z.string().optional(),
        email: z.email().optional(),
        url: optionalUrl,
      }),
    )
    .default([]),
});
export type Cv = z.output<typeof CvSchema>;
export const cv: Cv = load('cv.yaml', cvRaw, CvSchema);
