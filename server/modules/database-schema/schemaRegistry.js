/**
 * In-memory database metadata registry.
 * Populated at startup via schemaDiscovery — no hardcoded table names.
 */

/** @typedef {{ table: string, column: string, foreignTable: string, foreignColumn: string }} ForeignKeyRef */
/** @typedef {{ name: string, dataType: string, isNullable: boolean, isPrimaryKey: boolean }} ColumnMeta */
/** @typedef {{ name: string, columns: ColumnMeta[], foreignKeys: ForeignKeyRef[], purposes: string[] }} TableMeta */

let registry = {
  tables: /** @type {TableMeta[]} */ ([]),
  loadedAt: null,
};

const PURPOSE_RULES = [
  {
    purpose: 'user_profile',
    match: (cols) => cols.has('email') && cols.has('name') && !cols.has('user_id'),
  },
  {
    purpose: 'performance_scores',
    match: (cols) =>
      cols.has('user_id') &&
      (cols.has('score_percentage') || cols.has('score') || cols.has('marks')),
  },
  {
    purpose: 'study_activity',
    match: (cols) =>
      cols.has('user_id') &&
      (cols.has('lesson_title') || cols.has('topic')) &&
      cols.has('subject'),
  },
  {
    purpose: 'learning_progress',
    match: (cols) =>
      cols.has('user_id') &&
      (cols.has('progress_percentage') || cols.has('is_completed')),
  },
  {
    purpose: 'quiz_attempts',
    match: (cols) =>
      cols.has('user_id') && cols.has('quiz_id') && cols.has('score_percentage'),
  },
  {
    purpose: 'exam_schedule',
    match: (cols) => cols.has('user_id') && cols.has('exam_date'),
  },
];

function columnSet(table) {
  return new Set(table.columns.map((c) => c.name));
}

function inferPurposes(table) {
  const cols = columnSet(table);
  return PURPOSE_RULES.filter((r) => r.match(cols)).map((r) => r.purpose);
}

function setRegistry(tables) {
  registry = {
    tables: tables.map((t) => ({ ...t, purposes: inferPurposes(t) })),
    loadedAt: new Date().toISOString(),
  };
}

function getRegistry() {
  return registry;
}

function getTablesByPurpose(purpose) {
  return registry.tables.filter((t) => t.purposes.includes(purpose));
}

function getTable(name) {
  return registry.tables.find((t) => t.name === name) || null;
}

function pickColumn(table, candidates) {
  const names = new Set(table.columns.map((c) => c.name));
  return candidates.find((c) => names.has(c)) || null;
}

function resolvePrimaryTable(purpose) {
  const matches = getTablesByPurpose(purpose);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => a.columns.length - b.columns.length)[0];
}

module.exports = {
  setRegistry,
  getRegistry,
  getTablesByPurpose,
  getTable,
  pickColumn,
  resolvePrimaryTable,
  columnSet,
};
