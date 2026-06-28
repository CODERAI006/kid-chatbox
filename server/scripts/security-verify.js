#!/usr/bin/env node
/**
 * Security verification script — run after security hardening changes.
 * Usage: node server/scripts/security-verify.js
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
let failed = 0;

function pass(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  console.error(`  ✗ ${label}`);
  if (detail) console.error(`    ${detail}`);
  failed += 1;
}

console.log('\n=== KidChatbox Security Verification ===\n');

// 1. JWT_SECRET enforcement in production mode
console.log('1. JWT secret (production simulation)');
try {
  delete process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production';
  delete require.cache[require.resolve('../utils/jwtConfig')];
  const { getJwtSecret } = require('../utils/jwtConfig');
  getJwtSecret();
  fail('Should throw when JWT_SECRET missing in production');
} catch (err) {
  if (/JWT_SECRET/i.test(err.message)) {
    pass('Throws when JWT_SECRET missing in production');
  } else {
    fail('Unexpected error for missing JWT_SECRET', err.message);
  }
}

try {
  process.env.JWT_SECRET = 'short';
  delete require.cache[require.resolve('../utils/jwtConfig')];
  const { getJwtSecret: getWeak } = require('../utils/jwtConfig');
  getWeak();
  fail('Should throw when JWT_SECRET < 32 chars in production');
} catch (err) {
  if (/32 characters/i.test(err.message)) {
    pass('Throws when JWT_SECRET too short in production');
  } else {
    fail('Unexpected error for weak JWT_SECRET', err.message);
  }
}

process.env.JWT_SECRET = 'a'.repeat(32);
delete require.cache[require.resolve('../utils/jwtConfig')];
try {
  const { getJwtSecret: getOk } = require('../utils/jwtConfig');
  if (getOk().length >= 32) pass('Accepts strong JWT_SECRET in production');
  else fail('Strong JWT_SECRET not accepted');
} catch (err) {
  fail('Strong JWT_SECRET rejected', err.message);
}

process.env.NODE_ENV = 'development';

// 2. Password policy
console.log('\n2. Password policy');
delete require.cache[require.resolve('../utils/passwordPolicy')];
const { validatePassword } = require('../utils/passwordPolicy');

const weak = validatePassword('abc');
if (!weak.ok) pass('Rejects password without number');
else fail('Should reject password without number');

const short = validatePassword('abc1');
if (!short.ok) pass('Rejects password shorter than 8 chars');
else fail('Should reject short password');

const good = validatePassword('secure1Pass');
if (good.ok) pass('Accepts valid password (8+ chars, letter + number)');
else fail('Should accept valid password', good.message);

// 3. Word query validation regex
console.log('\n3. Word-of-the-day query validation');
const WORD_QUERY_RE = /^[a-zA-Z-]{1,50}$/;
const validWords = ['hello', 'well-known', 'A'];
const invalidWords = ['hello world', 'test123', '', 'a'.repeat(51), '<script>'];

validWords.forEach((w) => {
  if (WORD_QUERY_RE.test(w)) pass(`Allows "${w}"`);
  else fail(`Should allow "${w}"`);
});

invalidWords.forEach((w) => {
  if (!WORD_QUERY_RE.test(w)) pass(`Rejects invalid "${w.slice(0, 20)}${w.length > 20 ? '…' : ''}"`);
  else fail(`Should reject invalid "${w}"`);
});

// 4. npm audit summary
console.log('\n4. npm audit summary');
try {
  const auditJson = execSync('npm audit --json', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const audit = JSON.parse(auditJson);
  const meta = audit.metadata?.vulnerabilities || {};
  console.log('  Audit counts:', JSON.stringify(meta));
  const critical = meta.critical || 0;
  const high = meta.high || 0;
  if (critical === 0 && high === 0) {
    pass('No critical or high vulnerabilities');
  } else {
    fail(`${critical} critical and ${high} high vulnerabilities remain — run npm audit fix`);
  }
} catch (err) {
  const stdout = err.stdout?.toString() || '';
  try {
    const audit = JSON.parse(stdout);
    const meta = audit.metadata?.vulnerabilities || {};
    console.log('  Audit counts:', JSON.stringify(meta));
  } catch {
    fail('npm audit failed to run', err.message?.slice(0, 120));
  }
}

console.log('\n=== Summary ===');
if (failed === 0) {
  console.log('All automated checks passed.\n');
  process.exit(0);
}
console.error(`${failed} check(s) failed.\n`);
process.exit(1);
