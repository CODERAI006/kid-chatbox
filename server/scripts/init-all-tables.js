/**
 * Create / update all application tables (runs the same chain as server startup).
 * Usage: node server/scripts/init-all-tables.js
 */

const dotenv = require('dotenv');

dotenv.config();

const { initializeDatabase, pool } = require('../config/database');

initializeDatabase()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    try {
      await pool.end();
    } catch {
      // ignore
    }
    process.exit(1);
  });
