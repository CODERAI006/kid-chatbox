/** Normalizers for visual-first interactive study sections. */
import type {
  StudyInteractiveSection,
  StudySectionType,
  StudyVisualSpec,
  StudyVisualType,
} from '@/types/studyInteractive';

const VALID_TYPES: StudySectionType[] = [
  'hero', 'why-learn', 'big-picture', 'roadmap', 'concept-cards', 'infographics',
  'memory-aids', 'learning-steps', 'real-life', 'common-mistakes', 'remember-this',
  'cheat-sheet', 'flashcards', 'quick-quiz', 'knowledge-check', 'ask-ai',
  'final-revision', 'celebration',
];

const VALID_VISUAL_TYPES: StudyVisualType[] = [
  'flowchart', 'mindmap', 'timeline', 'comparison', 'infographic', 'decision-tree',
  'process', 'cycle', 'tree', 'icon-grid', 'diagram', 'table',
];

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function normalizeVisual(raw: unknown): StudyVisualSpec | undefined {
  const o = asRecord(raw);
  if (!o.type) return undefined;
  const type = String(o.type) as StudyVisualType;
  if (!VALID_VISUAL_TYPES.includes(type)) return undefined;

  const nodes = Array.isArray(o.nodes)
    ? o.nodes.map((n, i) => {
        const node = asRecord(n);
        return {
          id: String(node.id || `n${i}`),
          label: String(node.label || ''),
          icon: node.icon ? String(node.icon) : undefined,
          color: node.color ? String(node.color) : undefined,
          highlight: Boolean(node.highlight),
        };
      }).filter((n) => n.label)
    : undefined;

  const connections = Array.isArray(o.connections)
    ? o.connections.map((c) => {
        const conn = asRecord(c);
        return {
          from: String(conn.from || ''),
          to: String(conn.to || ''),
          label: conn.label ? String(conn.label) : undefined,
        };
      }).filter((c) => c.from && c.to)
    : undefined;

  const animation = Array.isArray(o.animation)
    ? o.animation.map((a, i) => {
        const anim = asRecord(a);
        return {
          step: typeof anim.step === 'number' ? anim.step : i + 1,
          action: (['highlight', 'reveal', 'pulse', 'connect'].includes(String(anim.action))
            ? anim.action
            : 'highlight') as 'highlight' | 'reveal' | 'pulse' | 'connect',
          targetIds: Array.isArray(anim.targetIds) ? anim.targetIds.map(String) : [],
          label: anim.label ? String(anim.label) : undefined,
        };
      })
    : undefined;

  return {
    type,
    title: o.title ? String(o.title) : undefined,
    nodes,
    connections,
    labels: Array.isArray(o.labels) ? o.labels.map(String) : undefined,
    icons: Array.isArray(o.icons) ? o.icons.map(String) : undefined,
    colors: o.colors && typeof o.colors === 'object'
      ? Object.fromEntries(Object.entries(asRecord(o.colors)).map(([k, v]) => [k, String(v)]))
      : undefined,
    animation,
    headers: Array.isArray(o.headers) ? o.headers.map(String) : undefined,
    rows: Array.isArray(o.rows)
      ? o.rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
      : undefined,
  };
}

export function normalizeInteractiveSection(raw: unknown, index: number): StudyInteractiveSection | null {
  const o = asRecord(raw);
  const type = String(o.type || '') as StudySectionType;
  if (!VALID_TYPES.includes(type)) return null;

  const id = String(o.id || type || `section-${index}`);
  const title = String(o.title || id);
  const order = typeof o.order === 'number' ? o.order : index + 1;

  return {
    id,
    title,
    type,
    order,
    icon: String(o.icon || '📚'),
    content: asRecord(o.content),
    visual: normalizeVisual(o.visual),
    interactions: o.interactions ? asRecord(o.interactions) : undefined,
    learningObjective: String(o.learningObjective || ''),
  };
}

export function normalizeInteractiveSections(raw: unknown): StudyInteractiveSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeInteractiveSection(item, i))
    .filter((s): s is StudyInteractiveSection => Boolean(s))
    .sort((a, b) => a.order - b.order);
}

export function getSectionByType(
  sections: StudyInteractiveSection[],
  type: StudySectionType,
): StudyInteractiveSection | undefined {
  return sections.find((s) => s.type === type);
}

export function isInteractiveLesson(raw: Record<string, unknown>): boolean {
  return Array.isArray(raw.sections) && raw.sections.length > 0;
}
