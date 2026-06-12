/**
 * Resolve Postgres connection settings from .env (DATABASE_* or legacy DB_*).
 * Fails fast when credentials are missing so VPS deploys do not silently use postgres/postgres.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function resolveDatabaseConfig() {
  const passwordFromEnv = process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD;
  const userFromEnv = process.env.DATABASE_USERNAME || process.env.DB_USER;

  if (!passwordFromEnv && process.env.ALLOW_DEFAULT_DB_CREDS !== '1') {
    throw new Error(
      'DATABASE_PASSWORD (or DB_PASSWORD) is not set in .env. ' +
        'On the VPS: edit /var/www/kidchatbox/.env using env.production.template, ' +
        'then run: node test-db-connection.js && npm run db:migrate-all. ' +
        'For local dev with default postgres/postgres only, set ALLOW_DEFAULT_DB_CREDS=1 in .env.'
    );
  }

  return {
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'kidchatbox',
    user: userFromEnv || 'postgres',
    password: passwordFromEnv || 'postgres',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

module.exports = { resolveDatabaseConfig };
