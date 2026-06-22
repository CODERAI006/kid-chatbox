/**
 * JSON schema fragment for the 32-section study module prompt.
 * Kept separate to keep prompt builder under 300 lines.
 */

export const STUDY_MODULE_JSON_SCHEMA = `{
  "lessonHeader": {
    "topicName": "string",
    "subject": "string",
    "grade": "string",
    "difficultyLevel": "Beginner|Intermediate|Advanced",
    "estimatedLearningTime": "e.g. 25 minutes",
    "learningObjectives": ["5-8 measurable objectives"]
  },
  "title": "Engaging chapter title",
  "whyLearnThis": "Why it matters — daily life, future learning, real world (simple language)",
  "quickSummary": ["5-10 one-line revision bullets"],
  "introduction": {
    "text": "STORY HOOK: 300-500 words, relatable child protagonist, curiosity, real-world links, ends with a question. Use \\\\n\\\\n between paragraphs."
  },
  "visualLearningDescription": ["Diagram descriptions + ASCII sketches where helpful"],
  "concepts": [{
    "name": "Concept name",
    "definition": "Short definition",
    "explanation": "Step-by-step explanation",
    "example": "Concrete example",
    "nonExample": "What it is NOT",
    "commonMistake": "Typical student error",
    "checkQuestion": "Quick check question"
  }],
  "realWorldConnections": {
    "dailyLife": ["examples"],
    "local": ["examples"],
    "national": ["examples"],
    "global": ["examples"]
  },
  "memoryTricks": ["Mnemonics, acronyms, analogies, visual hooks"],
  "explanation": ["Step-by-step concept walkthrough (backup to concepts array)"],
  "realLifeAnalogy": "One vivid analogy",
  "examples": ["At least 3 real-world examples"],
  "keyTerms": [{"term": "Word", "definition": "Meaning", "easyExample": "Kid-friendly example"}],
  "funFacts": ["5-10 surprising accurate facts"],
  "didYouKnow": ["5 trivia points"],
  "thinkingQuestions": ["5 Think & Answer questions requiring reasoning"],
  "comparisons": [{
    "title": "e.g. Mountain vs Plateau",
    "leftTitle": "Side A",
    "leftPoints": ["bullet points"],
    "rightTitle": "Side B",
    "rightPoints": ["bullet points"]
  }],
  "misconceptions": [{"wrong": "Wrong idea", "correct": "Correct understanding"}],
  "examPrep": {
    "easy": [{"question": "...", "answer": "..."}],
    "medium": [{"question": "...", "answer": "..."}],
    "difficult": [{"question": "...", "answer": "..."}]
  },
  "mcqs": [{
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "Why this is correct"
  }],
  "trueFalse": [{"statement": "...", "answer": true}],
  "fillBlanks": [{"sentence": "The ___ is...", "answer": "word"}],
  "matchFollowing": [{"left": "Term", "right": "Match"}],
  "shortAnswer": [{"question": "...", "answer": "model answer"}],
  "longAnswer": [{"question": "...", "answer": "model answer paragraph"}],
  "caseStudies": [{
    "scenario": "Real-world scenario",
    "questions": [{"question": "...", "answer": "..."}]
  }],
  "activities": [{
    "title": "Activity name",
    "materials": ["safe household items"],
    "steps": ["step 1"],
    "expectedLearning": "What the student learns"
  }],
  "projectWork": {
    "miniProject": "...",
    "researchActivity": "...",
    "presentationIdea": "...",
    "creativeAssignment": "..."
  },
  "gamifiedChallenges": {
    "explorerMission": "...",
    "detectiveMission": "...",
    "quizChallenge": "...",
    "observationChallenge": "...",
    "rewardSystem": "...",
    "badges": ["badge names"]
  },
  "flashcards": [{"front": "Question ending with ?", "back": "Short answer"}],
  "oneMinuteRevision": ["10 ultra-short bullets for 60-second revision"],
  "hotQuestions": {
    "critical": ["5 critical thinking questions"],
    "creative": ["5 creative thinking questions"],
    "analytical": ["5 analytical questions"]
  },
  "aiTutorQa": [{"question": "Likely student question", "answer": "Teacher-like answer"}],
  "discussionPrompts": ["5 parent/teacher discussion prompts"],
  "learningLevels": {
    "beginner": [{"question": "...", "answer": "..."}],
    "intermediate": [{"question": "...", "answer": "..."}],
    "advanced": [{"question": "...", "answer": "..."}],
    "challenge": [{"question": "...", "answer": "..."}]
  },
  "learningOutcomes": ["Measurable: I can define...", "I can explain...", "I can compare...", "I can apply...", "I can analyze..."],
  "commonMistakes": ["Legacy: mistake and fix strings"],
  "examNotes": ["Board-focused exam tips"],
  "quizQuestions": [{"question": "...", "answer": "...", "hint": "optional"}],
  "askAiTeacherPrompts": ["15 likely student questions (no answers here)"],
  "keyPoints": ["Exactly 20 short key points"],
  "summary": "Encouraging closing paragraph"
}`;

export const STUDY_MODULE_STYLE_RULES = `
STYLE RULES:
- Extremely engaging, child-friendly, accurate, curriculum-aligned.
- Short paragraphs, high readability, rich examples.
- Avoid jargon; encourage curiosity, critical thinking, and self-learning.
- Output should feel like a premium educational product, not textbook notes.
- Keep strings concise so the full JSON fits in one response.
- Return ONLY valid JSON. No markdown fences.`;
