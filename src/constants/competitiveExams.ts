/** Competitive exam tracks for AI Quiz Mode (India-focused). */

export interface CompetitiveExamTrack {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  exams: string;
  /** Fallback topics when AI is unavailable */
  defaultTopics: readonly string[];
}

export const COMPETITIVE_EXAM_TRACKS: readonly CompetitiveExamTrack[] = [
  {
    id: 'engineering',
    label: 'Engineering',
    shortLabel: 'Engg',
    icon: '⚙️',
    exams: 'JEE Main · JEE Advanced · BITSAT',
    defaultTopics: [
      'Mechanics & Kinematics',
      'Thermodynamics',
      'Electrostatics & Current',
      'Organic Chemistry',
      'Inorganic Chemistry',
      'Calculus & Algebra',
      'Coordinate Geometry',
      'Probability & Statistics',
    ],
  },
  {
    id: 'mbbs',
    label: 'MBBS / Medical',
    shortLabel: 'MBBS',
    icon: '🩺',
    exams: 'NEET UG · AIIMS · NEET PG basics',
    defaultTopics: [
      'Human Physiology',
      'Plant & Animal Kingdom',
      'Genetics & Evolution',
      'Biochemistry',
      'Organic Chemistry',
      'Physical Chemistry',
      'Mechanics & Optics',
      'Human Health & Disease',
    ],
  },
  {
    id: 'law',
    label: 'Law',
    shortLabel: 'Law',
    icon: '⚖️',
    exams: 'CLAT · AILET · LSAT India',
    defaultTopics: [
      'Legal Reasoning',
      'Constitutional Law basics',
      'Logical Reasoning',
      'English Comprehension',
      'General Knowledge',
      'Current Legal Affairs',
    ],
  },
  {
    id: 'upsc',
    label: 'UPSC / Civil Services',
    shortLabel: 'UPSC',
    icon: '🏛️',
    exams: 'Prelims · Mains · CAPF',
    defaultTopics: [
      'Indian Polity',
      'Modern History',
      'Geography & Environment',
      'Economy & Budget',
      'Science & Tech',
      'Current Affairs',
      'CSAT Quant & Reasoning',
    ],
  },
  {
    id: 'banking',
    label: 'Banking & Finance',
    shortLabel: 'Bank',
    icon: '🏦',
    exams: 'IBPS PO · SBI PO · RBI Grade B',
    defaultTopics: [
      'Quantitative Aptitude',
      'Data Interpretation',
      'Reasoning & Puzzles',
      'English Language',
      'Banking Awareness',
      'Financial Markets',
    ],
  },
  {
    id: 'ssc',
    label: 'SSC / Government',
    shortLabel: 'SSC',
    icon: '📋',
    exams: 'SSC CGL · CHSL · MTS',
    defaultTopics: [
      'Arithmetic',
      'Algebra & Geometry',
      'General Intelligence',
      'General Awareness',
      'English Grammar',
      'Comprehension',
    ],
  },
  {
    id: 'commerce',
    label: 'CA / Commerce',
    shortLabel: 'CA',
    icon: '📊',
    exams: 'CA Foundation · CS · CMA',
    defaultTopics: [
      'Accounting Principles',
      'Business Laws',
      'Economics & Macro',
      'Business Mathematics',
      'Company Accounts',
      'GST & Taxation basics',
    ],
  },
  {
    id: 'defence',
    label: 'Defence',
    shortLabel: 'NDA',
    icon: '🎖️',
    exams: 'NDA · CDS · AFCAT',
    defaultTopics: [
      'Mathematics',
      'General Ability Test',
      'English',
      'Physics basics',
      'History & Geography',
      'Current Defence Affairs',
    ],
  },
] as const;

export type CompetitiveTrackId = (typeof COMPETITIVE_EXAM_TRACKS)[number]['id'];

export function getCompetitiveTrack(id: string): CompetitiveExamTrack | undefined {
  return COMPETITIVE_EXAM_TRACKS.find((t) => t.id === id);
}
