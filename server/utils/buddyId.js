/**
 * Generate unique study-buddy display IDs: firstname + 3 digits (e.g. emma427).
 */

function extractFirstName(name) {
  const raw = String(name || '').trim().split(/\s+/)[0] || '';
  const letters = raw.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (letters.length >= 2) return letters.slice(0, 12);
  return 'student';
}

function randomSuffix() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {string} name
 * @returns {Promise<string>}
 */
async function generateUniqueBuddyId(db, name) {
  const prefix = extractFirstName(name);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = `${prefix}${randomSuffix()}`;
    const existing = await db.query('SELECT 1 FROM users WHERE buddy_id = $1 LIMIT 1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  const fallback = `${prefix}${Date.now().toString().slice(-3)}`;
  const clash = await db.query('SELECT 1 FROM users WHERE buddy_id = $1 LIMIT 1', [fallback]);
  if (clash.rows.length === 0) return fallback;
  return `${prefix}${Math.floor(Math.random() * 10000)}`;
}

/**
 * Backfill users missing buddy_id.
 * @param {import('pg').Pool} pool
 */
async function backfillBuddyIds(pool) {
  const missing = await pool.query(
    `SELECT id, name FROM users WHERE buddy_id IS NULL OR buddy_id = '' ORDER BY created_at`
  );
  for (const row of missing.rows) {
    const buddyId = await generateUniqueBuddyId(pool, row.name);
    await pool.query('UPDATE users SET buddy_id = $1 WHERE id = $2', [buddyId, row.id]);
  }
  return missing.rows.length;
}

module.exports = { extractFirstName, generateUniqueBuddyId, backfillBuddyIds };
