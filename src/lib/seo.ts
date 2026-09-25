/** Structured data (JSON-LD) builders. See https://schema.org */
import { cv, profile, themes } from './data';
import { doiUrl, isSelf, type Paper } from './research';
import { plainText } from './format';

export type JsonLd = Record<string, unknown>;

export function personId(site: string) {
  return `${site}/#person`;
}
export function websiteId(site: string) {
  return `${site}/#website`;
}

export function sameAs(): string[] {
  return Object.values(profile.links).filter((v): v is string => !!v && /^https?:/.test(v));
}

export function personSchema(site: string, imageUrl?: string): JsonLd {
  return {
    '@type': 'Person',
    '@id': personId(site),
    name: profile.name,
    alternateName: [profile.full_name, ...profile.alternate_names].filter(Boolean),
    jobTitle: profile.position,
    description: profile.seo_description,
    url: `${site}/`,
    ...(imageUrl ? { image: imageUrl } : {}),
    email: `mailto:${profile.email}`,
    worksFor: {
      '@type': 'CollegeOrUniversity',
      name: profile.institution,
      ...(profile.institution_url ? { url: profile.institution_url } : {}),
      department: {
        '@type': 'Organization',
        name: profile.department,
        ...(profile.department_url ? { url: profile.department_url } : {}),
      },
    },
    affiliation: [
      ...(profile.project
        ? [{ '@type': 'ResearchProject', name: profile.project.name, url: profile.project.url, funder: { '@type': 'Organization', name: profile.project.funder } }]
        : []),
      ...profile.other_affiliations.map((a) => ({ '@type': 'Organization', name: a.organisation, url: a.url })),
    ],
    alumniOf: [...new Set(cv.education.map((e) => e.institution))].map((name) => ({
      '@type': 'CollegeOrUniversity',
      name,
    })),
    knowsAbout: [...profile.research_interests, ...themes.map((t) => t.title)],
    knowsLanguage: ['es', 'en', 'fr'],
    sameAs: sameAs(),
  };
}

export function websiteSchema(site: string): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: `${site}/`,
    name: profile.name,
    description: profile.seo_description,
    inLanguage: 'en',
    author: { '@id': personId(site) },
    publisher: { '@id': personId(site) },
  };
}

export function profilePageSchema(site: string, url: string): JsonLd {
  return {
    '@type': 'ProfilePage',
    '@id': `${url}#profilepage`,
    url,
    name: `${profile.name}: ${profile.position}, ${profile.institution}`,
    isPartOf: { '@id': websiteId(site) },
    mainEntity: { '@id': personId(site) },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function scholarlyArticleSchema(p: Paper, site: string, url: string): JsonLd {
  const d = p.data;
  const doi = doiUrl(d.doi);
  const isPartOf =
    d.status === 'book-chapter'
      ? {
          '@type': 'Book',
          name: d.venue,
          editor: d.book_editors?.map((e) => ({ '@type': 'Person', name: e })),
          publisher: d.publisher ? { '@type': 'Organization', name: d.publisher } : undefined,
        }
      : d.venue
        ? {
            '@type': 'PublicationVolume',
            volumeNumber: d.volume,
            isPartOf: { '@type': 'Periodical', name: d.venue },
          }
        : undefined;
  return {
    '@type': 'ScholarlyArticle',
    '@id': `${url}#article`,
    headline: d.title.length > 110 ? `${d.title.slice(0, 107)}…` : d.title,
    name: d.title,
    url,
    author: d.authors.map((a) => (isSelf(a) ? { '@id': personId(site), '@type': 'Person', name: a } : { '@type': 'Person', name: a })),
    ...(d.date || d.year ? { datePublished: d.date ?? String(d.year) } : {}),
    ...(isPartOf ? { isPartOf } : {}),
    ...(d.pages ? { pagination: d.pages } : {}),
    abstract: plainText(p.body) || d.summary,
    description: d.summary,
    keywords: [...d.keywords, ...d.jel.map((j) => `JEL:${j}`)].join(', ') || undefined,
    inLanguage: 'en',
    creativeWorkStatus: d.status === 'published' || d.status === 'book-chapter' ? 'Published' : d.status === 'forthcoming' ? 'Forthcoming' : d.status === 'work-in-progress' ? 'Work in progress' : 'Working paper',
    ...(doi
      ? {
          identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: d.doi },
          sameAs: doi,
        }
      : {}),
    ...(d.open_access ? { isAccessibleForFree: true } : {}),
    mainEntityOfPage: url,
  };
}

export function blogPostingSchema(opts: {
  site: string;
  url: string;
  title: string;
  description: string;
  date?: Date;
}): JsonLd {
  return {
    '@type': 'BlogPosting',
    '@id': `${opts.url}#article`,
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    ...(opts.date ? { datePublished: opts.date.toISOString().slice(0, 10) } : {}),
    author: { '@id': personId(opts.site) },
    publisher: { '@id': personId(opts.site) },
    isPartOf: { '@id': websiteId(opts.site) },
    inLanguage: 'en',
  };
}

/** Wraps several nodes into one @graph document. */
export function graph(...nodes: (JsonLd | undefined)[]): JsonLd {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}
