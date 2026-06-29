/**
 * ConfigurationForm – button-first quiz setup (mobile-first).
 */
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody,
  SimpleGrid, Textarea, Input, FormControl, FormLabel, Divider, Spinner,
} from '@/shared/design-system';
import { ProfileQuizHint } from '@/components/quiz/ProfileQuizHint';
import { CompetitiveExamSection } from '@/components/quiz/CompetitiveExamSection';
import { QuizPill, QuizSectionLabel } from '@/components/quiz/quizFormUi';
import {
  SUBJECTS, DIFFICULTY_LEVELS,
  HINDI_SUBTOPICS, ENGLISH_SUBTOPICS, MATHS_SUBTOPICS,
  EVS_SCIENCE_SUBTOPICS, SOCIAL_STUDIES_SUBTOPICS,
  GENERAL_KNOWLEDGE_SUBTOPICS, CURRENT_AFFAIRS_SUBTOPICS,
  CHESS_SUBTOPICS, QUIZ_CONSTANTS,
} from '@/constants/quiz';
import { EXAM_BOARDS } from '@/constants/examBoard';
import { getCompetitiveTrack } from '@/constants/competitiveExams';
import { Subject, Difficulty } from '@/types/quiz';
import { isValidSubject } from '@/utils/validation';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { QuizPageUpload } from '@/components/quiz/QuizPageUpload';
import type { QuizPageImage } from '@/utils/quizImageUpload';
import { competitiveTopicsApi } from '@/services/competitiveTopics';
import {
  getProfileGradeLevel,
  loadQuizSetupPrefs,
  saveQuizSetupPrefs,
  defaultQuizQuestionCount,
  defaultQuizTimeLimit,
} from '@/utils/learningFormatPrefs';

const QUESTION_TYPES = ['MCQ', 'Scenario Based', 'True / False', 'Fill in Blanks', 'Word Problems', 'Mixed'];
const QUESTION_PRESETS = [5, 10, 15, 20, 25, 30, 40];
const TIME_PRESETS = [5, 10, 15, 20, 30, 45, 60];
const SUBJECT_ICONS: Record<string, string> = {
  Hindi: '📖', English: '🔤', Maths: '🔢', 'EVS / Science': '🌱',
  'Social Studies': '🌍', 'General Knowledge': '🧠', 'Current Affairs': '📰',
  Chess: '♟️', Other: '✨',
};
const DIFF_CS: Record<string, string> = { Basic: 'green', Advanced: 'orange', Expert: 'red', Mix: 'purple' };
const SUBTOPIC_MAP: Record<string, readonly string[]> = {
  Hindi: HINDI_SUBTOPICS, English: ENGLISH_SUBTOPICS, Maths: MATHS_SUBTOPICS,
  'EVS / Science': EVS_SCIENCE_SUBTOPICS, 'Social Studies': SOCIAL_STUDIES_SUBTOPICS,
  'General Knowledge': GENERAL_KNOWLEDGE_SUBTOPICS, 'Current Affairs': CURRENT_AFFAIRS_SUBTOPICS,
  Chess: CHESS_SUBTOPICS,
};

interface ConfigurationFormProps {
  onConfigComplete: (config: {
    subject: Subject; subtopics: string[]; questionCount?: number;
    difficulty: Difficulty; instructions?: string; timeLimit: number;
    gradeLevel?: string; sampleQuestion?: string; examStyle?: string;
    competitiveTrack?: string; sourceImages?: string[];
  }) => void;
  isGenerating?: boolean;
  generatingBatch?: { current: number; total: number } | null;
  onCancelGeneration?: () => void;
}

export const ConfigurationForm: React.FC<ConfigurationFormProps> = ({
  onConfigComplete, isGenerating = false, generatingBatch = null, onCancelGeneration,
}) => {
  const savedPrefs = loadQuizSetupPrefs();
  const { canTakeQuiz, planInfo } = usePlanLimits();
  const [subject, setSubject] = useState<Subject | ''>('');
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [customSubtopic, setCustomSubtopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(defaultQuizQuestionCount());
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTY_LEVELS.BASIC);
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState(defaultQuizTimeLimit());
  const [examStyle, setExamStyle] = useState(savedPrefs.examStyle || '');
  const [competitiveTrack, setCompetitiveTrack] = useState('');
  const [competitiveTopics, setCompetitiveTopics] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState(savedPrefs.questionType || '');
  const [customSubtopicInput, setCustomSubtopicInput] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);
  const [pageImages, setPageImages] = useState<QuizPageImage[]>([]);
  const hasPageImages = pageImages.length > 0;
  const isCompetitive = examStyle === 'Competitive';

  const handleProfileReady = useCallback((ready: boolean) => {
    setProfileReady(ready);
  }, []);

  useEffect(() => {
    if (!isGenerating) setSubmitLocked(false);
  }, [isGenerating]);

  useEffect(() => {
    if (!isCompetitive) {
      setCompetitiveTrack('');
      setCompetitiveTopics([]);
    }
  }, [isCompetitive]);

  const toggleSubtopic = useCallback((st: string) =>
    setSelectedSubtopics(prev => prev.includes(st) ? prev.filter(x => x !== st) : [...prev, st]), []);

  const addCustomSubtopic = useCallback(() => {
    const t = customSubtopicInput.trim();
    if (t && !selectedSubtopics.includes(t)) {
      setSelectedSubtopics(prev => [...prev, t]);
      setCustomSubtopicInput('');
    }
  }, [customSubtopicInput, selectedSubtopics]);

  const competitiveValid = !isCompetitive || (competitiveTrack && competitiveTopics.length > 0);

  const isFormValid =
    questionCount >= QUIZ_CONSTANTS.MIN_QUESTIONS &&
    questionCount <= QUIZ_CONSTANTS.MAX_QUESTIONS &&
    timeLimit > 0 &&
    competitiveValid &&
    (hasPageImages
      ? true
      : isCompetitive
        ? true
        : isValidSubject(subject) &&
          (subject === SUBJECTS.OTHER
            ? customSubtopic.trim().length > 0
            : selectedSubtopics.length > 0 || instructions.trim().length > 0));

  const handleSubmit = useCallback(() => {
    if (!isFormValid || submitLocked || isGenerating) return;
    setSubmitLocked(true);
    const qtHint = questionType ? `Question type: ${questionType}. ` : '';
    let finalSubject = subject;
    let finalSubtopics: string[] = [];
    let finalInstructions: string | undefined;
    let finalTrack = competitiveTrack || undefined;

    if (hasPageImages) {
      finalSubject = (isValidSubject(subject) ? subject : SUBJECTS.OTHER) as Subject;
      finalSubtopics = ['Uploaded page content'];
      const pageHint = `Generate questions only from the uploaded page image(s) (${pageImages.length} page${pageImages.length === 1 ? '' : 's'}).`;
      finalInstructions = [pageHint, qtHint, instructions.trim()].filter(Boolean).join(' ').trim() || undefined;
    } else if (isCompetitive && competitiveTrack) {
      const track = getCompetitiveTrack(competitiveTrack);
      finalSubject = SUBJECTS.GENERAL_KNOWLEDGE as Subject;
      finalSubtopics = competitiveTopics;
      const compHint = `Competitive exam: ${track?.label || competitiveTrack} (${track?.exams || ''}). Align with Indian exam pattern. `;
      finalInstructions = `${compHint}${qtHint}${instructions.trim()}`.trim() || undefined;
      void competitiveTopicsApi.save(competitiveTrack, [...new Set([...competitiveTopics, ...track?.defaultTopics || []])]);
    } else if (subject === SUBJECTS.OTHER) {
      finalSubtopics = customSubtopic.trim() ? [customSubtopic.trim()] : [];
      finalInstructions = `${qtHint}${instructions.trim()}`.trim() || undefined;
    } else if (selectedSubtopics.length > 0) {
      finalSubtopics = selectedSubtopics;
      finalInstructions = `${qtHint}${instructions.trim()}`.trim() || undefined;
    } else {
      finalSubtopics = [instructions.trim()];
      finalInstructions = qtHint.trim() || undefined;
    }

    onConfigComplete({
      subject: finalSubject as Subject,
      subtopics: finalSubtopics,
      questionCount,
      difficulty,
      instructions: finalInstructions,
      timeLimit,
      gradeLevel: getProfileGradeLevel(),
      examStyle: examStyle.trim() || undefined,
      competitiveTrack: finalTrack,
      sourceImages: hasPageImages ? pageImages.map((p) => p.base64) : undefined,
    });

    saveQuizSetupPrefs({
      examStyle: examStyle.trim() || undefined,
      questionType: questionType.trim() || undefined,
      questionCount,
      timeLimit,
    });
  }, [subject, selectedSubtopics, customSubtopic, questionCount, difficulty,
    instructions, timeLimit, examStyle, competitiveTrack, competitiveTopics,
    questionType, onConfigComplete, isFormValid, submitLocked, isGenerating,
    hasPageImages, pageImages, isCompetitive]);

  const subtopics = subject && subject !== SUBJECTS.OTHER ? (SUBTOPIC_MAP[subject] ?? []) : [];
  const isFormValidWithLimits = isFormValid && canTakeQuiz && profileReady;
  const showSchoolSubjects = !hasPageImages && !isCompetitive;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <Card width="100%" maxWidth="960px" margin="0 auto" boxShadow="xl" borderRadius={{ base: 'xl', md: '2xl' }} overflow="hidden">
        <CardBody padding={{ base: 3, sm: 4, md: 6 }}>
          <VStack spacing={{ base: 4, md: 5 }} align="stretch">
            <ProfileQuizHint onReadyChange={handleProfileReady} />

            <QuizPageUpload pages={pageImages} onChange={setPageImages} isDisabled={isGenerating} />

            {hasPageImages && (
              <Box bg="purple.50" borderRadius="lg" px={3} py={2} borderWidth={1} borderColor="purple.100">
                <Text fontSize={{ base: '2xs', sm: 'xs' }} color="purple.800">
                  Page photos uploaded — quiz questions will be generated from your images.
                </Text>
              </Box>
            )}

            {showSchoolSubjects && (
              <Box>
                <QuizSectionLabel>
                  Subject <Text as="span" color="red.400">*</Text>
                </QuizSectionLabel>
                <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={{ base: 2, md: 3 }}>
                  {Object.values(SUBJECTS).map(subj => {
                    const active = subject === subj;
                    return (
                      <Box key={subj} as="button"
                        onClick={() => { setSubject(subj as Subject); setSelectedSubtopics([]); setCustomSubtopic(''); }}
                        p={{ base: 2, md: 3 }} borderRadius="xl" borderWidth={2}
                        borderColor={active ? 'blue.500' : 'gray.200'} bg={active ? 'blue.50' : 'white'}
                        display="flex" flexDir="column" alignItems="center" gap={0.5} transition="all 0.2s"
                        boxShadow={active ? 'md' : 'sm'}
                        _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}>
                        <Text fontSize={{ base: 'md', md: 'xl' }}>{SUBJECT_ICONS[subj] ?? '📚'}</Text>
                        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight={active ? 'bold' : 'medium'}
                          color={active ? 'blue.700' : 'gray.600'} textAlign="center" lineHeight="short">
                          {subj}
                        </Text>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </Box>
            )}

            <AnimatePresence>
              {showSchoolSubjects && subject === SUBJECTS.OTHER && (
                <motion.div key="custom" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                      Your Topic <Text as="span" color="red.400">*</Text>
                    </FormLabel>
                    <Input value={customSubtopic} onChange={e => setCustomSubtopic(e.target.value)}
                      placeholder="e.g., Space, Robotics…" size={{ base: 'md', md: 'lg' }} borderRadius="xl" />
                  </FormControl>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSchoolSubjects && subject && subject !== SUBJECTS.OTHER && subtopics.length > 0 && (
                <motion.div key="subtopics" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <QuizSectionLabel>Subtopics</QuizSectionLabel>
                      {selectedSubtopics.length > 0 && (
                        <Text fontSize="2xs" color="blue.600" fontWeight="bold">{selectedSubtopics.length} ✓</Text>
                      )}
                    </HStack>
                    <HStack flexWrap="wrap" gap={1.5}>
                      {subtopics.map(st => (
                        <Button key={st} size="xs" borderRadius="full" h="auto" py={1} px={2} fontSize="2xs"
                          variant={selectedSubtopics.includes(st) ? 'solid' : 'outline'}
                          colorScheme={selectedSubtopics.includes(st) ? 'blue' : 'gray'}
                          onClick={() => toggleSubtopic(st)} whiteSpace="normal" textAlign="left">
                          {st}
                        </Button>
                      ))}
                    </HStack>
                    <HStack mt={2} spacing={2}>
                      <Input size="sm" value={customSubtopicInput} borderRadius="full"
                        onChange={e => setCustomSubtopicInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubtopic(); } }}
                        placeholder="Custom subtopic…" fontSize="xs" />
                      <Button size="xs" onClick={addCustomSubtopic} colorScheme="blue" borderRadius="full"
                        isDisabled={!customSubtopicInput.trim()} flexShrink={0}>+ Add</Button>
                    </HStack>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {showSchoolSubjects && <Divider />}

            <Box>
              <QuizSectionLabel>Exam Style</QuizSectionLabel>
              <HStack flexWrap="wrap" gap={1.5}>
                {EXAM_BOARDS.map(s => (
                  <QuizPill key={s} label={s} active={examStyle === s}
                    onClick={() => setExamStyle(examStyle === s ? '' : s)} cs="purple" />
                ))}
              </HStack>
            </Box>

            <AnimatePresence>
              {isCompetitive && !hasPageImages && (
                <motion.div key="competitive" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <CompetitiveExamSection
                    trackId={competitiveTrack}
                    selectedTopics={competitiveTopics}
                    gradeLevel={getProfileGradeLevel()}
                    disabled={isGenerating}
                    onTrackChange={setCompetitiveTrack}
                    onTopicsChange={setCompetitiveTopics}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Box>
              <QuizSectionLabel>Question Type</QuizSectionLabel>
              <HStack flexWrap="wrap" gap={1.5}>
                {QUESTION_TYPES.map(qt => (
                  <QuizPill key={qt} label={qt} active={questionType === qt}
                    onClick={() => setQuestionType(questionType === qt ? '' : qt)} cs="orange" />
                ))}
              </HStack>
            </Box>

            <Box>
              <QuizSectionLabel>Difficulty</QuizSectionLabel>
              <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                {Object.values(DIFFICULTY_LEVELS).map(d => (
                  <Button key={d} variant={difficulty === d ? 'solid' : 'outline'}
                    colorScheme={difficulty === d ? DIFF_CS[d] : 'gray'}
                    onClick={() => setDifficulty(d)} borderRadius="xl"
                    size={{ base: 'sm', md: 'md' }} fontSize={{ base: 'xs', md: 'sm' }}
                    fontWeight={difficulty === d ? 'bold' : 'normal'}>
                    {d}
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 5 }}>
              <Box>
                <QuizSectionLabel>Questions</QuizSectionLabel>
                <HStack flexWrap="wrap" gap={1.5}>
                  {QUESTION_PRESETS.map(n => (
                    <QuizPill key={n} label={`${n}`} active={questionCount === n} onClick={() => setQuestionCount(n)} />
                  ))}
                </HStack>
              </Box>
              <Box>
                <QuizSectionLabel>Time</QuizSectionLabel>
                <HStack flexWrap="wrap" gap={1.5}>
                  {TIME_PRESETS.map(t => (
                    <QuizPill key={t} label={`${t}m`} active={timeLimit === t} onClick={() => setTimeLimit(t)} cs="teal" />
                  ))}
                </HStack>
              </Box>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="bold" color="gray.500" textTransform="uppercase" mb={2}>
                Custom Instructions&nbsp;
                <Text as="span" fontWeight="normal" textTransform="none" color="gray.400">(optional)</Text>
              </FormLabel>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="MCQ only, tricky, word problems…"
                size="sm" rows={2} borderRadius="xl" resize="vertical" fontSize={{ base: 'sm', md: 'md' }} />
            </FormControl>

            {!canTakeQuiz && planInfo && (
              <Box bg="red.50" borderWidth={1} borderColor="red.200" borderRadius="xl" p={3} textAlign="center">
                <Text fontSize="xs" color="red.700" fontWeight="bold">Daily quiz limit reached</Text>
              </Box>
            )}

            <HStack spacing={2} pt={1}>
              <Button colorScheme="blue" size={{ base: 'md', md: 'lg' }} onClick={handleSubmit}
                isDisabled={!isFormValidWithLimits || isGenerating || submitLocked}
                flex={1} borderRadius="xl" fontSize={{ base: 'sm', md: 'lg' }} fontWeight="bold"
                py={{ base: 5, md: 6 }}>
                {!canTakeQuiz ? 'Limit reached'
                  : !profileReady ? 'Complete profile'
                  : isGenerating
                    ? <HStack spacing={2} justify="center">
                        <Spinner size="sm" color="white" />
                        <Text as="span" fontSize="sm">
                          {`Creating${
                            generatingBatch != null && generatingBatch.total > 1
                              ? ` (${generatingBatch.current}/${generatingBatch.total})`
                              : ''
                          }…`}
                        </Text>
                      </HStack>
                    : hasPageImages ? 'Quiz from pages 📄'
                    : isCompetitive ? 'Start competitive quiz 🎯'
                    : 'Start Quiz 🎉'}
              </Button>
              {isGenerating && onCancelGeneration && (
                <Button variant="outline" size="sm" onClick={onCancelGeneration} borderRadius="xl">Cancel</Button>
              )}
            </HStack>

          </VStack>
        </CardBody>
      </Card>
    </motion.div>
  );
};
