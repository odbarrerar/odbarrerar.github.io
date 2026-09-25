/**
 * Content collections: long-form Markdown content.
 *
 *  - research/  one Markdown file per paper (publications, working papers,
 *               work in progress). The body of the file is the abstract.
 *  - notes/     essays for the "Notes & Ideas" section.
 *
 * Structured lists (talks, teaching, media, code, news, CV, profile) live in
 * src/data/*.yaml and are validated in src/lib/data.ts.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** "2025", "2025-06" or "2025-06-14" */
const partialDate = z
  .union([z.string(), z.number(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)))
  .refine((v) => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v), {
    message: 'Use a date like "2025", "2025-06" or "2025-06-14".',
  });

const url = z.url();

const link = z.object({
  label: z.string(),
  url,
});

const mediaItem = z.object({
  title: z.string(),
  outlet: z.string(),
  url,
  date: partialDate.optional(),
});

export const STATUSES = [
  'published',
  'forthcoming',
  'book-chapter',
  'submitted',
  'working-paper',
  'work-in-progress',
] as const;

const research = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/research' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      authors: z.array(z.string()).min(1),
      status: z.enum(STATUSES),
      year: z.number().int().optional(),
      /** Publication date, for sorting and metadata ("2025-06"). */
      date: partialDate.optional(),
      /** Journal, book or series. */
      venue: z.string().optional(),
      volume: z.string().optional(),
      issue: z.string().optional(),
      /** Page range or article number. */
      pages: z.string().optional(),
      chapter: z.string().optional(),
      book_editors: z.array(z.string()).optional(),
      publisher: z.string().optional(),
      doi: z.string().optional(),
      open_access: z.boolean().optional(),

      /** 1–3 sentences shown on cards. */
      summary: z.string(),
      /** Optional research question shown on the paper's own page. */
      question: z.string().optional(),
      topics: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
      jel: z.array(z.string()).default([]),

      /** Main link to the paper (journal page, paper website…). */
      paper_url: url.optional(),
      paper_label: z.string().optional(),
      /** Direct link to a PDF. */
      pdf_url: url.optional(),
      code_url: url.optional(),
      code_label: z.string().optional(),
      data_url: url.optional(),
      data_label: z.string().optional(),
      slides_url: url.optional(),
      replication_url: url.optional(),
      other_links: z.array(link).default([]),
      /** Earlier versions: working papers, discussion papers… */
      versions: z.array(z.object({ label: z.string(), url: url.optional() })).default([]),
      media: z.array(mediaItem).default([]),

      featured: z.boolean().default(false),
      /** Order among featured papers (1 = first). */
      order: z.number().optional(),
      image: image().optional(),
      image_alt: z.string().optional(),
      image_caption: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/notes' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date().optional(),
      description: z.string(),
      tags: z.array(z.string()).default([]),
      related_paper: z.string().optional(),
      cross_post: z.object({ outlet: z.string(), url }).optional(),
      image: image().optional(),
      image_alt: z.string().optional(),
      /** Position in the list when a note has no date (lower = first). */
      order: z.number().default(100),
      draft: z.boolean().default(false),
    }),
});

export const collections = { research, notes };
