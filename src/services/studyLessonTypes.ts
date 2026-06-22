/** Extended types for the 32-section study module. */
import type { PracticeQuestion, Flashcard, KeyTerm } from './study';

export interface LessonHeader {
  topicName?: string;
  subject?: string;
  grade?: string;
  difficultyLevel?: string;
  estimatedLearningTime?: string;
  learningObjectives?: string[];
}

export interface ConceptBlock {
  name: string;
  definition: string;
  explanation: string;
  example: string;
  nonExample?: string;
  commonMistake?: string;
  checkQuestion?: string;
}

export interface KeyTermExtended extends KeyTerm {
  easyExample?: string;
}

export interface RealWorldConnections {
  dailyLife?: string[];
  local?: string[];
  national?: string[];
  global?: string[];
}

export interface ComparisonTable {
  title: string;
  leftTitle: string;
  leftPoints: string[];
  rightTitle: string;
  rightPoints: string[];
}

export interface Misconception {
  wrong: string;
  correct: string;
}

export interface ExamQuestionSet {
  easy?: PracticeQuestion[];
  medium?: PracticeQuestion[];
  difficult?: PracticeQuestion[];
}

export interface McqQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TrueFalseQuestion {
  statement: string;
  answer: boolean;
}

export interface FillBlankQuestion {
  sentence: string;
  answer: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface CaseStudy {
  scenario: string;
  questions: PracticeQuestion[];
}

export interface StudyActivity {
  title: string;
  materials: string[];
  steps: string[];
  expectedLearning: string;
}

export interface ProjectWork {
  miniProject?: string;
  researchActivity?: string;
  presentationIdea?: string;
  creativeAssignment?: string;
}

export interface GamifiedChallenges {
  explorerMission?: string;
  detectiveMission?: string;
  quizChallenge?: string;
  observationChallenge?: string;
  rewardSystem?: string;
  badges?: string[];
}

export interface AiTutorQa {
  question: string;
  answer: string;
}

export interface LearningLevels {
  beginner?: PracticeQuestion[];
  intermediate?: PracticeQuestion[];
  advanced?: PracticeQuestion[];
  challenge?: PracticeQuestion[];
}

export interface HotQuestions {
  critical?: string[];
  creative?: string[];
  analytical?: string[];
}

export interface StudyModuleExtensions {
  lessonHeader?: LessonHeader;
  concepts?: ConceptBlock[];
  realWorldConnections?: RealWorldConnections;
  memoryTricks?: string[];
  comparisons?: ComparisonTable[];
  misconceptions?: Misconception[];
  examPrep?: ExamQuestionSet;
  mcqs?: McqQuestion[];
  trueFalse?: TrueFalseQuestion[];
  fillBlanks?: FillBlankQuestion[];
  matchFollowing?: MatchPair[];
  shortAnswer?: PracticeQuestion[];
  longAnswer?: PracticeQuestion[];
  caseStudies?: CaseStudy[];
  activities?: StudyActivity[];
  projectWork?: ProjectWork;
  gamifiedChallenges?: GamifiedChallenges;
  hotQuestions?: HotQuestions;
  aiTutorQa?: AiTutorQa[];
  discussionPrompts?: string[];
  learningLevels?: LearningLevels;
  learningOutcomes?: string[];
}

export type { Flashcard };
