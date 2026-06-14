/**
 * Kid-friendly education news categories — science, history, geography, tech, sports, etc.
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
    id: 'technology',
    label: 'Technology',
    icon: '💻',
    color: 'cyan',
    description: 'Computers, apps, coding, AI, gadgets & how tech shapes our world',
    topics: [
      'Computers and coding basics',
      'Apps and the internet',
      'Artificial intelligence',
      'Robots and inventions',
      'Cyber safety for kids',
      'Future tech careers',
    ],
    exampleQuestions: [
      'How does a computer store information?',
      'What is coding?',
      'How do smartphones connect to the internet?',
    ],
    searchTerms: 'technology computers coding programming AI robotics gadgets internet kids STEM',
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: '⚽',
    color: 'orange',
    description: 'Cricket, Olympics, athletes, teamwork & healthy competition',
    topics: [
      'Cricket and football',
      'Olympics and world cups',
      'Famous athletes',
      'Teamwork and fair play',
      'Sports science basics',
    ],
    exampleQuestions: [
      'Who won the latest cricket tournament?',
      'How do athletes stay fit?',
      'What sports are played in the Olympics?',
    ],
    searchTerms: 'sports cricket football Olympics athletes India sports news kids',
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: '🌱',
    color: 'teal',
    description: 'Climate, wildlife, forests, oceans & protecting our planet',
    topics: [
      'Climate and weather patterns',
      'Wildlife and forests',
      'Oceans and pollution',
      'Recycling and sustainability',
      'Renewable energy',
      'Protecting endangered species',
    ],
    exampleQuestions: [
      'Why is recycling important?',
      'What causes climate change?',
      'How can kids help the environment?',
    ],
    searchTerms: 'environment climate wildlife conservation pollution sustainability nature kids',
  },
  {
    id: 'arts_culture',
    label: 'Arts & Books',
    icon: '🎨',
    color: 'indigo',
    description: 'Books, art, music, films & cultural stories from India and the world',
    topics: [
      'Famous books and authors',
      'Art and painting',
      'Music and dance',
      'Films and animation',
      'Festivals and traditions',
    ],
    exampleQuestions: [
      'Who wrote your favourite storybook?',
      'What is a classical dance form from India?',
      'How are animated movies made?',
    ],
    searchTerms: 'books authors art culture music dance festivals literature kids',
  },
  {
    id: 'general_knowledge',
    label: 'Fun General Knowledge',
    icon: '🎯',
    color: 'purple',
    description: 'Trivia, world records, famous people & surprising facts',
    topics: [
      'World records',
      'Famous personalities',
      'Inventions and discoveries',
      'India and the world',
      'Brain teasers and trivia',
    ],
    exampleQuestions: [
      'Who wrote Harry Potter?',
      'Which sport uses a wicket?',
      'What is recycling?',
    ],
    searchTerms: 'trivia world records famous people personalities India facts quiz kids',
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
