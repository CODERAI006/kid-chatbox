require('dotenv').config();
const { pool } = require('../server/config/database');

pool
  .query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'plans' AND column_name LIKE 'hide%'"
  )
  .then((r) => {
    console.log('hide columns:', r.rows);
    return pool.query('SELECT id, name, hide_ai_study, hide_ai_quiz FROM plans LIMIT 5');
  })
  .then((r) => {
    console.log('plans sample:', r.rows);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
