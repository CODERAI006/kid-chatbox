require('dotenv').config();
const { pool } = require('../config/database');

async function main() {
  const users = await pool.query(`SELECT id FROM users LIMIT 200`);
  let mismatches = 0;
  for (let i = 0; i < users.rows.length; i++) {
    for (let j = i + 1; j < users.rows.length; j++) {
      const a = users.rows[i].id;
      const b = users.rows[j].id;
      const jsA = a < b ? a : b;
      const jsB = a < b ? b : a;
      const pg = await pool.query(
        `SELECT CASE WHEN $1::uuid < $2::uuid THEN $1::text ELSE $2::text END AS ua,
                CASE WHEN $1::uuid < $2::uuid THEN $2::text ELSE $1::text END AS ub`,
        [a, b]
      );
      if (pg.rows[0].ua !== jsA || pg.rows[0].ub !== jsB) {
        mismatches++;
        console.log('mismatch', { a, b, jsA, jsB, pg: pg.rows[0] });
      }
    }
  }
  console.log('total mismatches:', mismatches);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
