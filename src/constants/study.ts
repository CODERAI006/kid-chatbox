/**
 * Study mode constants and messages
 */

export const STUDY_MODE_MESSAGES = {
  GREETING: 'Let\'s Learn Something New! 🎓',
  SUBTITLE: 'Enter a topic related to {grade} and we\'ll explain it in a fun way!',
  SUBJECT_PROMPT: 'Which subject is your topic from?',
  TOPIC_PROMPT: 'What topic would you like to learn about?',
  TOPIC_PLACEHOLDER: 'e.g., Addition, Plants, Hindi Grammar, Solar System...',
  TOPIC_HINT: 'You can enter any topic related to your chosen subject. We\'ll create a detailed lesson just for you!',
  DIFFICULTY_PROMPT: 'Choose difficulty level:',
  START_STUDYING: 'Start Learning',
  LOADING_MESSAGE: 'Creating your personalized lesson...',
  LOADING_IMAGES_HINT: 'Drawing study illustrations with Ollama…',
  ERROR_PROFILE_INCOMPLETE: 'Please complete your profile first. Go to Profile to set your age and preferred language.',
  ERROR_GENERATION_FAILED: 'Failed to generate lesson. Please try again.',
} as const;


