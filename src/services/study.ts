/**
 * Study mode: lessons via backend → local Ollama (see docs/ollama-api.md).
 */

import { QuizConfig } from '@/types/quiz';
import { User } from '@/types';
import { aiApi } from '@/services/api';

export interface Lesson {
  title: string;
  introduction: string;
  explanation: string[]; // Array of pointers/explanations
  keyPoints: string[]; // Top 20 key points to remember
  examples: string[];
  summary: string;
}

/**
 * Gets user profile from localStorage
 */
function getUserProfile(): { grade?: string; age?: number; name?: string } {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        grade: user.grade,
        age: user.age,
        name: user.name,
      };
    }
  } catch (error) {
    // Silently handle error - profile may not be available
  }
  return {};
}

/**
 * Generates a smart, personalized CBSE-style lesson for the selected topic
 * @param config - Quiz configuration with subject, topic, age, language, difficulty
 * @param userProfile - User profile with age, grade, name for personalization
 */
export async function generateLesson(config: QuizConfig, userProfile?: User | null): Promise<Lesson> {
  const profile = userProfile || getUserProfile();
  const grade = profile.grade || `Class ${Math.floor((config.age || 8) / 2) + 1}`;
  const classLevel = grade.includes('Class') ? grade : `Class ${grade}`;
  const kidName = (userProfile as User)?.name || 'friend';
  const kidAge = config.age || 8;

  // Determine learning style based on age
  const learningStyle =
    kidAge >= 6 && kidAge <= 8
      ? 'very simple, visual, and story-based with lots of examples from daily life. Use simple words and short sentences.'
      : kidAge >= 9 && kidAge <= 11
      ? 'clear explanations with step-by-step breakdowns, real-world examples, and visual descriptions. Use engaging language.'
      : 'detailed explanations with reasoning, real-world applications, and logical connections. Use age-appropriate vocabulary.';

  // Determine engagement level
  const engagementLevel =
    kidAge <= 8
      ? 'Use emojis sparingly, fun comparisons, and relate to things kids love (toys, games, animals, food). Make it feel like a story.'
      : kidAge <= 11
      ? 'Use engaging examples, interesting facts, and relate to their interests (sports, technology, nature). Make it interactive and exciting.'
      : 'Use real-world applications, interesting connections, and thought-provoking examples. Make it relevant and meaningful.';

  const languageInstruction =
    config.language === 'Hindi'
      ? 'Use mostly Hindi with simple words. Use Devanagari script if possible, otherwise Roman script. Keep sentences short and clear.'
      : config.language === 'English'
      ? 'Use only English with age-appropriate vocabulary. Keep language simple and clear.'
      : 'Mix simple Hindi and English naturally, but keep it clear. Use whichever language feels more natural for each concept.';

  const subtopicsText =
    config.subtopics.length === 1
      ? config.subtopics[0]
      : config.subtopics.join(', ');

  const isCurrentAffairs = config.subject.toLowerCase().includes('current affairs');
  const isChess = config.subject.toLowerCase().includes('chess');
  
  let subjectSpecificGuidance = `- Use CBSE curriculum standards for ${classLevel}`;
  
  if (isCurrentAffairs) {
    subjectSpecificGuidance = `SPECIAL INSTRUCTIONS FOR CURRENT AFFAIRS:
- Focus on recent events and news (within the last 1-2 years)
- Explain events in simple, age-appropriate language
- Connect current events to things ${kidName} can relate to
- Explain why these events matter and how they affect daily life
- Use examples from India and around the world
- Make it interesting and relevant to a ${kidAge}-year-old
- Avoid complex political details - focus on what kids can understand
- Include fun facts and interesting information`;
  } else if (isChess) {
    subjectSpecificGuidance = `SPECIAL INSTRUCTIONS FOR CHESS:
- Focus on chess strategies, tactics, and concepts appropriate for age ${kidAge}
- Use chess notation (e.g., e4, Nf3) when helpful but explain in simple terms
- Include visual descriptions of board positions and piece movements
- Explain chess concepts step-by-step with clear examples
- Make it fun and engaging - chess is a game that teaches thinking skills!
- Include examples from famous games or common patterns
- For younger kids (6-8), focus on basic moves, piece values, and simple tactics
- For older kids (9-14), include more advanced strategies, combinations, and positional play
- Explain why certain moves are good or bad
- Connect chess concepts to real-life problem-solving`;
  }

  const prompt = `You are a smart and friendly teacher creating an amazing lesson for ${kidName}, a ${classLevel} student who is ${kidAge} years old.

Create a comprehensive, engaging lesson about:
- Subject: ${config.subject}
- Topic: ${subtopicsText}
- Language: ${config.language}
- Grade Level: ${classLevel}
- Student Age: ${kidAge} years

${languageInstruction}

TEACHING APPROACH:
1. Learning Style: ${learningStyle}
2. Engagement: ${engagementLevel}
3. Make it feel like you're talking directly to ${kidName} - use "you" and "your" to make it personal
4. ${subjectSpecificGuidance}
5. Break complex ideas into simple, digestible parts
6. Use analogies and comparisons that a ${kidAge}-year-old would understand
7. Include visual descriptions (imagine, picture this, think of it like...)
8. Be encouraging and positive throughout
9. Connect concepts to things kids experience daily

CONTENT REQUIREMENTS:
1. Title: Make it exciting and clear (like a chapter title)
2. Introduction: 3-4 detailed paragraphs that hook ${kidName}'s interest. Start with a question or interesting fact. Explain why this topic matters, provide context, and build curiosity. Each paragraph should be substantial (4-6 sentences) and flow naturally into the next. Cover the importance, real-world relevance, and what makes this topic interesting.
3. Explanation: 10-15 clear pointers that build understanding step by step. Each pointer should:
   - Be one clear idea
   - Use simple language
   - Include examples or comparisons
   - Build on previous points
4. Examples: 3-5 real-world examples that ${kidName} can relate to. Make them fun and memorable.
5. Key Points: Exactly 20 important things to remember. Make them short, clear, and easy to recall.
6. Summary: One encouraging paragraph that ties everything together and makes ${kidName} feel confident about understanding the topic.

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Exciting chapter title",
  "introduction": "3-4 detailed paragraphs (each 4-6 sentences) that hook interest, explain the topic's importance, provide context, and build curiosity",
  "explanation": [
    "Pointer 1: First concept explained clearly with examples",
    "Pointer 2: Second concept building on the first",
    "...continue with 10-15 comprehensive pointers"
  ],
  "keyPoints": [
    "Key point 1 (short and memorable)",
    "Key point 2",
    "...exactly 20 key points"
  ],
  "examples": [
    "Example 1 with detailed explanation",
    "Example 2 with detailed explanation",
    "Example 3 with detailed explanation",
    "...3-5 examples total"
  ],
  "summary": "One encouraging paragraph summarizing everything"
}`;

  try {
    const { content } = await aiApi.chat({
      messages: [
        {
          role: 'system',
          content:
            'You are a smart, friendly, and engaging teacher who creates personalized educational content for kids. You make learning fun, relatable, and easy to understand. Always return valid JSON objects with educational content that is age-appropriate, engaging, and follows CBSE curriculum standards.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      num_predict: 8192,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const lesson = JSON.parse(jsonString) as Lesson;

    // Validate lesson structure
    if (
      !lesson.title ||
      !lesson.introduction ||
      !Array.isArray(lesson.explanation) ||
      !Array.isArray(lesson.keyPoints) ||
      !Array.isArray(lesson.examples) ||
      !lesson.summary
    ) {
      throw new Error('Invalid lesson structure received');
    }

    // Ensure we have exactly 20 key points (pad or trim if needed)
    if (lesson.keyPoints.length < 20) {
      // If less than 20, add generic points
      const needed = 20 - lesson.keyPoints.length;
      for (let i = 0; i < needed; i++) {
        lesson.keyPoints.push(`Important concept related to ${subtopicsText}`);
      }
    } else if (lesson.keyPoints.length > 20) {
      lesson.keyPoints = lesson.keyPoints.slice(0, 20);
    }

    return lesson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse lesson. Please try again.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred while generating lesson');
  }
}
