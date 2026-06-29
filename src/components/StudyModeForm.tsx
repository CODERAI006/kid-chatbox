/**
 * StudyModeForm — button-first setup (aligned with AI Quiz Mode).
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, VStack, HStack, Text, Button, Card, CardBody,
  SimpleGrid, Textarea, Input, FormControl, FormLabel, Divider,
} from '@/shared/design-system';
import { ProfileQuizHint } from '@/components/quiz/ProfileQuizHint';
import {
  SUBJECTS, DIFFICULTY_LEVELS,
  HINDI_SUBTOPICS, ENGLISH_SUBTOPICS, MATHS_SUBTOPICS,
  EVS_SCIENCE_SUBTOPICS, SOCIAL_STUDIES_SUBTOPICS,
  GENERAL_KNOWLEDGE_SUBTOPICS, CURRENT_AFFAIRS_SUBTOPICS,
  CHESS_SUBTOPICS,
} from '@/constants/quiz';
import { EXAM_BOARDS } from '@/constants/examBoard';
import { Subject, Difficulty } from '@/types/quiz';
import { isValidSubject } from '@/utils/validation';
import { STUDY_MODE_MESSAGES } from '@/constants/study';
import { STUDY_PROMPT_LIMITS } from '@/utils/studyPromptLimits';
import { loadStudySetupPrefs, saveStudySetupPrefs } from '@/utils/learningFormatPrefs';

const LESSON_STYLES = ['Story-based', 'Step-by-step', 'Visual', 'Exam-focused'];
const LESSON_DEPTHS = ['Quick (5 min)', 'Standard (15 min)', 'Deep Dive (25 min)'];
const CONTENT_FOCUS_OPTS = ['Q&A Practice', 'Fun Facts', 'Real Examples', 'Diagrams & Images'];
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

export interface StudyTopicConfig {
  subject: Subject;
  subtopics: string[];
  difficulty: Difficulty;
  gradeLevel?: string;
  examStyle?: string;
  lessonStyle?: string;
  lessonDepth?: string;
  contentFocus: string[];
  instructions?: string;
}

interface StudyModeFormProps {
  onTopicSubmit: (config: StudyTopicConfig) => void;
  userGrade?: string;
  isGenerating?: boolean;
}

const SL = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="widest">
    {children}
  </Text>
);

const Pill = ({ label, active, onClick, cs = 'blue' }: {
  label: string; active: boolean; onClick: () => void; cs?: string;
}) => (
  <Button size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? cs : 'gray'}
    borderRadius="full" onClick={onClick} fontWeight={active ? 'bold' : 'normal'} flexShrink={0}>
    {label}
  </Button>
);

export const StudyModeForm: React.FC<StudyModeFormProps> = ({
  onTopicSubmit, userGrade, isGenerating = false,
}) => {
  const savedPrefs = loadStudySetupPrefs();
  const [subject, setSubject] = useState<Subject | ''>('');
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [customSubtopic, setCustomSubtopic] = useState('');
  const [customSubtopicInput, setCustomSubtopicInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (savedPrefs.difficulty as Difficulty) || DIFFICULTY_LEVELS.BASIC
  );
  const [examStyle, setExamStyle] = useState(savedPrefs.examStyle || '');
  const [lessonStyle, setLessonStyle] = useState(savedPrefs.lessonStyle || 'Story-based');
  const [lessonDepth, setLessonDepth] = useState(savedPrefs.lessonDepth || 'Standard (15 min)');
  const [contentFocus, setContentFocus] = useState<string[]>(
    savedPrefs.contentFocus?.length ? savedPrefs.contentFocus : ['Q&A Practice', 'Fun Facts']
  );
  const [instructions, setInstructions] = useState('');
  const [profileReady, setProfileReady] = useState(false);
  const [submitLocked, setSubmitLocked] = useState(false);

  const toggleSubtopic = useCallback((st: string) =>
    setSelectedSubtopics((prev) => prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]), []);

  const toggleFocus = useCallback((opt: string) =>
    setContentFocus((prev) => prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]), []);

  const addCustomSubtopic = useCallback(() => {
    const t = customSubtopicInput.trim();
    if (t && !selectedSubtopics.includes(t)) {
      setSelectedSubtopics((prev) => [...prev, t]);
      setCustomSubtopicInput('');
    }
  }, [customSubtopicInput, selectedSubtopics]);

  const subtopics = subject && subject !== SUBJECTS.OTHER ? (SUBTOPIC_MAP[subject] ?? []) : [];

  const isFormValid =
    isValidSubject(subject) &&
    (subject === SUBJECTS.OTHER
      ? customSubtopic.trim().length > 0
      : selectedSubtopics.length > 0 || instructions.trim().length > 0);

  const handleSubmit = useCallback(() => {
    if (!isFormValid || submitLocked || isGenerating || !profileReady) return;
    if (instructions.trim().length > STUDY_PROMPT_LIMITS.maxExtraInstructionsChars) return;
    setSubmitLocked(true);
    let finalSubtopics: string[] = [];
    if (subject === SUBJECTS.OTHER) {
      finalSubtopics = customSubtopic.trim() ? [customSubtopic.trim()] : [];
    } else if (selectedSubtopics.length > 0) {
      finalSubtopics = selectedSubtopics;
    } else {
      finalSubtopics = [instructions.trim()];
    }
    onTopicSubmit({
      subject,
      subtopics: finalSubtopics,
      difficulty,
      gradeLevel: userGrade || undefined,
      examStyle: examStyle.trim() || undefined,
      lessonStyle,
      lessonDepth,
      contentFocus,
      instructions: instructions.trim() || undefined,
    });

    saveStudySetupPrefs({
      examStyle: examStyle.trim() || undefined,
      lessonStyle,
      lessonDepth,
      difficulty,
      contentFocus,
    });
  }, [subject, selectedSubtopics, customSubtopic, difficulty, examStyle,
    lessonStyle, lessonDepth, contentFocus, instructions, onTopicSubmit, isFormValid,
    submitLocked, isGenerating, profileReady, userGrade]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
      <Card width="100%" maxWidth="960px" margin="0 auto" boxShadow="xl" borderRadius="2xl" overflow="hidden">
        <CardBody padding={{ base: 4, md: 6 }}>
          <VStack spacing={5} align="stretch">
            <ProfileQuizHint onReadyChange={setProfileReady} />

            <Box>
              <SL>Subject <Text as="span" color="red.400">*</Text></SL>
              <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={3}>
                {Object.values(SUBJECTS).map((subj) => {
                  const active = subject === subj;
                  return (
                    <Box key={subj} as="button"
                      onClick={() => { setSubject(subj as Subject); setSelectedSubtopics([]); setCustomSubtopic(''); }}
                      p={3} borderRadius="xl" borderWidth={2}
                      borderColor={active ? 'blue.500' : 'gray.200'} bg={active ? 'blue.50' : 'white'}
                      display="flex" flexDir="column" alignItems="center" gap={1}
                      boxShadow={active ? 'md' : 'sm'}
                      _hover={{ borderColor: 'blue.300', bg: 'blue.50' }}>
                      <Text fontSize="xl">{SUBJECT_ICONS[subj] ?? '📚'}</Text>
                      <Text fontSize="xs" fontWeight={active ? 'bold' : 'medium'} color={active ? 'blue.700' : 'gray.600'} textAlign="center">
                        {subj}
                      </Text>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>

            <AnimatePresence>
              {subject === SUBJECTS.OTHER && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">Your Topic *</FormLabel>
                    <Input value={customSubtopic} onChange={(e) => setCustomSubtopic(e.target.value)}
                      placeholder="e.g., Space, Robotics, Coding…" size="lg" borderRadius="xl" />
                  </FormControl>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {subject && subject !== SUBJECTS.OTHER && subtopics.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <SL>Subtopics / Chapters</SL>
                  <HStack flexWrap="wrap" gap={2}>
                    {subtopics.map((st) => (
                      <Button key={st} size="sm" borderRadius="full"
                        variant={selectedSubtopics.includes(st) ? 'solid' : 'outline'}
                        colorScheme={selectedSubtopics.includes(st) ? 'blue' : 'gray'}
                        onClick={() => toggleSubtopic(st)}>{st}</Button>
                    ))}
                  </HStack>
                  <HStack mt={3} spacing={2}>
                    <Input size="sm" borderRadius="full" value={customSubtopicInput}
                      onChange={(e) => setCustomSubtopicInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubtopic(); } }}
                      placeholder="Add custom subtopic…" />
                    <Button size="sm" colorScheme="blue" borderRadius="full" onClick={addCustomSubtopic}
                      isDisabled={!customSubtopicInput.trim()}>+ Add</Button>
                  </HStack>
                </motion.div>
              )}
            </AnimatePresence>

            <Divider />

            <Box>
              <SL>Exam Style</SL>
              <HStack flexWrap="wrap" gap={2}>
                {EXAM_BOARDS.map((s) => (
                  <Pill key={s} label={s} active={examStyle === s} cs="purple"
                    onClick={() => setExamStyle(examStyle === s ? '' : s)} />
                ))}
              </HStack>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
              <Box>
                <SL>Lesson Style</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {LESSON_STYLES.map((s) => (
                    <Pill key={s} label={s} active={lessonStyle === s} cs="orange"
                      onClick={() => setLessonStyle(s)} />
                  ))}
                </HStack>
              </Box>
              <Box>
                <SL>Lesson Depth</SL>
                <HStack flexWrap="wrap" gap={2}>
                  {LESSON_DEPTHS.map((d) => (
                    <Pill key={d} label={d} active={lessonDepth === d} cs="teal"
                      onClick={() => setLessonDepth(d)} />
                  ))}
                </HStack>
              </Box>
            </SimpleGrid>

            <Box>
              <SL>Include in Lesson (pick any)</SL>
              <HStack flexWrap="wrap" gap={2}>
                {CONTENT_FOCUS_OPTS.map((opt) => (
                  <Pill key={opt} label={opt} active={contentFocus.includes(opt)} cs="cyan"
                    onClick={() => toggleFocus(opt)} />
                ))}
              </HStack>
            </Box>

            <Box>
              <SL>Difficulty</SL>
              <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={3}>
                {Object.values(DIFFICULTY_LEVELS).map((d) => (
                  <Button key={d} variant={difficulty === d ? 'solid' : 'outline'}
                    colorScheme={difficulty === d ? DIFF_CS[d] : 'gray'}
                    onClick={() => setDifficulty(d)} borderRadius="xl">{d}</Button>
                ))}
              </SimpleGrid>
            </Box>

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                Extra instructions (optional)
              </FormLabel>
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g., focus on diagrams, include Hindi examples, exam-style notes…"
                rows={3} borderRadius="xl" borderWidth={2} borderColor="blue.200"
                maxLength={STUDY_PROMPT_LIMITS.maxExtraInstructionsChars} />
              <Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
                {instructions.length}/{STUDY_PROMPT_LIMITS.maxExtraInstructionsChars} characters
              </Text>
            </FormControl>

            <Button colorScheme="blue" size="lg" onClick={handleSubmit}
              isDisabled={!isFormValid || !profileReady || isGenerating || submitLocked}
              borderRadius="xl" fontSize="lg" fontWeight="bold" py={6}
              boxShadow={isFormValid && profileReady ? 'lg' : 'none'}>
              {isGenerating ? 'Creating lesson…' : `${STUDY_MODE_MESSAGES.START_STUDYING} 📚`}
            </Button>
          </VStack>
        </CardBody>
      </Card>
    </motion.div>
  );
};
