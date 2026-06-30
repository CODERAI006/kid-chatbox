/**
 * JSON schema for the 18-section visual-first study page prompt.
 */
import { STUDY_PROMPT_LIMITS } from '@/utils/studyPromptLimits';

export const STUDY_VISUAL_SPEC = `{
  "type": "flowchart|mindmap|timeline|comparison|infographic|decision-tree|process|cycle|tree|icon-grid|diagram|table",
  "title": "optional",
  "nodes": [{"id":"n1","label":"Text","icon":"emoji","color":"blue","highlight":false}],
  "connections": [{"from":"n1","to":"n2","label":"optional"}],
  "labels": ["optional labels"],
  "icons": ["emoji list"],
  "colors": {"n1":"blue"},
  "animation": [{"step":1,"action":"highlight|reveal|pulse|connect","targetIds":["n1"],"label":"optional"}],
  "headers": ["for tables"],
  "rows": [["cell","cell"]]
}`;

export const STUDY_SECTION_SPEC = `{
  "id": "unique-id",
  "title": "Section title",
  "type": "hero|why-learn|big-picture|roadmap|concept-cards|infographics|memory-aids|learning-steps|real-life|common-mistakes|remember-this|cheat-sheet|flashcards|quick-quiz|knowledge-check|ask-ai|final-revision|celebration",
  "order": 1,
  "icon": "emoji",
  "learningObjective": "One sentence: what the student learns here",
  "visual": ${STUDY_VISUAL_SPEC.replace(/\n/g, ' ')},
  "interactions": {"type":"flip|tap|drag|select","hint":"optional"},
  "content": {}
}`;

export const STUDY_INTERACTIVE_JSON_SCHEMA = `{
  "title": "Engaging topic title",
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "order": 1,
      "icon": "📘",
      "title": "Topic Name",
      "learningObjective": "Know what you will learn and how long it takes",
      "visual": { "type": "icon-grid", "nodes": [{"id":"hero","label":"Topic illustration","icon":"📘"}] },
      "content": {
        "topicName": "string",
        "difficulty": "Beginner|Intermediate|Advanced",
        "estimatedTime": "e.g. 20 mins",
        "grade": "Grade 5",
        "subject": "Math",
        "description": "One line only — max 15 words",
        "heroEmoji": "📘"
      }
    },
    {
      "id": "why-learn",
      "type": "why-learn",
      "order": 2,
      "content": { "cards": [{"icon":"🛒","title":"Shopping","sentence":"One sentence only."}] }
    },
    {
      "id": "big-picture",
      "type": "big-picture",
      "order": 3,
      "visual": { "type": "infographic", "nodes": [], "connections": [] },
      "content": { "caption": "One line describing the big picture" }
    },
    {
      "id": "roadmap",
      "type": "roadmap",
      "order": 4,
      "content": { "steps": [{"label":"What is X?","completed":true,"icon":"✅"}] }
    },
    {
      "id": "concepts",
      "type": "concept-cards",
      "order": 5,
      "content": {
        "cards": [{
          "title": "Concept name",
          "definition": "Max 2 lines",
          "steps": [{"step":1,"title":"Step 1","detail":"Short action"}],
          "example": "Real example",
          "practice": {"question":"...","hint":"...","answer":"..."},
          "commonMistake": "One line",
          "memoryTrick": "One line mnemonic",
          "quickRecap": "One line"
        }]
      }
    },
    {
      "id": "infographics",
      "type": "infographics",
      "order": 6,
      "visual": { "type": "flowchart", "nodes": [], "connections": [] },
      "content": { "caption": "What this diagram shows" }
    },
    {
      "id": "memory-aids",
      "type": "memory-aids",
      "order": 7,
      "content": { "aids": [{"title":"VXV trick","remember":"Vertical-Cross-Vertical","visual":{}}] }
    },
    {
      "id": "learning-steps",
      "type": "learning-steps",
      "order": 8,
      "content": { "steps": [{"label":"Highlight step 1","description":"What animates"}] },
      "visual": { "type": "process", "animation": [] }
    },
    {
      "id": "real-life",
      "type": "real-life",
      "order": 9,
      "content": { "cards": [{"category":"Shopping","icon":"🛒","sentence":"One sentence"}] }
    },
    {
      "id": "common-mistakes",
      "type": "common-mistakes",
      "order": 10,
      "content": { "mistakes": [{"mistake":"...","why":"...","fix":"..."}] }
    },
    {
      "id": "remember-this",
      "type": "remember-this",
      "order": 11,
      "content": { "bullets": ["Max 8 high-value bullets"] }
    },
    {
      "id": "cheat-sheet",
      "type": "cheat-sheet",
      "order": 12,
      "content": { "items": [{"label":"Formula","value":"..."}] }
    },
    {
      "id": "flashcards",
      "type": "flashcards",
      "order": 13,
      "content": { "cards": [{"front":"Question?","back":"Max 2 lines"}] }
    },
    {
      "id": "quick-quiz",
      "type": "quick-quiz",
      "order": 14,
      "content": {
        "questions": [{
          "difficulty": "easy|medium|hard",
          "question": "...",
          "options": ["A","B","C","D"],
          "correctIndex": 0,
          "explanation": "Why correct",
          "whyWrong": ["Why B is wrong","Why C is wrong"]
        }]
      }
    },
    {
      "id": "knowledge-check",
      "type": "knowledge-check",
      "order": 15,
      "content": {
        "items": [{
          "kind": "true-false|fill-blank|match|sequence|label",
          "prompt": "...",
          "answer": "string or boolean",
          "options": ["optional"],
          "pairs": [{"left":"A","right":"1"}],
          "sequence": ["step1","step2"],
          "labels": ["part A","part B"]
        }]
      }
    },
    {
      "id": "ask-ai",
      "type": "ask-ai",
      "order": 16,
      "content": { "suggestedQuestions": ["Concept-specific doubt — not generic"] }
    },
    {
      "id": "final-revision",
      "type": "final-revision",
      "order": 17,
      "visual": { "type": "mindmap", "nodes": [], "connections": [] },
      "content": {
        "keyFormulas": ["..."],
        "examTips": ["..."],
        "timeSavingTricks": ["..."]
      }
    },
    {
      "id": "celebration",
      "type": "celebration",
      "order": 18,
      "content": {
        "progressPercent": 100,
        "xp": 150,
        "stars": 3,
        "achievement": "Topic Master!",
        "nextTopic": "Suggested next topic"
      }
    }
  ]
}`;

export const STUDY_INTERACTIVE_STYLE_RULES = `
DESIGN RULES (CRITICAL):
- Visual-first, NOT textbook. Max 3 lines per paragraph. One idea per sentence.
- Every section answers ONE learning question. Student interacts more than they read.
- Each concept learnable in under 2 minutes. Mobile-first. Age-appropriate simple English.
- NO long essays. NO repetitive explanations. NO SVG/HTML — only structured JSON visuals.
- Hero description: max 15 words. Definitions: max 2 lines. Flashcard backs: max 2 lines.
- Generate concept-specific AI questions — NOT "What is X?" generic prompts.
- Quick quiz: progress easy → medium → hard (at least 2+3+2 questions).
- Flashcards: at least ${STUDY_PROMPT_LIMITS.minFlashcards} cards.
- Concept cards: at least 3 concepts with visual, steps, practice, memory trick.
- Why-learn cards: 3-5 cards. Real-life cards: 5-6 categories.
- Remember-this: max 8 bullets. Cheat sheet: fits one mobile screen (6-10 items).
- Every major section MUST include a visual field with nodes/connections.
- Return ONLY valid JSON. No markdown fences.`;
