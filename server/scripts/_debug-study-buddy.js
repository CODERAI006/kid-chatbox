require('dotenv').config();
const { pool } = require('../config/database');

async function main() {
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'study_buddy_requests' ORDER BY ordinal_position`
  );
  console.log('study_buddy_requests columns:', cols.rows.map((r) => r.column_name).join(', '));

  const pending = await pool.query(
    `SELECT id, from_user_id, to_user_id, status FROM study_buddy_requests WHERE status = 'pending' LIMIT 5`
  );
  console.log('pending requests:', JSON.stringify(pending.rows, null, 2));

  if (pending.rows[0]) {
    const row = pending.rows[0];
    const a = row.from_user_id;
    const b = row.to_user_id;
    const jsPair = a < b ? [a, b] : [b, a];
    console.log('JS pair:', jsPair);
    const pgPair = await pool.query(
      `SELECT CASE WHEN $1::uuid < $2::uuid THEN $1 ELSE $2 END AS user_a,
              CASE WHEN $1::uuid < $2::uuid THEN $2 ELSE $1 END AS user_b`,
      [a, b]
    );
    console.log('PG pair:', pgPair.rows[0]);
    const mismatch = jsPair[0] !== pgPair.rows[0].user_a || jsPair[1] !== pgPair.rows[0].user_b;
    console.log('pair mismatch:', mismatch);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE study_buddy_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.id]
      );
      await client.query(
        `INSERT INTO study_buddy_connections (user_a_id, user_b_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        jsPair
      );
      await client.query('ROLLBACK');
      console.log('dry-run insert with JS pair: OK');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('dry-run insert with JS pair FAILED:', e.message);
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
