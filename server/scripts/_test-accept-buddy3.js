require('dotenv').config();
const { pool } = require('../config/database');

function pairIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function acceptRequest(requestId, userId) {
  const client = await pool.connect();
  try {
    const { action } = { action: 'accept' };
    await client.query('BEGIN');
    const reqRes = await client.query(
      'SELECT * FROM study_buddy_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    if (!reqRes.rows.length) throw new Error('Request not found');
    const row = reqRes.rows[0];
    if (row.status !== 'pending') throw new Error('Request is no longer pending');

    const isRecipient = row.to_user_id === userId;
    if (!isRecipient) throw new Error(`Not recipient: to=${row.to_user_id} user=${userId}`);

    await client.query(
      `UPDATE study_buddy_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['accepted', row.id]
    );

    const [userA, userB] = pairIds(row.from_user_id, row.to_user_id);
    await client.query(
      `INSERT INTO study_buddy_connections (user_a_id, user_b_id)
       VALUES ($1, $2) ON CONFLICT (user_a_id, user_b_id) DO NOTHING`,
      [userA, userB]
    );
    await client.query('COMMIT');
    console.log('accept OK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function main() {
  const pending = await pool.query(
    `SELECT id, to_user_id FROM study_buddy_requests WHERE status = 'pending' LIMIT 1`
  );
  if (!pending.rows.length) {
    console.log('No pending request (maybe already accepted in prior test)');
    await pool.end();
    return;
  }
  const { id, to_user_id } = pending.rows[0];
  await acceptRequest(id, to_user_id);

  const dash = await pool.query(
    `SELECT u.id, u.buddy_id, u.name, c.connected_at
     FROM study_buddy_connections c
     JOIN users u ON u.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END
     WHERE c.user_a_id = $1 OR c.user_b_id = $1`,
    [to_user_id]
  );
  console.log('buddies after accept:', dash.rows);

  await pool.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
