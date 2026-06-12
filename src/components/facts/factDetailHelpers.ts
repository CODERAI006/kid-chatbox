import type { DailyFact, DailyFactDetailContent, FactSubjectId } from '@/types/dailyFacts';

const REASONING_BY_SUBJECT: Partial<Record<FactSubjectId, string>> = {
  science:
    'Scientists check ideas with experiments, measurements, and repeated tests. When many tests give the same result, we call it a reliable scientific fact.',
  geography:
    'Geographers use maps, climate records, and land surveys built over many years. That is how we know where rivers, mountains, and countries really are.',
  history:
    'Historians study old books, inscriptions, artefacts, and records from different times. When many sources agree, we trust the story as history.',
  nature:
    'Naturalists observe plants and animals in the wild and compare what they see with biology books. Patterns in nature repeat across the world.',
  india:
    'India has rich records in culture, freedom struggle stories, and government data. These help us learn what makes our country special.',
  sports:
    'Sports facts come from official match records, coaches, and fitness science. Rules and training methods are tested on real players.',
  math:
    'Mathematics is built from clear rules and proofs. Once a rule is proved step by step, it stays true every time we use it.',
  current_affairs:
    'News for students is checked by reporters and teachers who compare trusted sources before sharing important events.',
  general_knowledge:
    'General knowledge facts are checked against textbooks, encyclopaedias, and expert teachers before they reach your classroom.',
};

const REAL_LIFE_BY_SUBJECT: Partial<Record<FactSubjectId, string>> = {
  science: 'Watch for this in science class labs, NCERT chapters, or science fairs at school.',
  geography: 'Look at your atlas, map corner in class, or when you travel with family in India.',
  history: 'Connect this to your history textbook timelines and museum visits.',
  nature: 'Notice this in parks, gardens, zoos, or nature documentaries.',
  india: 'Talk about this with family — many Indian festivals and places link to our heritage.',
  sports: 'Try this idea during PT period, playground games, or while watching a match.',
  math: 'Use this when solving homework sums or during mental-math practice.',
  current_affairs: 'Discuss it during morning assembly news or general knowledge period.',
  general_knowledge: 'Save it for quiz competitions and classroom discussions.',
};

function hasStoredDetail(fact: DailyFact): boolean {
  return Boolean(
    fact.explanation?.trim()
    && fact.reasoning?.trim()
    && fact.explanation !== fact.fact,
  );
}

export function getFactDetailContent(fact: DailyFact): DailyFactDetailContent {
  if (hasStoredDetail(fact)) {
    return {
      explanation: fact.explanation!,
      reasoning: fact.reasoning || REASONING_BY_SUBJECT[fact.subject] || '',
      didYouKnow: fact.didYouKnow || `Learning about "${fact.title}" makes quizzes more fun!`,
      realLifeLink: fact.realLifeLink || REAL_LIFE_BY_SUBJECT[fact.subject] || '',
    };
  }

  const subjectLabel = fact.subject.replace(/_/g, ' ');
  return {
    explanation: `${fact.fact}\n\nIn short: this fact teaches us something important about ${fact.title.toLowerCase()} in ${subjectLabel}.`,
    reasoning:
      REASONING_BY_SUBJECT[fact.subject]
      || 'Trusted books, teachers, and experts check facts carefully before students learn them.',
    didYouKnow: `The ${subjectLabel} topic often appears in school quizzes and GK rounds!`,
    realLifeLink:
      REAL_LIFE_BY_SUBJECT[fact.subject]
      || 'Ask your teacher where you might see this idea in class or at home.',
  };
}
