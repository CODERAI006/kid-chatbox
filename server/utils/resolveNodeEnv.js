/**
 * Resolve NODE_ENV — npm dev scripts must not inherit production from .env templates.
 */

const DEV_LIFECYCLE_EVENTS = new Set(['dev', 'dev:server', 'dev:all']);

function resolveNodeEnv() {
  const lifecycle = process.env.npm_lifecycle_event || '';
  if (DEV_LIFECYCLE_EVENTS.has(lifecycle)) {
    return 'development';
  }
  return process.env.NODE_ENV || 'development';
}

module.exports = { resolveNodeEnv };
