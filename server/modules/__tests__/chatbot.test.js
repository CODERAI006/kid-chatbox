/**
 * Unit tests for intent classifier (node:test).
 * Run: npm run test:chatbot
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyIntent, shouldUseDataAgent } = require('../chatbot/agents/intentClassifier');
const { resolveAccessScope, validatePlanAccess } = require('../permissions/chatAccessPolicy');

describe('intentClassifier', () => {
  it('detects weakness questions', () => {
    const r = classifyIntent('What are my weaknesses in Mathematics?');
    assert.equal(r.isAnalytics, true);
    assert.equal(r.intent, 'weakness_analysis');
  });

  it('detects score trend questions', () => {
    const r = classifyIntent('Why are my scores dropping over the last 3 months?');
    assert.equal(r.isAnalytics, true);
    assert.equal(r.intent, 'score_trend');
  });

  it('ignores generic tutoring questions', () => {
    const r = classifyIntent('Explain photosynthesis in simple terms');
    assert.equal(r.isAnalytics, false);
  });

  it('forces analytics mode when requested', () => {
    assert.equal(shouldUseDataAgent('hello', 'analytics'), true);
  });
});

describe('chatAccessPolicy', () => {
  it('grants school-wide access to admin', () => {
    const scope = resolveAccessScope({
      id: 'u1',
      roles: ['admin'],
      permissions: [],
      status: 'approved',
    });
    assert.equal(scope.level, 'school_wide');
    assert.equal(scope.canQueryUsers, true);
  });

  it('restricts student to self', () => {
    const scope = resolveAccessScope({
      id: 'u2',
      roles: ['student'],
      permissions: [],
      status: 'approved',
    });
    assert.equal(scope.level, 'self');
    assert.equal(scope.canQueryUsers, false);
  });

  it('blocks school-wide plan for students', () => {
    const scope = resolveAccessScope({
      id: 'u2',
      roles: ['student'],
      status: 'approved',
    });
    const check = validatePlanAccess(
      { scope: 'school_wide', includesUserBreakdown: true },
      scope
    );
    assert.equal(check.allowed, false);
  });

  it('allows aggregated analytics for content_manager', () => {
    const scope = resolveAccessScope({
      id: 'u3',
      roles: ['content_manager'],
      status: 'approved',
    });
    assert.equal(scope.level, 'aggregated');
    assert.equal(scope.canQueryUsers, true);
  });
});
