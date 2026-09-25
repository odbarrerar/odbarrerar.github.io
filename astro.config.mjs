// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/** Latin subset (covers English, Spanish and French). @type {[string, ...string[]]} */
const LATIN = ['U+0000-00FF', 'U+0131', 'U+0152-0153', 'U+02BB-02BC', 'U+02C6', 'U+02DA', 'U+02DC', 'U+0304', 'U+0308', 'U+0329', 'U+2000-206F', 'U+20AC', 'U+2122', 'U+2191', 'U+2193', 'U+2212', 'U+2215', 'U+FEFF', 'U+FFFD'];
const fs = '@fontsource-variable';

export default defineConfig({
  site: 'https://odbarrerar.github.io',
  trailingSlash: 'always',
  build: {
    // Inline all CSS (≈6 kB gzipped) so pages render without extra requests
    inlineStylesheets: 'always',
  },
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Newsreader',
      cssVariable: '--font-serif',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { src: [`${fs}/newsreader/files/newsreader-latin-opsz-normal.woff2`], weight: '200 800', style: 'normal', unicodeRange: LATIN },
          { src: [`${fs}/newsreader/files/newsreader-latin-wght-italic.woff2`], weight: '200 800', style: 'italic', unicodeRange: LATIN },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Schibsted Grotesk',
      cssVariable: '--font-sans',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [
          { src: [`${fs}/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2`], weight: '400 900', style: 'normal', unicodeRange: LATIN },
          { src: [`${fs}/schibsted-grotesk/files/schibsted-grotesk-latin-wght-italic.woff2`], weight: '400 900', style: 'italic', unicodeRange: LATIN },
        ],
      },
    },
  ],
});
