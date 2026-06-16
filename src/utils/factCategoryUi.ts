/** Shared badge colors for Facts & Fun categories (any slug). */

const PALETTE = [
  { bg: 'blue.50', color: 'blue.800', borderColor: 'blue.100', scheme: 'blue' },
  { bg: 'green.50', color: 'green.800', borderColor: 'green.100', scheme: 'green' },
  { bg: 'orange.50', color: 'orange.800', borderColor: 'orange.100', scheme: 'orange' },
  { bg: 'pink.50', color: 'pink.800', borderColor: 'pink.100', scheme: 'pink' },
  { bg: 'purple.50', color: 'purple.800', borderColor: 'purple.100', scheme: 'purple' },
  { bg: 'cyan.50', color: 'cyan.800', borderColor: 'cyan.100', scheme: 'cyan' },
  { bg: 'teal.50', color: 'teal.800', borderColor: 'teal.100', scheme: 'teal' },
  { bg: 'yellow.50', color: 'yellow.800', borderColor: 'yellow.200', scheme: 'yellow' },
  { bg: 'red.50', color: 'red.800', borderColor: 'red.100', scheme: 'red' },
  { bg: 'indigo.50', color: 'indigo.800', borderColor: 'indigo.100', scheme: 'indigo' },
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getCategoryBadgeStyle(slug?: string) {
  const key = slug || 'general';
  return PALETTE[hashSlug(key) % PALETTE.length];
}

export function getCategoryColorScheme(slug?: string): string {
  return getCategoryBadgeStyle(slug).scheme;
}

export function resolveFactCategorySlug(fact: { category?: string; subject?: string }): string {
  return fact.category || fact.subject || 'general';
}
