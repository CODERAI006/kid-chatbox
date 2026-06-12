/**
 * Suppresses migration console.log noise during API startup.
 * CLI migrations (node server/scripts/...) stay verbose.
 */

function shouldQuietMigrations() {
  return process.env.KIDCHATBOX_MIGRATION_QUIET === '1';
}

async function runMigrationsQuietly(runMigrations) {
  if (!shouldQuietMigrations()) {
    await runMigrations();
    return;
  }

  const originalLog = console.log;
  console.log = (...args) => {
    const message = args.map(String).join(' ');
    if (message.includes('❌') || message.includes('Error')) {
      originalLog(...args);
    }
  };

  try {
    await runMigrations();
  } finally {
    console.log = originalLog;
  }
}

module.exports = { runMigrationsQuietly, shouldQuietMigrations };
