/**
 * Normalize grade/class strings for comparison (e.g. "Class 5" ↔ "5").
 */

function normalizeGrade(value) {
  if (value == null) return '';
  const s = String(value).trim().toLowerCase();
  if (!s) return '';
  const match = s.match(/(\d{1,2})/);
  if (match) return match[1];
  return s;
}

function gradesMatch(a, b) {
  const na = normalizeGrade(a);
  const nb = normalizeGrade(b);
  return Boolean(na && nb && na === nb);
}

module.exports = { normalizeGrade, gradesMatch };
