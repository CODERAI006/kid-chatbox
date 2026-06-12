require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

async function main() {
  const pending = await pool.query(
    `SELECT id, to_user_id FROM study_buddy_requests WHERE status = 'pending' LIMIT 1`
  );
  if (!pending.rows.length) {
    console.log('No pending requests');
    await pool.end();
    return;
  }

  const { id: requestId, to_user_id: userId } = pending.rows[0];
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  const token = jwt.sign({ userId, email: 'test@example.com' }, secret, { expiresIn: '1h' });

  const res = await fetch(`http://127.0.0.1:3001/api/study-buddies/requests/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'accept' }),
  });

  const text = await res.text();
  console.log('status:', res.status);
  console.log('body:', text);

  await pool.end();
}

main().catch(async (e) => {
  console.error(e.message || e);
  process.exit(1);
});
