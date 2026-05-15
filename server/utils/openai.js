/**
 * Server-side AI quiz generation via local Ollama (POST /api/chat).
 * @see docs/ollama-api.md
 */

const { ollamaChat, isLlmConfigured, getOllamaLogMode } = require('./ollamaClient');

/**
 * Generates quiz questions using local Ollama
 * @param {Object} config - Quiz configuration
 * @param {number} config.numberOfQuestions - Number of questions to generate
 * @param {string} config.difficulty - Difficulty level (Basic, Advanced, Expert, Mix)
 * @param {string[]} config.topics - Array of topic names
 * @param {string} config.ageGroup - Age group (e.g., "6-8", "9-11", "12-14")
 * @param {string} config.language - Language preference
 * @param {string} config.subtopicId - Subtopic ID for context
 * @param {string} config.description - Quiz description/context for better question generation
 * @param {string} config.gradeLevel - Optional grade/class level
 * @param {string} config.sampleQuestion - Optional sample question pattern
 * @param {string} config.examStyle - Optional exam style (CBSE, NCERT, Olympiad, competitive)
 * @returns {Promise<Array>} Array of generated questions
 */
async function generateQuizQuestions(config) {
  const {
    numberOfQuestions = 15,
    difficulty = 'Basic',
    topics = [],
    language = 'English',
    subtopicId,
    description,
    gradeLevel,
    sampleQuestion,
    examStyle,
  } = config;

  if (!isLlmConfigured()) {
    throw new Error(
      'Ollama is disabled (OLLAMA_DISABLED). Unset it and ensure Ollama is running.'
    );
  }

  // Determine difficulty level
  let difficultyLevel = 'medium';
  let questionLength = 'Write clear, well-structured questions.';
  let answerDepth = '';

  switch (difficulty) {
    case 'Basic':
      difficultyLevel = 'easy';
      questionLength = 'Keep questions short and simple (1 line maximum). Direct recall or recognition.';
      answerDepth = 'Explanations should be clear and brief (3-4 sentences). Confirm the correct answer and briefly state why it is right.';
      break;
    case 'Advanced':
      difficultyLevel = 'moderately challenging';
      questionLength = 'Each question MUST be 2-3 lines long. Include context, scenario, or background information before the question. Questions should require reasoning and application of knowledge, not just recall.';
      answerDepth = `Explanations MUST be highly descriptive and educational (minimum 3 full paragraphs):
   - Paragraph 1: Explain the correct answer in depth — the underlying concept, rule, or principle, with real-world application.
   - Paragraph 2: Explain WHY each wrong option is incorrect, identifying the misconception or error in each.
   - Paragraph 3: Provide additional learning context — related concepts, examples, or tips to reinforce understanding.`;
      break;
    case 'Expert':
      difficultyLevel = 'challenging and analytical';
      questionLength = 'Each question MUST be 2-3 lines long. Questions must involve complex scenarios, multi-step reasoning, analysis, or synthesis of concepts. Require critical thinking and deep understanding — no simple recall questions.';
      answerDepth = `Explanations MUST be comprehensive and deeply analytical (minimum 4 full paragraphs):
   - Paragraph 1: Provide a thorough explanation of why the correct answer is right, including the full concept, formula, or logic chain.
   - Paragraph 2: Analyze each incorrect option individually — explain the specific misconception, error in reasoning, or why it seems plausible but is wrong.
   - Paragraph 3: Provide broader context — related advanced concepts, edge cases, exceptions, or how this topic connects to other areas.
   - Paragraph 4: Include a real-world example, application, or further study guidance to reinforce mastery.`;
      break;
    case 'Mix':
      difficultyLevel = 'varied - mix of easy, medium, and challenging';
      questionLength = 'Mix question lengths and styles: some short (1 line, basic recall), some medium (2 lines, application), some complex (2-3 lines, analysis/scenario). Distribute difficulty evenly across the question set.';
      answerDepth = 'Match explanation depth to question difficulty: brief for easy questions (3-4 sentences), detailed for medium questions (2 paragraphs), comprehensive for hard questions (3+ paragraphs with concept breakdown and misconception analysis).';
      break;
  }

  const languageInstruction =
    language === 'Hindi'
      ? 'Use mostly Hindi with simple words. Use Devanagari script if possible, otherwise Roman script.'
      : language === 'English'
      ? 'Use only English.'
      : 'Mix simple Hindi and English, but keep it clear.';

  const topicsText = topics.length === 1 ? topics[0] : topics.join(', ');
  
  // Fetch subtopic description if subtopicId is provided but no description given
  let finalDescription = description;
  if (subtopicId && !finalDescription) {
    try {
      const { pool } = require('../config/database');
      const subtopicResult = await pool.query(
        'SELECT description, title FROM subtopics WHERE id = $1',
        [subtopicId]
      );
      if (subtopicResult.rows.length > 0 && subtopicResult.rows[0].description) {
        finalDescription = `${subtopicResult.rows[0].title}: ${subtopicResult.rows[0].description}`;
      }
    } catch (error) {
      console.warn('Could not fetch subtopic description:', error.message);
    }
  }
  
  // Include description in the prompt if provided
  const descriptionContext = finalDescription 
    ? `\nQuiz Context/Description: ${finalDescription}\nUse this description to understand the quiz's purpose and generate questions that align with this context.`
    : '';

  // Build additional context fields
  const gradeLevelContext = gradeLevel
    ? `Grade/Class Level: ${gradeLevel}\n`
    : '';

  const sampleQuestionContext = sampleQuestion
    ? `\nSample Question Pattern:\n${sampleQuestion}\n\nUse this as a reference for the style and format of questions to generate. Follow similar patterns, complexity, and structure.\n`
    : '';

  const examStyleContext = examStyle
    ? `Exam Style: ${examStyle}\n\nGenerate questions that align with ${examStyle} exam standards and patterns. For CBSE, follow CBSE curriculum and question formats. For NCERT, align with NCERT textbook style. For Olympiad, include more challenging and analytical questions. For competitive exams, focus on application-based and reasoning questions.\n`
    : '';

  // Add timestamp for context
  const currentTimestamp = new Date().toISOString();
  const timestampContext = `Generation Date/Time: ${currentTimestamp}\n\nUse current date context when generating questions, especially for subjects like Current Affairs or recent events.\n`;

  // Build comprehensive mandatory instructions section
  const mandatoryInstructions = `
MANDATORY INSTRUCTIONS - MUST FOLLOW STRICTLY:

1. QUESTION STRUCTURE REQUIREMENTS:
   - Each question MUST have exactly 4 options labeled A, B, C, D
   - Options must be distinct and plausible
   - Only ONE option should be correct
   - Questions must be clear, unambiguous, and grammatically correct
   - Question numbering must start from 1 and increment sequentially

2. DIFFICULTY LEVEL REQUIREMENTS:
   - Difficulty: ${difficultyLevel}
   - Question Length & Style: ${questionLength}
   ${difficulty === 'Advanced' ? '- Questions MUST NOT be one-liners. Always include context or a scenario before the actual question.' : ''}
   ${difficulty === 'Expert' ? '- Questions MUST NOT be one-liners. Each question must present a scenario, problem, or data that requires analysis.' : ''}

4. LANGUAGE REQUIREMENTS:
   ${languageInstruction}
   - Maintain consistency in language throughout all questions
   - Ensure proper grammar and spelling
   - Use appropriate script (Devanagari for Hindi, Roman for English/Hinglish)

5. EDUCATIONAL VALUE REQUIREMENTS:
   - Questions MUST be educational and promote learning
   - Each question should test understanding, not just memorization
   - Include real-world relevance where applicable
   - Questions should encourage critical thinking appropriate for the age group

6. EXPLANATION REQUIREMENTS (CRITICAL - MANDATORY):
   ${answerDepth}
   - STRUCTURE REQUIREMENTS:
     * Start with confirming the correct answer
     * Explain why it's correct with detailed reasoning
     * Address each incorrect option systematically
     * End with additional learning insights or tips
   - USE CLEAR, ENCOURAGING LANGUAGE:
     * Use a positive, educational tone throughout
     * Make explanations clear and easy to understand
     * Avoid unnecessary jargon
   - MAKE EXPLANATIONS EDUCATIONAL:
     * Each explanation should teach something valuable beyond just the answer
     * Provide context that enhances learning
     * Help students understand the concept, not just memorize the answer
   - QUALITY STANDARD: Explanations should be so thorough that a student reading them gains a complete understanding of the concept

7. TOPIC COVERAGE REQUIREMENTS:
   - Topics to cover: ${topicsText}
   ${topics.length > 1 ? '- Distribute questions evenly across all topics' : '- Focus all questions on the specified topic'}
   - Ensure comprehensive coverage of the topic(s)
   - Cover different aspects, subtopics, and concepts within the topic(s)
   - Vary question types and approaches

8. UNIQUENESS AND VARIETY REQUIREMENTS (CRITICAL):
   - NO REPEATED QUESTIONS: Each question MUST be completely unique
   - NO DUPLICATE CONTENT: Do not repeat the same question in different wording
   - NO SIMILAR QUESTIONS: Avoid questions that test the exact same concept or fact
   - VARIETY IN QUESTION TYPES: Mix different question formats (direct, scenario-based, application-based, analysis-based)
   - VARIETY IN CONCEPTS: Cover different aspects, subtopics, and angles of the topic(s)
   - VARIETY IN DIFFICULTY: ${difficulty === 'Mix' ? 'Distribute easy, medium, and challenging questions evenly' : 'Maintain consistent difficulty level'}
   - VARIETY IN QUESTION STRUCTURE: Use different sentence structures and phrasings
   - VARIETY IN CONTEXT: Include different scenarios, examples, and real-world applications
   - Each question should test a DIFFERENT aspect or understanding of the topic
   - Ensure questions complement each other without overlap
   - Review all questions before finalizing to ensure no repetition or similarity

9. CONTEXT AND ALIGNMENT REQUIREMENTS:
   ${descriptionContext}
   ${gradeLevelContext}
   ${examStyleContext}
   ${sampleQuestionContext}
   ${timestampContext}

10. ENGAGEMENT REQUIREMENTS:
    - Make questions interesting and engaging
    - Use scenarios, examples, or relatable contexts where appropriate
    - Avoid dry or boring question formats
    - Encourage curiosity and learning
    - Use age-appropriate examples and references
    - Make questions relatable to children's experiences

11. CONTENT QUALITY REQUIREMENTS:
    - Ensure factual accuracy: All information MUST be correct and up-to-date
    - Use current information, especially for subjects like Current Affairs
    - Verify all dates, names, facts, and figures are accurate
    - Avoid outdated or incorrect information
    - Cross-check concepts against standard educational curricula

12. QUESTION CLARITY REQUIREMENTS:
    - Questions must be clear and unambiguous
    - Avoid double negatives or confusing phrasing
    - Use clear, well-structured language
    - Ensure questions can be understood without additional context
    - Avoid trick questions or overly clever wording
    - Make the intent of each question obvious

13. OPTION QUALITY REQUIREMENTS:
    - All 4 options must be grammatically correct and well-formed
    - Distractors must be plausible but clearly incorrect
    - Avoid obviously wrong options that don't make sense
    - Ensure options are similar in length and complexity
    - Avoid giving away the answer through option structure
    - Make sure correct answer is not always option A (vary positions)

14. EXPLANATION QUALITY REQUIREMENTS (ENHANCED):
    - Explanations MUST be comprehensive, detailed, and thorough
    - MINIMUM LENGTH: 5-7 sentences per explanation (more is preferred)
    - STRUCTURE: Each explanation must include:
      * Clear statement of the correct answer
      * Detailed reasoning for why the correct answer is right
      * Explanation of why EACH incorrect option is wrong (all 3 distractors)
      * Additional context, examples, or related information
      * Learning tips or memory aids
    - CONTENT DEPTH:
      * Explain the underlying concept or principle
      * Provide step-by-step reasoning where applicable
      * Include relevant facts, definitions, or rules
      * Address common misconceptions
      * Connect to real-world applications or examples
    - EDUCATIONAL VALUE:
      * Each explanation should be a mini-lesson
      * Help students understand the concept deeply, not just memorize
      * Provide insights that enhance overall understanding
      * Include connections to related topics or broader concepts
    - LANGUAGE QUALITY:
      * Use clear, accessible language appropriate for the grade level
      * Use simple sentences that are easy to follow
      * Include examples or analogies that aid understanding
      * Use positive, encouraging, and supportive tone
      * Avoid jargon unless necessary and explained
    - COMPLETENESS:
      * Address ALL aspects: correct answer + all 3 incorrect options
      * Leave no option unexplained
      * Ensure comprehensive coverage of the concept
      * Provide enough detail that students can learn from the explanation alone

15. FINAL QUALITY ASSURANCE REQUIREMENTS:
    - Review ALL questions for uniqueness - NO REPEATS
    - Verify no two questions test the same concept identically
    - Check that questions cover diverse aspects of the topic(s)
    - Ensure all questions meet age-appropriateness standards
    - Validate factual accuracy of all content
    - Confirm all explanations are DETAILED, comprehensive, and educational (5-7 sentences minimum)
    - Verify each explanation addresses the correct answer AND all incorrect options
    - Ensure explanations provide deep understanding, not just surface-level information
    - Verify questions align with difficulty level specified
    - Check that language requirements are met throughout
    - Ensure proper formatting and structure
    - Validate that exactly ${numberOfQuestions} unique questions are generated

CRITICAL REMINDERS:
- NO REPEATED QUESTIONS - Each question must be completely unique
- NO SIMILAR QUESTIONS - Avoid testing the same concept multiple times
- MAXIMUM VARIETY - Cover different aspects, use different formats, vary approaches
- DETAILED EXPLANATIONS REQUIRED - Each explanation must be comprehensive (5-7 sentences minimum) addressing correct answer AND all incorrect options
- QUALITY OVER QUANTITY - Better to have fewer high-quality unique questions than repeated ones
- Follow ALL the above requirements. Do not skip any mandatory instruction.`;

  const prompt = `You are an expert educational content creator specializing in creating high-quality quiz questions.

TASK: Generate exactly ${numberOfQuestions} quiz questions.

${mandatoryInstructions}

TOPIC DETAILS:
- Topics: ${topicsText}
${descriptionContext ? `- Quiz Context: ${descriptionContext.replace('Quiz Context/Description: ', '').replace('\nUse this description to understand the quiz\'s purpose and generate questions that align with this context.', '')}` : ''}

CONFIGURATION DETAILS:
- Difficulty Level: ${difficulty} (${difficultyLevel})
- Question Style: ${questionLength}
- Language: ${language}
${gradeLevel ? `- Grade/Class Level: ${gradeLevel}` : ''}
${examStyle ? `- Exam Style: ${examStyle}` : ''}
${sampleQuestion ? `- Sample Question Pattern:\n${sampleQuestion}\n\nUse this as a reference for style and format.` : ''}

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON array with this EXACT structure (no markdown, no additional text):
[
  {
    "number": 1,
    "question": "Question text here (age-appropriate, clear, engaging)",
    "options": {
      "A": "Option A text (plausible distractor)",
      "B": "Option B text (plausible distractor)",
      "C": "Option C text (plausible distractor)",
      "D": "Option D text (plausible distractor)"
    },
    "correctAnswer": "A",
    "explanation": "DETAILED and DESCRIPTIVE explanation following the depth requirements for '${difficulty}' difficulty. Must include: 1) Clear statement of the correct answer and full reasoning, 2) Why each incorrect option is wrong (address all 3 distractors), 3) Additional educational context and real-world examples. ${difficulty === 'Advanced' || difficulty === 'Expert' ? 'Write in multiple paragraphs. Be comprehensive and analytical.' : 'Be thorough and educational.'}"
  },
  {
    "number": 2,
    ...
  }
]

CRITICAL OUTPUT REQUIREMENTS:
- Return EXACTLY ${numberOfQuestions} questions (no more, no less)
- Return ONLY valid JSON (no markdown code blocks, no explanatory text)
- Ensure all questions follow ALL mandatory instructions above
- Validate that each question has exactly 4 options (A, B, C, D)
- CRITICAL: Verify explanations are DETAILED and COMPREHENSIVE (minimum 5-7 sentences, more preferred)
- CRITICAL: Verify each explanation addresses the correct answer AND explains why ALL incorrect options are wrong
- CRITICAL: Ensure explanations provide deep understanding with examples, context, and learning tips
- Confirm questions are age-appropriate and educational
- CRITICAL: Ensure NO REPEATED QUESTIONS - each question must be completely unique
- CRITICAL: Ensure NO SIMILAR QUESTIONS - avoid testing the same concept multiple times
- CRITICAL: Ensure MAXIMUM VARIETY - different aspects, formats, and approaches
- Review all questions before finalizing to eliminate any repetition or similarity

FINAL CHECKLIST BEFORE GENERATING:
✓ All questions are unique (no repeats)
✓ Questions cover different aspects of the topic(s)
✓ Questions use varied formats and approaches
✓ All questions are age-appropriate
✓ All questions are factually accurate
✓ CRITICAL: All explanations are DETAILED (5-7 sentences minimum, more preferred)
✓ CRITICAL: Each explanation addresses the correct answer AND all incorrect options
✓ CRITICAL: Explanations include examples, context, learning tips, and deep understanding
✓ All explanations are educational and comprehensive
✓ All requirements from mandatory instructions are met

Generate the questions now, following ALL requirements strictly. Ensure maximum variety and NO REPEATED QUESTIONS.`;

  const systemMessage =
    'You are a helpful assistant that generates educational quiz questions for children. Always return valid JSON arrays.';

  try {
    if (getOllamaLogMode() !== 'off') {
      const descText = finalDescription || description;
      console.info(
        `[Ollama] ${JSON.stringify({
          event: 'quiz.generate.config',
          numberOfQuestions,
          difficulty,
          topics,
          language,
          subtopicId: subtopicId || null,
          gradeLevel: gradeLevel || null,
          examStyle: examStyle || null,
          sampleQuestionChars: sampleQuestion ? String(sampleQuestion).length : 0,
          hasDescription: Boolean(descText),
          descriptionChars: descText ? String(descText).length : 0,
          systemPromptChars: systemMessage.length,
          userPromptChars: prompt.length,
        })}`
      );
    }

    const { content } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      num_predict: 8192,
      logContext: 'server.generateQuizQuestions',
      // Large prompt + high num_predict often exceeds a few minutes on CPU / cold model
      requestTimeoutMs: 1_800_000,
    });

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const questions = JSON.parse(jsonString);

    // Validate response
    if (!Array.isArray(questions) || questions.length !== numberOfQuestions) {
      throw new Error(
        `Invalid response: Expected ${numberOfQuestions} questions, got ${questions.length}`
      );
    }

    // Validate each question structure
    for (const question of questions) {
      if (
        !question.number ||
        !question.question ||
        !question.options ||
        !question.correctAnswer ||
        !question.explanation
      ) {
        throw new Error('Invalid question structure in API response');
      }

      if (
        !['A', 'B', 'C', 'D'].includes(question.correctAnswer) ||
        !question.options.A ||
        !question.options.B ||
        !question.options.C ||
        !question.options.D
      ) {
        throw new Error('Invalid options or correct answer in question');
      }
    }

    return questions;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse quiz questions. Please try again.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while generating quiz questions');
  }
}

module.exports = { generateQuizQuestions, isLlmConfigured };

