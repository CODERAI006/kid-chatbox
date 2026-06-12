require('dotenv').config();
const { pool } = require('../config/database');

async function main() {
  const pending = await pool.query(
    `SELECT r.id, r.from_user_id, r.to_user_id,
            fu.name AS from_name, fu.status AS from_status, fu.buddy_id AS from_buddy,
            tu.name AS to_name, tu.status AS to_status, tu.buddy_id AS to_buddy
     FROM study_buddy_requests r
     JOIN users fu ON fu.id = r.from_user_id
     JOIN users tu ON tu.id = r.to_user_id
     WHERE r.status = 'pending' LIMIT 3`
  );
  console.log(JSON.stringify(pending.rows, null, 2));

  const toId = pending.rows[0]?.to_user_id;
  if (toId) {
    const access = await pool.query(
      `SELECT module_name, has_access FROM user_module_access WHERE user_id = $1`,
      [toId]
    );
    console.log('to_user module access:', access.rows);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
