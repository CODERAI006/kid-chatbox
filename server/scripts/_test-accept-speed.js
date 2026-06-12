require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function main() {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  const users = await pool.query(
    `SELECT id, buddy_id FROM users WHERE LOWER(buddy_id) IN ('amit435', 'mentoringme429')`
  );
  const amit = users.rows.find((u) => u.buddy_id?.toLowerCase() === 'amit435');
  const mentor = users.rows.find((u) => u.buddy_id?.toLowerCase() === 'mentoringme429');
  if (!amit || !mentor) {
    console.log('users not found');
    await pool.end();
    return;
  }

  await pool.query(`DELETE FROM study_buddy_connections WHERE user_a_id IN ($1, $2) OR user_b_id IN ($1, $2)`, [
    amit.id,
    mentor.id,
  ]);
  await pool.query(
    `UPDATE study_buddy_requests SET status = 'cancelled'
     WHERE status = 'pending' AND from_user_id = $1 AND to_user_id = $2`,
    [amit.id, mentor.id]
  );

  const ins = await pool.query(
    `INSERT INTO study_buddy_requests (from_user_id, to_user_id, message, status)
     VALUES ($1, $2, 'speed test', 'pending') RETURNING id`,
    [amit.id, mentor.id]
  );
  const requestId = ins.rows[0].id;

  const token = jwt.sign({ userId: mentor.id, email: 'm@test.com' }, secret, { expiresIn: '1h' });

  const start = Date.now();
  const res = await fetch(`http://127.0.0.1:3001/api/study-buddies/requests/${requestId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: 'accept' }),
  });
  const ms = Date.now() - start;
  console.log(`accept took ${ms}ms`, res.status, await res.text());

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
