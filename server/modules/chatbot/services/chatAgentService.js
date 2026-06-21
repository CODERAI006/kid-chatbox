/**
 * Orchestrates the database-aware AI agent pipeline.
 * Auth → Intent → Plan → Execute (RBAC) → Analyze → Ollama → Response
 */

const { ollamaChat, isLlmConfigured } = require('../../../utils/ollamaClient');
const { resolveAccessScope } = require('../../permissions/chatAccessPolicy');
const { classifyIntent } = require('../agents/intentClassifier');
const { planQueries } = require('../agents/queryPlanner');
const { executePlans } = require('../rag/queryExecutor');
const { analyzeRetrievedData } = require('../agents/dataAnalyzer');
const { buildAnalysisContext, hasUsableData } = require('../rag/contextBuilder');
const {
  buildAnalysisMessages,
  NO_DATA_RESPONSE,
} = require('../prompts/analysisPrompt');
const { getRegistry } = require('../../database-schema/schemaRegistry');

/**
 * @param {object} params
 * @param {object} params.user — req.user from JWT middleware
 * @param {string} params.question
 * @param {string} [params.logContext]
 */
async function runChatAgent({ user, question, logContext = 'chatbot.agent' }) {
  const accessScope = resolveAccessScope(user);
  if (accessScope.deniedReason) {
    return {
      content: accessScope.deniedReason,
      dataBacked: false,
      intent: null,
      model: null,
    };
  }

  const { intent, confidence } = classifyIntent(question);
  const registry = getRegistry();

  if (!registry.tables.length) {
    return {
      content:
        'Performance analysis is temporarily unavailable (schema not loaded). Please try again shortly.',
      dataBacked: false,
      intent,
      model: null,
    };
  }

  const plans = planQueries(intent || 'general_performance', accessScope);
  const queryResults = await executePlans(plans, accessScope);
  const analysis = analyzeRetrievedData(queryResults, intent);

  if (!hasUsableData(analysis)) {
    return {
      content: NO_DATA_RESPONSE(user.name),
      dataBacked: true,
      intent,
      confidence,
      analysis: { empty: true },
      model: null,
    };
  }

  if (!isLlmConfigured()) {
    return {
      content: formatOfflineAnalysis(analysis, user.name),
      dataBacked: true,
      intent,
      confidence,
      analysis,
      model: null,
    };
  }

  const contextText = buildAnalysisContext(user, question, analysis);
  const messages = buildAnalysisMessages(user, question, contextText);

  const { content, model } = await ollamaChat({
    messages,
    temperature: 0.35,
    num_predict: 2048,
    logContext: `${logContext} intent=${intent}`,
  });

  return {
    content,
    dataBacked: true,
    intent,
    confidence,
    analysis,
    model,
    dataSources: analysis.dataSources,
  };
}

function formatOfflineAnalysis(analysis, userName) {
  const lines = [`Performance summary for ${userName || 'you'}:`];
  if (analysis.weaknesses.length) {
    lines.push(
      `\nWeak areas: ${analysis.weaknesses.map((w) => `${w.subject} (${w.avgScore}%)`).join(', ')}`
    );
  }
  if (analysis.strengths.length) {
    lines.push(
      `Strong areas: ${analysis.strengths.map((s) => `${s.subject} (${s.avgScore}%)`).join(', ')}`
    );
  }
  lines.push(`Trend: ${analysis.trends.direction} (${analysis.trends.delta}%)`);
  if (analysis.progress) {
    lines.push(`Learning progress: ${analysis.progress.avgProgress}% average`);
  }
  lines.push('\n(AI analysis unavailable — Ollama is disabled.)');
  return lines.join('\n');
}

module.exports = { runChatAgent, formatOfflineAnalysis };
