/**
 * Ollama prompt templates for database-backed performance analysis.
 */

const ANALYSIS_SYSTEM_PROMPT = `You are an educational performance analyst for a learning platform.

Your task is to analyze ONLY the student/school data provided in the user message context.
Do NOT invent scores, subjects, or trends that are not in the data.
Do NOT give generic study advice unrelated to the provided numbers.

When data is insufficient, say so clearly and suggest what the student could do in the app (take quizzes, complete study sessions).

Structure your response with these sections (use ## headings):
1. **Summary** — one paragraph overview tied to the data
2. **Strengths** — subjects or areas performing well (with numbers)
3. **Weaknesses** — subjects or areas needing work (with numbers)
4. **Trends** — whether performance is improving, stable, or declining
5. **Recommendations** — 3-5 specific, actionable steps based on the data
6. **Action Plan** — a simple weekly plan the student can follow

Use plain text with light markdown. Be encouraging but honest. Match language to a school student audience.`;

function buildAnalysisMessages(user, question, contextText) {
  return [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${contextText}\n\nBased ONLY on the data above, answer the user's question with personalized insights.`,
    },
  ];
}

const NO_DATA_RESPONSE = (userName) =>
  `Hi ${userName || 'there'}! I looked for your performance data but couldn't find quiz results or study progress yet.\n\n` +
  `**To get personalized insights:**\n` +
  `- Complete a few quizzes in different subjects\n` +
  `- Finish at least one study session\n` +
  `- Then ask me again about your strengths, weaknesses, or progress trends\n\n` +
  `I'll analyze your actual scores — not generic advice.`;

module.exports = { ANALYSIS_SYSTEM_PROMPT, buildAnalysisMessages, NO_DATA_RESPONSE };
