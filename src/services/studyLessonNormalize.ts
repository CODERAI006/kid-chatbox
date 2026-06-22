/** Normalizers for extended 32-section study module fields. */
import type {
  AiTutorQa,
  CaseStudy,
  ComparisonTable,
  ConceptBlock,
  ExamQuestionSet,
  FillBlankQuestion,
  GamifiedChallenges,
  HotQuestions,
  LearningLevels,
  LessonHeader,
  MatchPair,
  McqQuestion,
  Misconception,
  ProjectWork,
  RealWorldConnections,
  StudyActivity,
  TrueFalseQuestion,
} from './studyLessonTypes';
import type { PracticeQuestion } from './study';

function normalizeStringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

export function normalizePracticeList(raw: unknown): PracticeQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as PracticeQuestion;
      const question = String(o.question || '').trim();
      const answer = String(o.answer || '').trim();
      if (!question) return null;
      return {
        question,
        answer,
        hint: o.hint ? String(o.hint).trim() : undefined,
      };
    })
    .filter((q) => Boolean(q)) as PracticeQuestion[];
}

export function normalizeLessonHeader(raw: unknown): LessonHeader | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as LessonHeader;
  return {
    topicName: o.topicName ? String(o.topicName).trim() : undefined,
    subject: o.subject ? String(o.subject).trim() : undefined,
    grade: o.grade ? String(o.grade).trim() : undefined,
    difficultyLevel: o.difficultyLevel ? String(o.difficultyLevel).trim() : undefined,
    estimatedLearningTime: o.estimatedLearningTime ? String(o.estimatedLearningTime).trim() : undefined,
    learningObjectives: normalizeStringList(o.learningObjectives),
  };
}

export function normalizeConcepts(raw: unknown): ConceptBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as ConceptBlock;
      const name = String(o.name || '').trim();
      if (!name) return null;
      return {
        name,
        definition: String(o.definition || '').trim(),
        explanation: String(o.explanation || '').trim(),
        example: String(o.example || '').trim(),
        nonExample: o.nonExample ? String(o.nonExample).trim() : undefined,
        commonMistake: o.commonMistake ? String(o.commonMistake).trim() : undefined,
        checkQuestion: o.checkQuestion ? String(o.checkQuestion).trim() : undefined,
      };
    })
    .filter((c) => Boolean(c)) as ConceptBlock[];
}

export function normalizeRealWorldConnections(raw: unknown): RealWorldConnections | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as RealWorldConnections;
  const out: RealWorldConnections = {
    dailyLife: normalizeStringList(o.dailyLife),
    local: normalizeStringList(o.local),
    national: normalizeStringList(o.national),
    global: normalizeStringList(o.global),
  };
  const hasData = Object.values(out).some((v) => (v?.length ?? 0) > 0);
  return hasData ? out : undefined;
}

export function normalizeComparisons(raw: unknown): ComparisonTable[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as ComparisonTable;
      const title = String(o.title || '').trim();
      if (!title) return null;
      return {
        title,
        leftTitle: String(o.leftTitle || 'A').trim(),
        leftPoints: normalizeStringList(o.leftPoints),
        rightTitle: String(o.rightTitle || 'B').trim(),
        rightPoints: normalizeStringList(o.rightPoints),
      };
    })
    .filter((c) => Boolean(c)) as ComparisonTable[];
}

export function normalizeMisconceptions(raw: unknown): Misconception[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Misconception;
      const wrong = String(o.wrong || '').trim();
      const correct = String(o.correct || '').trim();
      if (!wrong && !correct) return null;
      return { wrong, correct };
    })
    .filter((m) => Boolean(m)) as Misconception[];
}

export function normalizeExamPrep(raw: unknown): ExamQuestionSet | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as ExamQuestionSet;
  const out: ExamQuestionSet = {
    easy: normalizePracticeList(o.easy),
    medium: normalizePracticeList(o.medium),
    difficult: normalizePracticeList(o.difficult),
  };
  const hasData = (out.easy?.length ?? 0) + (out.medium?.length ?? 0) + (out.difficult?.length ?? 0) > 0;
  return hasData ? out : undefined;
}

export function normalizeMcqs(raw: unknown): McqQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as McqQuestion;
      const question = String(o.question || '').trim();
      const options = Array.isArray(o.options) ? o.options.map(String).filter(Boolean) : [];
      if (!question || options.length < 2) return null;
      return {
        question,
        options,
        correctIndex: typeof o.correctIndex === 'number' ? o.correctIndex : 0,
        explanation: String(o.explanation || '').trim(),
      };
    })
    .filter((m) => Boolean(m)) as McqQuestion[];
}

export function normalizeTrueFalse(raw: unknown): TrueFalseQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as TrueFalseQuestion;
      const statement = String(o.statement || '').trim();
      if (!statement) return null;
      return { statement, answer: Boolean(o.answer) };
    })
    .filter((t) => Boolean(t)) as TrueFalseQuestion[];
}

export function normalizeFillBlanks(raw: unknown): FillBlankQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as FillBlankQuestion;
      const sentence = String(o.sentence || '').trim();
      const answer = String(o.answer || '').trim();
      if (!sentence) return null;
      return { sentence, answer };
    })
    .filter((f) => Boolean(f)) as FillBlankQuestion[];
}

export function normalizeMatchPairs(raw: unknown): MatchPair[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as MatchPair;
      const left = String(o.left || '').trim();
      const right = String(o.right || '').trim();
      if (!left || !right) return null;
      return { left, right };
    })
    .filter((m) => Boolean(m)) as MatchPair[];
}

export function normalizeCaseStudies(raw: unknown): CaseStudy[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as CaseStudy;
      const scenario = String(o.scenario || '').trim();
      if (!scenario) return null;
      return { scenario, questions: normalizePracticeList(o.questions) };
    })
    .filter((c) => Boolean(c)) as CaseStudy[];
}

export function normalizeActivities(raw: unknown): StudyActivity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as StudyActivity;
      const title = String(o.title || '').trim();
      if (!title) return null;
      return {
        title,
        materials: normalizeStringList(o.materials),
        steps: normalizeStringList(o.steps),
        expectedLearning: String(o.expectedLearning || '').trim(),
      };
    })
    .filter((a) => Boolean(a)) as StudyActivity[];
}

export function normalizeProjectWork(raw: unknown): ProjectWork | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as ProjectWork;
  const out: ProjectWork = {
    miniProject: o.miniProject ? String(o.miniProject).trim() : undefined,
    researchActivity: o.researchActivity ? String(o.researchActivity).trim() : undefined,
    presentationIdea: o.presentationIdea ? String(o.presentationIdea).trim() : undefined,
    creativeAssignment: o.creativeAssignment ? String(o.creativeAssignment).trim() : undefined,
  };
  return Object.values(out).some(Boolean) ? out : undefined;
}

export function normalizeGamified(raw: unknown): GamifiedChallenges | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as GamifiedChallenges;
  const out: GamifiedChallenges = {
    explorerMission: o.explorerMission ? String(o.explorerMission).trim() : undefined,
    detectiveMission: o.detectiveMission ? String(o.detectiveMission).trim() : undefined,
    quizChallenge: o.quizChallenge ? String(o.quizChallenge).trim() : undefined,
    observationChallenge: o.observationChallenge ? String(o.observationChallenge).trim() : undefined,
    rewardSystem: o.rewardSystem ? String(o.rewardSystem).trim() : undefined,
    badges: normalizeStringList(o.badges),
  };
  return Object.values(out).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))) ? out : undefined;
}

export function normalizeHotQuestions(raw: unknown): HotQuestions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as HotQuestions;
  const out: HotQuestions = {
    critical: normalizeStringList(o.critical),
    creative: normalizeStringList(o.creative),
    analytical: normalizeStringList(o.analytical),
  };
  const hasData = Object.values(out).some((v) => (v?.length ?? 0) > 0);
  return hasData ? out : undefined;
}

export function normalizeAiTutorQa(raw: unknown): AiTutorQa[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as AiTutorQa;
      const question = String(o.question || '').trim();
      const answer = String(o.answer || '').trim();
      if (!question) return null;
      return { question, answer };
    })
    .filter((q) => Boolean(q)) as AiTutorQa[];
}

export function normalizeLearningLevels(raw: unknown): LearningLevels | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as LearningLevels;
  const out: LearningLevels = {
    beginner: normalizePracticeList(o.beginner),
    intermediate: normalizePracticeList(o.intermediate),
    advanced: normalizePracticeList(o.advanced),
    challenge: normalizePracticeList(o.challenge),
  };
  const hasData = Object.values(out).some((v) => (v?.length ?? 0) > 0);
  return hasData ? out : undefined;
}

export function normalizeQuickSummary(raw: unknown): string | undefined {
  if (Array.isArray(raw)) {
    const bullets = normalizeStringList(raw);
    return bullets.length ? bullets.join(' • ') : undefined;
  }
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return undefined;
}
