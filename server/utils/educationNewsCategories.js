/**
 * Kid-friendly education news categories (Science, History, Geography, Current Affairs, GK).
 */

const EDUCATION_CATEGORIES = [
  {
    id: 'science',
    label: 'Science & Inventions',
    icon: '🔬',
    color: 'blue',
    description: 'Inventors, space, nature, AI, renewable energy & fun experiments',
    topics: [
      'Famous inventors and discoveries',
      'Space and astronomy',
      'Human body',
      'Animals and nature',
      'AI and robotics basics',
      'Renewable energy',
      'Daily science experiments',
    ],
    exampleQuestions: [
      'Who invented the light bulb?',
      'How do airplanes fly?',
      'Why is the sky blue?',
      'What is Artificial Intelligence?',
    ],
    searchTerms: 'science invention space astronomy robotics renewable energy STEM kids',
  },
  {
    id: 'history',
    label: 'History',
    icon: '🏛️',
    color: 'amber',
    description: 'Ancient civilizations, freedom movement, leaders & monuments',
    topics: [
      'Ancient civilizations',
      'Indian freedom movement',
      'World wars (age appropriate)',
      'Great leaders',
      'Historical monuments',
    ],
    exampleQuestions: [
      'Who was Mahatma Gandhi?',
      'Why was the Taj Mahal built?',
      'What was the Indus Valley Civilization?',
    ],
    searchTerms: 'history ancient civilization India freedom movement monuments leaders',
  },
  {
    id: 'geography',
    label: 'Geography',
    icon: '🌍',
    color: 'emerald',
    description: 'Countries, oceans, rivers, climate, maps & landmarks',
    topics: [
      'Countries and capitals',
      'Oceans and continents',
      'Rivers and mountains',
      'Climate and weather',
      'Maps and landmarks',
    ],
    exampleQuestions: [
      'How many continents are there?',
      'Which is the largest ocean?',
      'What is the longest river in India?',
    ],
    searchTerms: 'geography continents oceans rivers mountains climate weather maps',
  },
  {
    id: 'current_affairs',
    label: 'Current Affairs',
    icon: '📡',
    color: 'rose',
    description: 'India & world news, science discoveries, sports, environment & space',
    topics: [
      'India news',
      'World news',
      'Science discoveries',
      'Sports',
      'Environment',
      'Space missions',
    ],
    exampleQuestions: [
      'What happened today in India?',
      'What new space mission launched this month?',
      'Which country hosted the latest summit?',
    ],
    searchTerms: 'India news world news space mission environment sports discovery',
  },
  {
    id: 'general_knowledge',
    label: 'Fun General Knowledge',
    icon: '🎯',
    color: 'purple',
    description: 'Technology, sports, books, environment, personalities & culture',
    topics: [
      'Technology',
      'Sports',
      'Books',
      'Environment',
      'Famous personalities',
      'Art and culture',
    ],
    exampleQuestions: [
      'Who wrote Harry Potter?',
      'Which sport uses a wicket?',
      'What is recycling?',
    ],
    searchTerms: 'technology sports books environment famous personalities art culture trivia',
  },
];

function getCategoryById(id) {
  return EDUCATION_CATEGORIES.find((c) => c.id === id) || null;
}

function getTopicsOverview() {
  return {
    success: true,
    categories: EDUCATION_CATEGORIES.map(({ searchTerms, ...rest }) => rest),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  EDUCATION_CATEGORIES,
  getCategoryById,
  getTopicsOverview,
};
