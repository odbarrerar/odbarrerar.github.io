# odbarrerar.github.io

Personal academic website of **Oscar Barrera Rodríguez**, Senior Research Fellow at University College Dublin (School of Politics and International Relations).

Built with [Astro](https://astro.build) as a fully static site and deployed to GitHub Pages by GitHub Actions. Ordinary content lives in plain text files (YAML and Markdown), so updating the site never requires touching the code.

---

## Contents

1. [Run the site on your computer](#1-run-the-site-on-your-computer)
2. [Where everything lives](#2-where-everything-lives)
3. [How to update the website](#3-how-to-update-the-website)
4. [Photo, CV and other files](#4-photo-cv-and-other-files)
5. [Deploy to GitHub Pages](#5-deploy-to-github-pages)
6. [Use a custom domain later](#6-use-a-custom-domain-later)
7. [Quality checks](#7-quality-checks)
8. [Design notes](#8-design-notes)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Run the site on your computer

You need [Node.js](https://nodejs.org) version 22 or newer (the LTS installer is fine).

```bash
npm ci            # install dependencies (first time, or after pulling changes)
npm run dev       # start a local preview at http://localhost:4321
```

The preview reloads as you edit files. Other commands:

| Command           | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `npm run build`   | Builds the final site into `dist/`                                  |
| `npm run preview` | Serves the built site locally                                       |
| `npm run check`   | Type-checks the content and components                              |
| `npm run qa`      | Build + link check + mobile layout check + accessibility check      |

You don't need to build before pushing: GitHub builds and publishes the site for you.

## 2. Where everything lives

```
src/
  data/                     ← lists and settings (YAML): edit these for everyday updates
    profile.yaml            ← name, position, biography, email, links, CV link, page intros
    themes.yaml             ← the four research themes
    talks.yaml              ← seminars and conferences
    teaching.yaml           ← courses
    media.yaml              ← blog posts, op-eds, coverage
    code.yaml               ← repositories, datasets, replication packages
    news.yaml               ← short "Latest" updates on the homepage
    cv.yaml                 ← CV sections (positions, education, grants, …)
  content/
    research/               ← one Markdown file per paper (publications, working papers, WIP)
      _template.md          ← copy this to add a paper
    notes/                  ← essays for "Notes & Ideas"
      _template.md          ← copy this to add a note
  assets/images/            ← portrait.jpg goes here (optimised automatically)
  components/               ← reusable interface pieces (Header, ResearchCard, …)
  layouts/                  ← page frames
  pages/                    ← one file per page / URL
  lib/                      ← data loading, citations, SEO helpers
  styles/                   ← design tokens (colours, type, spacing) and global CSS
public/                     ← files copied as-is: favicons, social image, PDFs (public/files/)
scripts/                    ← quality checks and image generators
.github/workflows/          ← automatic deployment and link checks
CONTENT_REVIEW.md           ← checklist of content to verify (delete when done)
```

The **Publications**, **Research**, **CV** and homepage all read from the same paper files, so each paper is entered once.

## 3. How to update the website

Edit the file, save, then commit and push to `main` (or edit directly on github.com with the pencil icon). The site rebuilds automatically within about two minutes.

YAML tips: keep the indentation (two spaces), put text containing a colon `:` in quotes, and start new list items with `- `. If something is wrong, the build stops with a message naming the file, the entry and the field.

### Change the biography, position, email or social links
Edit **`src/data/profile.yaml`**. Every link on the site (header, footer, contact page, structured data) comes from the `links:` block. Leave a link empty (`""`) to hide it, for example `bluesky: ""`. The short introduction under each page title is under `page_intros:`.

### Add a publication or working paper
1. Copy `src/content/research/_template.md` to a new file in the same folder, e.g. `inflation-beliefs.md` (lowercase, hyphens). The file name becomes the address `/research/inflation-beliefs/`.
2. Fill in the fields and paste the abstract under the second `---`.
3. Set `status:` to `published`, `forthcoming`, `book-chapter`, `submitted`, `working-paper` or `work-in-progress`.

### Move a working paper to "published"
Open its file, change `status: working-paper` to `status: published`, add `venue`, `volume`, `pages`, `doi` and `paper_url`, and move the old working-paper link under `versions:`.

### Feature a paper on the homepage
Set `featured: true` and `order: 1` (2, 3, …) in its file. Four featured papers are shown, after the job market paper if there is one.

### Your job market paper
The paper with `job_market_paper: true` (only one) is shown in the homepage hero, leads *Featured research*, has its own section at the top of the Research and CV pages, and carries a *Job market paper* label everywhere. It is currently `src/content/research/biased-information-biased-preferences.md`.

To post a new draft:
1. Replace **`public/files/JMP_Barrera.pdf`** with the new PDF, keeping the file name so the link you send to committees never changes: `https://odbarrerar.github.io/files/JMP_Barrera.pdf`.
2. In the paper's file, update `version_date:` (e.g. `"2026-11"`, shown as "Latest version: November 2026") and, if it changed, the abstract.

Optional: `job_market_note:` in `profile.yaml` adds a sentence above the paper in the hero, e.g. *I am on the 2026–2027 academic job market.*

### A paper changes title
Edit `title:` and keep the old one as `previous_title:` (shown as "Previously circulated as …"). The address can stay the same. If you also rename the file, add the old address to `redirects:` in `astro.config.mjs` so existing links keep working, as was done for the confirmation-bias paper.

### Add a talk or conference
Open **`src/data/talks.yaml`**, copy an entry, paste it at the top and edit it. Add `date: 2026-11-14` for a precise date: future dates are highlighted as *Upcoming* automatically, and move to the archive once they pass (the site rebuilds weekly). Link a talk to a paper with `paper: winner-takes-all` (the paper's file name).

### Add a course
Edit **`src/data/teaching.yaml`**. Each course lists the institutions and terms under `sessions:`.

### Add a blog post, op-ed or media appearance
Edit **`src/data/media.yaml`** and choose `type:` `blog`, `commentary`, `policy`, `coverage` or `profile`. Use `language: es` for Spanish pieces. Link it to a paper with `paper:`.

### Add a repository, dataset or replication package
Edit **`src/data/code.yaml`** (`kind:` `code`, `data` or `replication`). Replication materials for a specific paper can also be added as `replication_url:` in the paper's file.

### Post a homepage update ("Latest")
Add an entry at the top of **`src/data/news.yaml`**.

### Update the CV
Positions, education, grants, consulting, visits, other experience and references are in **`src/data/cv.yaml`**. Publications, teaching and talks on the CV page are generated automatically. Replace the PDF as described below.

### Write a note
Copy `src/content/notes/_template.md`, rename it and write in plain text (Markdown).

### Change the research themes
Edit **`src/data/themes.yaml`**. A paper joins a theme through its `topics:` list.

### Change the menu
Edit `src/lib/nav.ts` (labels and order).

## 4. Photo, CV and other files

**Profile photo.** Save a portrait as **`src/assets/images/portrait.jpg`** (a 4:5 crop of at least 800 × 1000 px works best). It is resized and converted to AVIF/WebP automatically; until the file exists, a monogram is shown. Then refresh the social-sharing image:

```bash
npx playwright install chromium   # once
npm run og-image                  # rewrites public/og/default.png with your photo
```

**CV PDF.** Put the file in **`public/files/`** (e.g. `public/files/CV_Barrera_2026.pdf`) and set in `profile.yaml`:

```yaml
cv:
  url: /files/CV_Barrera_2026.pdf
  updated: "2026"
```

Any external link (Dropbox, Google Drive) also works as `url`.

**Paper PDFs and slides.** Put them in `public/files/` and link them as `/files/name.pdf` from the paper's `pdf_url:` or `slides_url:`.

**Figures on a paper page.** Put an image in `src/assets/images/` and add to the paper's file:

```yaml
image: ../../assets/images/fact-checking-figure.png
image_alt: "Bar chart of agreement with Marine Le Pen's statements by treatment group"
image_caption: "Figure 2: Voting intentions by treatment."
```

**Favicon.** Edit `public/favicon.svg` and run `npm run icons` to regenerate the PNG and ICO versions.

## 5. Deploy to GitHub Pages

The repository must be called **`odbarrerar.github.io`** for the site to live at `https://odbarrerar.github.io/`.

1. On GitHub, create a new public repository named `odbarrerar.github.io` (no README).
2. On your computer, in this folder:
   ```bash
   git init
   git add .
   git commit -m "New academic website"
   git branch -M main
   git remote add origin https://github.com/odbarrerar/odbarrerar.github.io.git
   git push -u origin main
   ```
   (GitHub Desktop works too: *Add existing repository* → *Publish repository*.)
3. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab: the *Deploy to GitHub Pages* workflow runs on every push to `main`. When it finishes (≈2 minutes) the site is live.

The workflow (`.github/workflows/deploy.yml`) also rebuilds every Monday, so "Upcoming" talks and the "Last updated" date stay current. A second workflow (`checks.yml`) type-checks and verifies internal links on every push, and requests every external link on the 1st of each month; GitHub emails you if a check fails.

To retire the Google Site, replace its content with a short notice linking to the new address (Google Sites cannot redirect automatically), and unpublish it once the new site shows up first in searches for your name.

**Google Search Console** (optional, speeds up indexing): add the property `https://odbarrerar.github.io/` at search.google.com/search-console, choose the *HTML tag* method, paste the `content` code into `google_site_verification:` in `profile.yaml`, push, click *Verify*, then submit `sitemap-index.xml` under *Sitemaps*.

## 6. Use a custom domain later

1. Buy a domain (e.g. `oscarbarrera.org`) and, at your DNS provider, create:
   - for the bare domain, four `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and optionally the `AAAA` records listed in GitHub's documentation);
   - for `www`, a `CNAME` record pointing to `odbarrerar.github.io`.
2. Create a file **`public/CNAME`** containing only the domain, e.g. `oscarbarrera.org`.
3. In **`astro.config.mjs`**, change `site: 'https://odbarrerar.github.io'` to your domain, and update the URL printed at the bottom of `scripts/og-image.mjs`; rerun `npm run og-image`.
4. Push, then in **Settings → Pages** enter the custom domain and tick **Enforce HTTPS** once available.

## 7. Quality checks

```bash
npm run build
npm run qa:links                 # internal links, assets and #anchors
npm run qa:links -- --external   # also requests every external link
npx playwright install chromium  # once, for the next two
npm run qa:layout                # no sideways scrolling at 320–1440 px (details expanded)
npm run qa:a11y                  # axe-core WCAG 2.2 AA checks, light and dark themes
```

## 8. Design notes

- **Type:** Newsreader (editorial serif with optical sizes) for headings and paper titles; Schibsted Grotesk for text and interface. Both are self-hosted (no requests to Google), with metric-matched fallbacks to avoid layout shift.
- **Colour:** warm paper background, near-black ink and a single oxblood accent used for links, labels and active states. The dark theme has its own palette (warm charcoal, off-white, terracotta accent) rather than an inversion. All tokens are in `src/styles/tokens.css`.
- **Layout:** generous margins, thin rules instead of boxes, dates and metadata in a narrow left column (as in a printed CV), and a single reading column for abstracts and notes.
- **Statuses** (published / working paper / in progress) are marked with a filled, half-filled or empty square plus a text label, never by colour alone.
- **JavaScript** is limited to the theme toggle, mobile menu, list filters and copy buttons (a few kilobytes). Everything works without it.
- **SEO:** unique titles and descriptions, canonical URLs, Open Graph and X cards, sitemap, `robots.txt`, JSON-LD (`Person`, `WebSite`, `ProfilePage`, `ScholarlyArticle`, `BlogPosting`, `BreadcrumbList`) and Google Scholar `citation_*` meta tags on every paper page.

## 9. Troubleshooting

- **The build fails after an edit.** Read the first lines of the error in the Actions log: it names the file and field (for example `src/data/talks.yaml → entry 3 → year: Required`). Usually a missing space in the indentation or an unquoted colon.
- **A new paper doesn't appear.** Check that the file ends in `.md`, doesn't start with `_`, and has no `draft: true`.
- **Theme ids.** A paper's `topics:` must use ids that exist in `themes.yaml`.
- **Old links.** Pages of the former Google Site are not redirected automatically; the 404 page lists the main sections.
