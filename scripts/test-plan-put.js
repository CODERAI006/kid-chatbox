require('dotenv').config();
const { pool } = require('../server/config/database');

async function simulatePut(id, body) {
  const updates = [];
  const values = [];
  let paramCount = 0;

  const fields = [
    ['name', body.name],
    ['description', body.description],
    ['daily_quiz_limit', body.dailyQuizLimit],
    ['daily_topic_limit', body.dailyTopicLimit],
    ['monthly_cost', body.monthlyCost],
    ['status', body.status],
    ['hide_ai_study', Boolean(body.hideAiStudy)],
    ['hide_ai_quiz', Boolean(body.hideAiQuiz)],
  ];

  for (const [col, val] of fields) {
    if (val === undefined) continue;
    paramCount += 1;
    updates.push(`${col} = $${paramCount}`);
    values.push(val);
  }

  paramCount += 1;
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const sql = `UPDATE plans SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  return pool.query(sql, values);
}

async function main() {
  const id = (await pool.query("SELECT id FROM plans WHERE name = 'Freemium' LIMIT 1")).rows[0].id;
  const before = (await pool.query('SELECT hide_ai_study FROM plans WHERE id = $1', [id])).rows[0];
  console.log('before:', before);

  await simulatePut(id, {
    name: 'Freemium',
    description: 'Free plan with basic access',
    dailyQuizLimit: 1,
    dailyTopicLimit: 1,
    monthlyCost: 0,
    status: 'active',
    hideAiStudy: true,
    hideAiQuiz: false,
  });

  const after = (await pool.query('SELECT hide_ai_study, hide_ai_quiz FROM plans WHERE id = $1', [id]))
    .rows[0];
  console.log('after:', after);

  await pool.query('UPDATE plans SET hide_ai_study = false, hide_ai_quiz = false WHERE id = $1', [id]);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
