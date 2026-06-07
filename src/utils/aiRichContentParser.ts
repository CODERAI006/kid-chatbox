/**
 * Parse AI tutor text into structured blocks and optional action buttons.
 * Markdown-lite only — output is rendered as React nodes (no raw HTML).
 */

export type RichBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; text: string }
  | { type: 'callout'; variant: 'tip' | 'note' | 'important'; text: string }
  | { type: 'divider' };

export interface AiActionButton {
  label: string;
  prompt: string;
}

export interface ParsedAiContent {
  blocks: RichBlock[];
  actions: AiActionButton[];
}

const CALLOUT_PREFIX = /^(?:💡|Tip:|Note:|Important:)\s*/i;
const ACTION_SECTION = /^(?:what'?s next|try asking|you could ask|explore more|quick actions?|continue learning)\??\s*:?\s*$/i;

export function isActionSectionHeading(text: string): boolean {
  return ACTION_SECTION.test(text.trim());
}

function stripJsonWrapper(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.topic === 'string' && Array.isArray(parsed.cards)) {
      const bits: string[] = [parsed.topic];
      for (const card of parsed.cards) {
        if (!card || typeof card !== 'object') continue;
        const c = card as Record<string, unknown>;
        if (typeof c.title === 'string') bits.push(c.title);
        if (typeof c.body === 'string') bits.push(c.body);
      }
      return bits.filter(Boolean).join('\n\n');
    }
  } catch {
    /* keep original */
  }
  return raw;
}

function calloutVariant(line: string): 'tip' | 'note' | 'important' | null {
  if (/^💡|^tip:/i.test(line)) return 'tip';
  if (/^important:/i.test(line)) return 'important';
  if (/^note:/i.test(line)) return 'note';
  return null;
}

function cleanActionLabel(text: string): string {
  return text.replace(/^[-*•>\s]+/, '').replace(/\?$/, '').trim();
}

/** Split AI tables that were collapsed onto one line: "| A | B | | C | D |" */
function normalizeInlineTables(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount < 4 || !line.includes('|')) return line;
      return line.replace(/\|\s+\|(?=\s*[-:]*-{2,}|\s*[^\s|])/g, '|\n|');
    })
    .join('\n');
}

function parseTableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || trimmed.indexOf('|', 1) === -1) return null;
  const cells = trimmed
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  return cells.length >= 2 ? cells : null;
}

function isTableSeparator(cells: string[]): boolean {
  return cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, '')));
}

function looksLikeNumberedSection(title: string, nextLine: string | undefined): boolean {
  if (/[–—]/.test(title)) return true;
  if (title.length > 48) return true;
  if (nextLine?.trim().startsWith('|')) return true;
  return false;
}

function looksLikeTableParagraph(text: string): boolean {
  return text.includes('|') && (text.match(/\|/g) || []).length >= 4;
}

function tryParseInlineTable(text: string): RichBlock | null {
  const lines = normalizeInlineTables(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const headers = parseTableCells(lines[0]);
  if (!headers || isTableSeparator(headers)) return null;

  let start = 1;
  if (start < lines.length) {
    const sep = parseTableCells(lines[start]);
    if (sep && isTableSeparator(sep)) start += 1;
  }

  const rows: string[][] = [];
  for (let j = start; j < lines.length; j += 1) {
    const row = parseTableCells(lines[j]);
    if (!row || isTableSeparator(row)) break;
    rows.push(row);
  }

  return rows.length ? { type: 'table', headers, rows } : null;
}

export function parseAiRichContent(raw: string): ParsedAiContent {
  const normalized = normalizeInlineTables(stripJsonWrapper(raw)).replace(/\r\n/g, '\n').trim();
  if (!normalized) return { blocks: [], actions: [] };

  const lines = normalized.split('\n');
  const blocks: RichBlock[] = [];
  const actions: AiActionButton[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let collectingActions = false;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join(' ').trim();
    if (!text) return;
    if (looksLikeTableParagraph(text)) {
      const table = tryParseInlineTable(text);
      if (table) {
        blocks.push(table);
        buf.length = 0;
        return;
      }
    }
    blocks.push({ type: 'paragraph', text });
    buf.length = 0;
  };

  let paraBuf: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      flushParagraph(paraBuf);
      if (inCode) {
        blocks.push({ type: 'code', text: codeBuf.join('\n') });
        codeBuf = [];
        inCode = false;
      } else {
        inCode = true;
      }
      i += 1;
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      i += 1;
      continue;
    }

    if (!trimmed) {
      flushParagraph(paraBuf);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph(paraBuf);
      blocks.push({ type: 'divider' });
      i += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paraBuf);
      if (ACTION_SECTION.test(heading[2])) collectingActions = true;
      else collectingActions = false;
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    const calloutKind = calloutVariant(trimmed);
    if (calloutKind) {
      flushParagraph(paraBuf);
      blocks.push({
        type: 'callout',
        variant: calloutKind,
        text: trimmed.replace(CALLOUT_PREFIX, '').trim(),
      });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushParagraph(paraBuf);
      const quoteText = trimmed.replace(/^>\s*/, '').trim();
      const variant = /^tip:/i.test(quoteText) ? 'tip' : 'note';
      blocks.push({
        type: 'callout',
        variant,
        text: quoteText.replace(/^tip:\s*/i, '').trim(),
      });
      i += 1;
      continue;
    }

    const tableCells = parseTableCells(trimmed);
    if (tableCells && !isTableSeparator(tableCells)) {
      flushParagraph(paraBuf);
      collectingActions = false;
      const headers = tableCells;
      i += 1;
      if (i < lines.length) {
        const sep = parseTableCells(lines[i].trim());
        if (sep && isTableSeparator(sep)) i += 1;
      }
      const rows: string[][] = [];
      while (i < lines.length) {
        const row = parseTableCells(lines[i].trim());
        if (!row || isTableSeparator(row)) break;
        rows.push(row);
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      const title = ordered[2];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : undefined;
      if (looksLikeNumberedSection(title, nextLine?.trim())) {
        flushParagraph(paraBuf);
        collectingActions = false;
        blocks.push({ type: 'heading', level: 2, text: `${ordered[1]}. ${title}` });
        i += 1;
        continue;
      }
      flushParagraph(paraBuf);
      const items: string[] = [ordered[2]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].trim();
        const m = next.match(/^(\d+)[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[2]);
        i += 1;
      }
      if (collectingActions) {
        items.forEach((item) => {
          const label = cleanActionLabel(item);
          if (label) actions.push({ label, prompt: item.endsWith('?') ? item : `${item}?` });
        });
      } else {
        blocks.push({ type: 'list', ordered: true, items });
      }
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph(paraBuf);
      const items: string[] = [bullet[1]];
      i += 1;
      while (i < lines.length) {
        const next = lines[i].trim();
        const m = next.match(/^[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i += 1;
      }
      if (collectingActions) {
        items.forEach((item) => {
          const label = cleanActionLabel(item);
          if (label) actions.push({ label, prompt: item });
        });
      } else {
        blocks.push({ type: 'list', ordered: false, items });
      }
      continue;
    }

    if (ACTION_SECTION.test(trimmed)) {
      flushParagraph(paraBuf);
      collectingActions = true;
      blocks.push({ type: 'heading', level: 3, text: trimmed.replace(/:?\s*$/, '') });
      i += 1;
      continue;
    }

    if (collectingActions && trimmed.endsWith('?')) {
      const label = cleanActionLabel(trimmed);
      if (label) actions.push({ label, prompt: trimmed });
      i += 1;
      continue;
    }

    collectingActions = false;
    paraBuf.push(trimmed);
    i += 1;
  }

  flushParagraph(paraBuf);

  if (!actions.length) {
    const last = blocks[blocks.length - 1];
    if (last?.type === 'paragraph' && last.text.endsWith('?') && last.text.length < 180) {
      actions.push({
        label: cleanActionLabel(last.text),
        prompt: last.text,
      });
      blocks.pop();
      blocks.push({ type: 'callout', variant: 'note', text: last.text });
    }
  }

  return { blocks, actions };
}
