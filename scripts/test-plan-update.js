require('dotenv').config();
const { pool } = require('../server/config/database');

async function test() {
  const id = (
    await pool.query("SELECT id FROM plans WHERE name = 'Freemium' LIMIT 1")
  ).rows[0].id;

  await pool.query(
    `UPDATE plans SET hide_ai_study = $1, hide_ai_quiz = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [true, false, id]
  );

  const row = (await pool.query('SELECT hide_ai_study, hide_ai_quiz FROM plans WHERE id = $1', [id]))
    .rows[0];
  console.log('after direct update:', row);

  await pool.query(
    `UPDATE plans SET hide_ai_study = false, hide_ai_quiz = false WHERE id = $1`,
    [id]
  );
  process.exit(0);
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
