/**
 * ConfigurationForm – button-first quiz setup.
 * Class & Exam Type at top; subject/difficulty/count/time as button selectors.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody, Heading,
  SimpleGrid, Textarea, Input, FormControl, FormLabel, Divider, Spinner,
} from '@/shared/design-system';
import {
  SUBJECTS, DIFFICULTY_LEVELS,
  HINDI_SUBTOPICS, ENGLISH_SUBTOPICS, MATHS_SUBTOPICS,
  EVS_SCIENCE_SUBTOPICS, SOCIAL_STUDIES_SUBTOPICS,
  GENERAL_KNOWLEDGE_SUBTOPICS, CURRENT_AFFAIRS_SUBTOPICS,
  CHESS_SUBTOPICS, MESSAGES, QUIZ_CONSTANTS,
} from '@/constants/quiz';
import { Subject, Difficulty } from '@/types/quiz';
import { isValidSubject } from '@/utils/validation';
import { usePlanLimits } from '@/hooks/usePlanLimits';

const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const EXAM_STYLES = ['CBSE', 'NCERT', 'Olympiad', 'Competitive', 'ICSE', 'State Board'];
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
  }) => void;
  isGenerating?: boolean;
  generatingBatch?: { current: number; total: number } | null;
  onCancelGeneration?: () => void;
}

/** Compact uppercase section label */
const SL = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="widest">
    {children}
  </Text>
);

/** Toggleable pill button */
const Pill = ({ label, active, onClick, cs = 'blue' }: {
  label: string; active: boolean; onClick: () => void; cs?: string;
}) => (
  <Button size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? cs : 'gray'}
    borderRadius="full" onClick={onClick} fontWeight={active ? 'bold' : 'normal'} flexShrink={0}>
    {label}
  </Button>
);

export const ConfigurationForm: React.FC<ConfigurationFormProps> = ({
  onConfigComplete, isGenerating = false, generatingBatch = null, onCancelGeneration,
}) => {
  const { canTakeQuiz, planInfo } = usePlanLimits();
  const [subject, setSubject] = useState<Subject | ''>('');
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [customSubtopic, setCustomSubtopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(QUIZ_CONSTANTS.DEFAULT_QUESTIONS);
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTY_LEVELS.BASIC);
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState(10);
  const [gradeLevel, setGradeLevel] = useState('');
  const [examStyle, setExamStyle] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [customSubtopicInput, setCustomSubtopicInput] = useState('');

  const toggleSubtopic = useCallback((st: string) =>
    setSelectedSubtopics(prev => prev.includes(st) ? prev.filter(x => x !== st) : [...prev, st]), []);

  const addCustomSubtopic = useCallback(() => {
    const t = customSubtopicInput.trim();
    if (t && !selectedSubtopics.includes(t)) {
      setSelectedSubtopics(prev => [...prev, t]);
      setCustomSubtopicInput('');
    }
  }, [customSubtopicInput, selectedSubtopics]);

  const isFormValid =
    isValidSubject(subject) &&
    (subject === SUBJECTS.OTHER
      ? customSubtopic.trim().length > 0
      : selectedSubtopics.length > 0 || instructions.trim().length > 0) &&
    questionCount >= QUIZ_CONSTANTS.MIN_QUESTIONS &&
    questionCount <= QUIZ_CONSTANTS.MAX_QUESTIONS && timeLimit > 0;

  const handleSubmit = useCallback(() => {
    if (!isValidSubject(subject) || !isFormValid) return;
    const qtHint = questionType ? `Question type: ${questionType}. ` : '';
    let finalSubtopics: string[] = [];
    let finalInstructions: string | undefined;
    if (subject === SUBJECTS.OTHER) {
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
      subject, subtopics: finalSubtopics, questionCount, difficulty,
      instructions: finalInstructions, timeLimit,
      gradeLevel: gradeLevel.trim() || undefined,
      examStyle: examStyle.trim() || undefined,
    });
  }, [subject, selectedSubtopics, customSubtopic, questionCount, difficulty,
    instructions, timeLimit, gradeLevel, examStyle, questionType, onConfigComplete, isFormValid]);

  const subtopics = subject && subject !== SUBJECTS.OTHER ? (SUBTOPIC_MAP[subject] ?? []) : [];
  const isFormValidWithLimits = isFormValid && canTakeQuiz;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <Card width="100%" maxWidth="960px" margin="0 auto" boxShadow="xl" borderRadius="2xl" overflow="hidden">
        <CardBody padding={{ base: 4, md: 6 }}>
          <VStack spacing={5} align="stretch">

            <Heading size="lg" color="blue.600" textAlign="center">{MESSAGES.GREETING}</Heading>

            {/* ── Class + Exam Type ─────────────────────────────────── */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              <Box>
                <SL>Class / Grade Level</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {CLASSES.map(c => (
                    <Pill key={c} label={`Class ${c}`} active={gradeLevel === `Class ${c}`}
                      onClick={() => setGradeLevel(gradeLevel === `Class ${c}` ? '' : `Class ${c}`)} />
                  ))}
                </HStack>
              </Box>
              <Box>
                <SL>Exam Style</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {EXAM_STYLES.map(s => (
                    <Pill key={s} label={s} active={examStyle === s}
                      onClick={() => setExamStyle(examStyle === s ? '' : s)} cs="purple" />
                  ))}
                </HStack>
              </Box>
            </SimpleGrid>

            {/* ── Question Type ─────────────────────────────────────── */}
            <Box>
              <SL>Question Type</SL>
              <HStack flexWrap="wrap" gap={2}>
                {QUESTION_TYPES.map(qt => (
                  <Pill key={qt} label={qt} active={questionType === qt}
                    onClick={() => setQuestionType(questionType === qt ? '' : qt)} cs="orange" />
                ))}
              </HStack>
            </Box>

            <Divider />

            {/* ── Subject grid ──────────────────────────────────────── */}
            <Box>
              <SL>Subject <Text as="span" color="red.400">*</Text></SL>
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={3}>
                {Object.values(SUBJECTS).map(subj => {
                  const active = subject === subj;
                  return (
                    <Box key={subj} as="button"
                      onClick={() => { setSubject(subj as Subject); setSelectedSubtopics([]); setCustomSubtopic(''); }}
                      p={3} borderRadius="xl" borderWidth={2}
                      borderColor={active ? 'blue.500' : 'gray.200'} bg={active ? 'blue.50' : 'white'}
                      display="flex" flexDir="column" alignItems="center" gap={1} transition="all 0.2s"
                      boxShadow={active ? 'md' : 'sm'}
                      _hover={{ borderColor: 'blue.300', bg: 'blue.50', transform: 'translateY(-1px)', boxShadow: 'md' }}>
                      <Text fontSize="xl">{SUBJECT_ICONS[subj] ?? '📚'}</Text>
                      <Text fontSize="xs" fontWeight={active ? 'bold' : 'medium'}
                        color={active ? 'blue.700' : 'gray.600'} textAlign="center" lineHeight="short">
                        {subj}
                      </Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            {/* ── Custom topic (Other) ──────────────────────────────── */}
            <AnimatePresence>
              {subject === SUBJECTS.OTHER && (
                <motion.div key="custom" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="widest">
                      Your Topic <Text as="span" color="red.400">*</Text>
                    </FormLabel>
                    <Input value={customSubtopic} onChange={e => setCustomSubtopic(e.target.value)}
                      placeholder="e.g., Space, Robotics, Coding Basics…" size="lg" borderRadius="xl"
                      borderWidth={2} borderColor="blue.200" _focus={{ borderColor: 'blue.500' }} />
                  </FormControl>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Subtopics ─────────────────────────────────────────── */}
            <AnimatePresence>
              {subject && subject !== SUBJECTS.OTHER && subtopics.length > 0 && (
                <motion.div key="subtopics" initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <SL>Subtopics</SL>
                      {selectedSubtopics.length > 0 && (
                        <Text fontSize="xs" color="blue.600" fontWeight="bold">{selectedSubtopics.length} selected ✓</Text>
                      )}
                    </HStack>
                    <HStack flexWrap="wrap" gap={2}>
                      {subtopics.map(st => (
                        <Button key={st} size="sm" borderRadius="full" h="auto" py={1.5} px={3} fontSize="xs"
                          variant={selectedSubtopics.includes(st) ? 'solid' : 'outline'}
                          colorScheme={selectedSubtopics.includes(st) ? 'blue' : 'gray'}
                          fontWeight={selectedSubtopics.includes(st) ? 'bold' : 'normal'}
                          onClick={() => toggleSubtopic(st)} whiteSpace="normal" textAlign="left">
                          {st}
                        </Button>
                      ))}
                    </HStack>
                    {/* Custom subtopic text input */}
                    <HStack mt={3} spacing={2}>
                      <Input size="sm" value={customSubtopicInput} borderRadius="full"
                        onChange={e => setCustomSubtopicInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubtopic(); } }}
                        placeholder="Type a custom subtopic…"
                        borderWidth={2} borderColor="blue.200" _focus={{ borderColor: 'blue.500' }} />
                      <Button size="sm" onClick={addCustomSubtopic} colorScheme="blue" borderRadius="full"
                        isDisabled={!customSubtopicInput.trim()} flexShrink={0}>
                        + Add
                      </Button>
                    </HStack>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Difficulty ────────────────────────────────────────── */}
            <Box>
              <SL>Difficulty</SL>
              <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={3}>
                {Object.values(DIFFICULTY_LEVELS).map(d => (
                  <Button key={d} variant={difficulty === d ? 'solid' : 'outline'}
                    colorScheme={difficulty === d ? DIFF_CS[d] : 'gray'}
                    onClick={() => setDifficulty(d)} borderRadius="xl" size="md"
                    fontWeight={difficulty === d ? 'bold' : 'normal'}>
                    {d}
                  </Button>
                ))}
              </SimpleGrid>
            </Box>

            {/* ── Questions + Time ──────────────────────────────────── */}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              <Box>
                <SL>Number of Questions</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {QUESTION_PRESETS.map(n => (
                    <Pill key={n} label={`${n}`} active={questionCount === n} onClick={() => setQuestionCount(n)} />
                  ))}
                </HStack>
              </Box>
              <Box>
                <SL>Time Limit</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {TIME_PRESETS.map(t => (
                    <Pill key={t} label={`${t}m`} active={timeLimit === t} onClick={() => setTimeLimit(t)} cs="teal" />
                  ))}
                </HStack>
              </Box>
            </SimpleGrid>

            {/* ── Instructions ──────────────────────────────────────── */}
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="widest" mb={2}>
                Custom Instructions&nbsp;
                <Text as="span" fontWeight="normal" textTransform="none" letterSpacing="normal" color="gray.400" fontSize="xs">
                  {subject && subject !== SUBJECTS.OTHER && selectedSubtopics.length === 0
                    ? '— or enter subtopic here' : '(optional)'}
                </Text>
              </FormLabel>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="e.g., MCQ only, scenario-based, tricky, fill in the blanks, word problems…"
                size="md" rows={3} borderRadius="xl" borderWidth={2} borderColor="blue.200"
                _focus={{ borderColor: 'blue.500' }} resize="vertical" />
            </FormControl>

            {/* ── Plan limit ────────────────────────────────────────── */}
            {!canTakeQuiz && planInfo && (
              <Box bg="red.50" borderWidth={2} borderColor="red.200" borderRadius="xl" p={4} textAlign="center">
                <Text fontSize="sm" color="red.700" fontWeight="bold">🚫 Daily Quiz Limit Reached</Text>
                <Text fontSize="xs" color="red.600" mt={1}>
                  Used {planInfo.usage.quizCount} of {planInfo.limits.dailyQuizLimit} quizzes today. Try again tomorrow or upgrade.
                </Text>
              </Box>
            )}

            {/* ── Submit ────────────────────────────────────────────── */}
            <HStack spacing={3} pt={1}>
              <Button colorScheme="blue" size="lg" onClick={handleSubmit}
                isDisabled={!isFormValidWithLimits || isGenerating}
                flex={1} borderRadius="xl" fontSize="lg" fontWeight="bold" py={6}
                boxShadow={isFormValidWithLimits && !isGenerating ? 'lg' : 'none'}
                _hover={isFormValidWithLimits && !isGenerating ? { boxShadow: 'xl', transform: 'translateY(-2px)' } : {}}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed' }} transition="all 0.3s">
                {!canTakeQuiz ? '🚫 Limit Reached'
                  : isGenerating
                    ? <HStack spacing={2} justify="center">
                        <Spinner size="sm" color="white" />
                        <Text as="span">Creating{generatingBatch != null && generatingBatch.total > 1 ? ` (${generatingBatch.current}/${generatingBatch.total})` : ''}…</Text>
                      </HStack>
                    : 'Start Quiz! 🎉'}
              </Button>
              {isGenerating && onCancelGeneration && (
                <Button variant="outline" size="lg" onClick={onCancelGeneration} borderRadius="xl" flexShrink={0}>
                  Cancel
                </Button>
              )}
            </HStack>

          </VStack>
        </CardBody>
      </Card>
    </motion.div>
  );
};
