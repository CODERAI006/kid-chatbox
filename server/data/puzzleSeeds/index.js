/**
 * Combined puzzle seed bank — all categories.
 */

const math = require('./math');
const logic = require('./logic');
const language = require('./language');
const scienceGk = require('./scienceGk');
const misc = require('./misc');
const innovative = require('./innovative');
const gkCivicFinance = require('./gkCivicFinance');

const ALL_SEED_PUZZLES = [...math, ...logic, ...language, ...scienceGk, ...misc, ...innovative, ...gkCivicFinance];

module.exports = { ALL_SEED_PUZZLES };
