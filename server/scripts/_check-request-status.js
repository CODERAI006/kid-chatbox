require('dotenv').config();
const { pool } = require('../config/database');
pool.query(`SELECT id, status FROM study_buddy_requests ORDER BY created_at DESC LIMIT 3`)
  .then((r) => { console.log(r.rows); return pool.end(); })
  .catch((e) => { console.error(e); process.exit(1); });
