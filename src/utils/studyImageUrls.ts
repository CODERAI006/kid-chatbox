/**
 * Maps study keywords to curated educational Unsplash images (topic-relevant, not random).
 */
const UNSPLASH = (id: string, w = 640, h = 400) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80`;

interface ImageEntry {
  keywords: string[];
  url: string;
  label: string;
}

/** Curated library — match keywords by substring / token overlap. */
const IMAGE_LIBRARY: ImageEntry[] = [
  { keywords: ['human heart', 'heart', 'circulatory', 'blood pump'], url: UNSPLASH('photo-1628348068341-c6a0580840d5'), label: 'Human heart' },
  { keywords: ['plant leaf', 'leaf', 'photosynthesis', 'chlorophyll', 'plant cell'], url: UNSPLASH('photo-1466692476867-aef086dfb630'), label: 'Plant leaf' },
  { keywords: ['animal habitat', 'habitat', 'wildlife', 'forest animals', 'ecosystem'], url: UNSPLASH('photo-1441974231531-c6227db76b6e'), label: 'Animal habitat' },
  { keywords: ['air pollution', 'pollution', 'smog', 'factory smoke'], url: UNSPLASH('photo-1611273420628-4669a6504d0a'), label: 'Air pollution' },
  { keywords: ['recycling', 'recycle', 'waste', 'garbage', 'clean environment'], url: UNSPLASH('photo-1532996122724-e3c354a0b15b'), label: 'Recycling' },
  { keywords: ['human body', 'body basics', 'anatomy', 'organs', 'skeleton'], url: UNSPLASH('photo-1576091160399-112ba8d25d1d'), label: 'Human body' },
  { keywords: ['water cycle', 'rain', 'evaporation', 'clouds'], url: UNSPLASH('photo-1428908728789-d2baa5b0666b'), label: 'Water cycle' },
  { keywords: ['solar system', 'planets', 'space', 'sun moon'], url: UNSPLASH('photo-1614732414448-0963d77a460c'), label: 'Solar system' },
  { keywords: ['food chain', 'predator', 'prey'], url: UNSPLASH('photo-1437622368343-7a3ddf069338'), label: 'Food chain' },
  { keywords: ['soil', 'earth', 'layers of soil'], url: UNSPLASH('photo-1500382017468-90403feddaed'), label: 'Soil' },
  { keywords: ['math', 'numbers', 'counting', 'addition'], url: UNSPLASH('photo-1635070041078-e363dbe005cb'), label: 'Mathematics' },
  { keywords: ['geometry', 'shapes', 'triangle', 'circle'], url: UNSPLASH('photo-1596495577886-4e68d7b0e0b0'), label: 'Geometry' },
  { keywords: ['english', 'reading', 'books', 'library'], url: UNSPLASH('photo-1456513080510-7bf3a84b82f8'), label: 'Reading' },
  { keywords: ['hindi', 'devanagari', 'india culture'], url: UNSPLASH('photo-1481627834876-b7833e8f5570'), label: 'Hindi' },
  { keywords: ['chess', 'chess board', 'strategy game'], url: UNSPLASH('photo-1529699211952-734e80c4d42b'), label: 'Chess' },
  { keywords: ['science lab', 'experiment', 'microscope'], url: UNSPLASH('photo-1532094349884-543bc11b234d'), label: 'Science' },
  { keywords: ['geography', 'map', 'globe'], url: UNSPLASH('photo-1524661135-423995f22d0b'), label: 'Geography' },
  { keywords: ['history', 'ancient', 'monument'], url: UNSPLASH('photo-1481627834876-b7833e8f5570'), label: 'History' },
  { keywords: ['classroom', 'students learning', 'study'], url: UNSPLASH('photo-1503676260728-1c00da094a0b'), label: 'Learning' },
];

const SUBJECT_DEFAULTS: Record<string, ImageEntry> = {
  maths: { keywords: [], url: UNSPLASH('photo-1635070041078-e363dbe005cb'), label: 'Mathematics' },
  mathematics: { keywords: [], url: UNSPLASH('photo-1635070041078-e363dbe005cb'), label: 'Mathematics' },
  'evs / science': { keywords: [], url: UNSPLASH('photo-1532094349884-543bc11b234d'), label: 'EVS / Science' },
  science: { keywords: [], url: UNSPLASH('photo-1532094349884-543bc11b234d'), label: 'Science' },
  english: { keywords: [], url: UNSPLASH('photo-1456513080510-7bf3a84b82f8'), label: 'English' },
  hindi: { keywords: [], url: UNSPLASH('photo-1481627834876-b7833e8f5570'), label: 'Hindi' },
  chess: { keywords: [], url: UNSPLASH('photo-1529699211952-734e80c4d42b'), label: 'Chess' },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreMatch(query: string, entry: ImageEntry): number {
  const q = normalize(query);
  if (!q) return 0;
  let best = 0;
  for (const kw of entry.keywords) {
    const k = normalize(kw);
    if (q === k) return 100;
    if (q.includes(k) || k.includes(q)) best = Math.max(best, 50 + k.length);
    const qTokens = q.split(' ');
    const kTokens = k.split(' ');
    const overlap = qTokens.filter((t) => kTokens.some((kt) => kt.includes(t) || t.includes(kt))).length;
    if (overlap > 0) best = Math.max(best, overlap * 12);
  }
  return best;
}

export interface ResolvedStudyImage {
  url: string;
  label: string;
  keyword: string;
}

export function resolveStudyImage(
  keyword: string,
  subject: string,
  topic = ''
): ResolvedStudyImage {
  const query = keyword || topic || subject;
  let best: ImageEntry | null = null;
  let bestScore = 0;

  for (const entry of IMAGE_LIBRARY) {
    const s = scoreMatch(query, entry);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  if (bestScore >= 12 && best) {
    return { url: best.url, label: best.label, keyword: query };
  }

  const subKey = normalize(subject);
  const fallback =
    SUBJECT_DEFAULTS[subKey] ??
    SUBJECT_DEFAULTS[subKey.replace('evs science', 'evs / science')] ??
    IMAGE_LIBRARY[IMAGE_LIBRARY.length - 1];

  return {
    url: fallback.url,
    label: fallback.label,
    keyword: query,
  };
}

export function resolveStudyImageGallery(
  keywords: string[],
  subject: string,
  topic: string,
  max = 6
): ResolvedStudyImage[] {
  const seeds = [...keywords, topic, subject].filter(Boolean);
  const uniqueQueries = [...new Set(seeds.map((s) => s.trim()).filter(Boolean))];
  const picked: ResolvedStudyImage[] = [];
  const usedUrls = new Set<string>();

  for (const q of uniqueQueries) {
    if (picked.length >= max) break;
    const img = resolveStudyImage(q, subject, topic);
    if (usedUrls.has(img.url)) continue;
    usedUrls.add(img.url);
    picked.push(img);
  }

  while (picked.length < Math.min(max, 4) && picked.length < uniqueQueries.length + 2) {
    const extra = resolveStudyImage(`${topic} ${picked.length}`, subject, topic);
    if (!usedUrls.has(extra.url)) {
      usedUrls.add(extra.url);
      picked.push(extra);
    } else break;
  }

  return picked.slice(0, max);
}
