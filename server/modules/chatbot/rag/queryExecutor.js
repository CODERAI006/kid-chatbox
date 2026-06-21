/**
 * Safe, parameterized SQL execution — never runs raw LLM-generated SQL.
 */

const { pool } = require('../../../config/database');
const { getTable, pickColumn } = require('../../database-schema/schemaRegistry');
const { validatePlanAccess } = require('../../permissions/chatAccessPolicy');

const IDENT_RE = /^[a-z_][a-z0-9_]*$/i;

function quoteIdent(name) {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

/**
 * @param {object} plan
 * @param {{ level: string, userId: string, canQueryUsers: boolean }} accessScope
 */
async function executePlan(plan, accessScope) {
  const check = validatePlanAccess(plan, accessScope);
  if (!check.allowed) {
    return { planId: plan.id, error: check.reason, rows: [] };
  }

  const tableMeta = getTable(plan.table);
  if (!tableMeta) {
    return { planId: plan.id, error: `Table not in registry: ${plan.table}`, rows: [] };
  }

  try {
    if (plan.purpose === 'performance_scores') {
      return await fetchPerformanceData(plan, accessScope, tableMeta);
    }
    if (plan.purpose === 'learning_progress') {
      return await fetchProgressData(plan, accessScope, tableMeta);
    }
    if (plan.purpose === 'study_activity') {
      return await fetchStudyActivity(plan, accessScope, tableMeta);
    }
    if (plan.purpose === 'quiz_attempts') {
      return await fetchQuizAttemptsRank(plan, accessScope, tableMeta);
    }
    return { planId: plan.id, error: 'Unsupported plan purpose', rows: [] };
  } catch (err) {
    console.error(`[QueryExecutor] ${plan.id} failed:`, err.message || err);
    return { planId: plan.id, error: 'Data retrieval failed', rows: [] };
  }
}

async function fetchPerformanceData(plan, accessScope, tableMeta) {
  const t = quoteIdent(plan.table);
  const scoreCol = quoteIdent(
    pickColumn(tableMeta, ['score_percentage', 'score', 'marks']) || 'score_percentage'
  );
  const subjectCol = pickColumn(tableMeta, ['subject', 'topic', 'subtopic']);
  const tsCol = pickColumn(tableMeta, ['timestamp', 'exam_date', 'created_at', 'completed_at']);
  const userCol = pickColumn(tableMeta, ['user_id']);

  const params = [];
  let where = '';

  if (userCol && accessScope.level !== 'school_wide') {
    params.push(accessScope.userId);
    where = `WHERE ${quoteIdent(userCol)} = $1`;
  }

  if (plan.includesUserBreakdown && accessScope.canQueryUsers) {
    const nameJoin =
      accessScope.level === 'school_wide'
        ? `LEFT JOIN "users" u ON u.id = ${t}.${quoteIdent(userCol)}`
        : '';
    const sql = `
      SELECT ${t}.${quoteIdent(userCol)} AS user_id,
             ${nameJoin ? 'u.name AS user_name,' : ''}
             ${subjectCol ? `${t}.${quoteIdent(subjectCol)} AS subject,` : ''}
             AVG(${scoreCol})::numeric(10,2) AS avg_score,
             COUNT(*)::int AS attempt_count
      FROM ${t} ${nameJoin}
      ${where}
      GROUP BY ${t}.${quoteIdent(userCol)}${nameJoin ? ', u.name' : ''}${subjectCol ? `, ${t}.${quoteIdent(subjectCol)}` : ''}
      ORDER BY avg_score ASC
      LIMIT $${params.length + 1}
    `;
    params.push(plan.limit || 15);
    const result = await pool.query(sql, params);
    return { planId: plan.id, purpose: plan.purpose, rows: result.rows };
  }

  const subjectSelect = subjectCol
    ? `${quoteIdent(subjectCol)} AS subject,`
    : '';
  const orderBy = tsCol ? `${quoteIdent(tsCol)} DESC` : `${scoreCol} DESC`;

  const recentSql = `
    SELECT ${subjectSelect}
           ${scoreCol} AS score,
           ${tsCol ? `${quoteIdent(tsCol)} AS recorded_at,` : ''}
           ${userCol ? `${quoteIdent(userCol)} AS user_id` : 'NULL AS user_id'}
    FROM ${t}
    ${where}
    ORDER BY ${orderBy}
    LIMIT $${params.length + 1}
  `;
  params.push(plan.limit || 12);
  const recent = await pool.query(recentSql, params);

  let subjectAvg = [];
  if (subjectCol) {
    const avgParams = accessScope.level === 'school_wide' ? [] : [accessScope.userId];
    const avgWhere =
      accessScope.level === 'school_wide'
        ? ''
        : `WHERE ${quoteIdent(userCol)} = $1`;
    const avgSql = `
      SELECT ${quoteIdent(subjectCol)} AS subject,
             AVG(${scoreCol})::numeric(10,2) AS avg_score,
             COUNT(*)::int AS quiz_count
      FROM ${t}
      ${avgWhere}
      GROUP BY ${quoteIdent(subjectCol)}
      ORDER BY avg_score ASC
    `;
    const avgResult = await pool.query(avgSql, avgParams);
    subjectAvg = avgResult.rows;
  }

  return {
    planId: plan.id,
    purpose: plan.purpose,
    rows: recent.rows,
    aggregates: { subjectAverages: subjectAvg },
  };
}

async function fetchProgressData(plan, accessScope, tableMeta) {
  const t = quoteIdent(plan.table);
  const userCol = quoteIdent(pickColumn(tableMeta, ['user_id']) || 'user_id');
  const progressCol = quoteIdent(
    pickColumn(tableMeta, ['progress_percentage', 'progress_percent']) || 'progress_percentage'
  );
  const completedCol = pickColumn(tableMeta, ['is_completed']);
  const timeCol = pickColumn(tableMeta, ['time_spent']);
  const orderCol = pickColumn(tableMeta, ['last_accessed', 'updated_at', 'created_at']);

  const sql = `
    SELECT ${progressCol} AS progress,
           ${completedCol ? `${quoteIdent(completedCol)} AS is_completed,` : ''}
           ${timeCol ? `${quoteIdent(timeCol)} AS time_spent,` : ''}
           subtopic_id
    FROM ${t}
    WHERE ${userCol} = $1
    ORDER BY ${orderCol ? `${quoteIdent(orderCol)} DESC NULLS LAST` : '1 DESC'}
    LIMIT $2
  `;
  const result = await pool.query(sql, [accessScope.userId, plan.limit || 20]);
  return { planId: plan.id, purpose: plan.purpose, rows: result.rows };
}

async function fetchStudyActivity(plan, accessScope, tableMeta) {
  const t = quoteIdent(plan.table);
  const userCol = quoteIdent(pickColumn(tableMeta, ['user_id']) || 'user_id');
  const subjectCol = pickColumn(tableMeta, ['subject']);
  const titleCol = pickColumn(tableMeta, ['lesson_title', 'topic', 'title']);
  const tsCol = pickColumn(tableMeta, ['timestamp', 'created_at']);

  const sql = `
    SELECT ${subjectCol ? `${quoteIdent(subjectCol)} AS subject,` : ''}
           ${titleCol ? `${quoteIdent(titleCol)} AS title,` : ''}
           ${tsCol ? `${quoteIdent(tsCol)} AS recorded_at` : 'NULL AS recorded_at'}
    FROM ${t}
    WHERE ${userCol} = $1
    ORDER BY ${tsCol ? `${quoteIdent(tsCol)} DESC` : '1 DESC'}
    LIMIT $2
  `;
  const result = await pool.query(sql, [accessScope.userId, plan.limit || 10]);
  return { planId: plan.id, purpose: plan.purpose, rows: result.rows };
}

async function fetchQuizAttemptsRank(plan, accessScope, tableMeta) {
  const t = quoteIdent(plan.table);
  const userCol = quoteIdent(pickColumn(tableMeta, ['user_id']) || 'user_id');
  const scoreCol = quoteIdent(
    pickColumn(tableMeta, ['score_percentage', 'score']) || 'score_percentage'
  );

  const sql = `
    SELECT ${userCol} AS user_id,
           u.name AS user_name,
           AVG(${scoreCol})::numeric(10,2) AS avg_score,
           COUNT(*)::int AS attempt_count
    FROM ${t}
    LEFT JOIN "users" u ON u.id = ${t}.${userCol}
    GROUP BY ${userCol}, u.name
    ORDER BY avg_score ASC
    LIMIT $1
  `;
  const result = await pool.query(sql, [plan.limit || 15]);
  return { planId: plan.id, purpose: plan.purpose, rows: result.rows };
}

/**
 * @param {object[]} plans
 * @param {object} accessScope
 */
async function executePlans(plans, accessScope) {
  const results = [];
  for (const plan of plans) {
    results.push(await executePlan(plan, accessScope));
  }
  return results;
}

module.exports = { executePlan, executePlans, quoteIdent };
