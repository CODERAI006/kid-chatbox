/**
 * Pill-based quiz config form — mirrors the student ConfigurationForm UI.
 * Used inside CreateQuizModal for the AI Generation tab.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, VStack, HStack, SimpleGrid, Text, Button, Input, Textarea,
  FormControl, FormLabel, FormHelperText, Divider, Select,
} from '@/shared/design-system';

const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const EXAM_STYLES = ['CBSE', 'NCERT', 'Olympiad', 'Competitive', 'ICSE', 'State Board'];
const QUESTION_TYPES = ['MCQ', 'Scenario Based', 'True / False', 'Fill in Blanks', 'Word Problems', 'Mixed'];
const QUESTION_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50];
const TIME_PRESETS = [5, 10, 15, 20, 30, 45, 60];
const DIFFICULTY_LEVELS = ['Basic', 'Advanced', 'Expert', 'Mix'];
const DIFF_CS: Record<string, string> = { Basic: 'green', Advanced: 'orange', Expert: 'red', Mix: 'purple' };
const SUBJECTS_WITH_ICONS: { label: string; icon: string }[] = [
  { label: 'Hindi', icon: '📖' },
  { label: 'English', icon: '🔤' },
  { label: 'Maths', icon: '🔢' },
  { label: 'EVS / Science', icon: '🌱' },
  { label: 'Social Studies', icon: '🌍' },
  { label: 'General Knowledge', icon: '🧠' },
  { label: 'Current Affairs', icon: '📰' },
  { label: 'Chess', icon: '♟️' },
  { label: 'Other', icon: '✨' },
];

const SL = ({ children }: { children: React.ReactNode }) => (
  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="widest">
    {children}
  </Text>
);

const Pill = ({ label, active, onClick, cs = 'blue' }: { label: string; active: boolean; onClick: () => void; cs?: string }) => (
  <Button size="sm" variant={active ? 'solid' : 'outline'} colorScheme={active ? cs : 'gray'}
    borderRadius="full" onClick={onClick} fontWeight={active ? 'bold' : 'normal'} flexShrink={0}>
    {label}
  </Button>
);

export interface AIQuizConfigData {
  name: string;
  description: string;
  gradeLevel: string;
  examStyle: string;
  subject: string;
  questionType: string;
  difficulty: string;
  numberOfQuestions: number;
  passingPercentage: number;
  timeLimit: string;
  language: string;
  sampleQuestion: string;
}

interface Props {
  value: AIQuizConfigData;
  onChange: (updates: Partial<AIQuizConfigData>) => void;
  /** When true, required-field errors become visible (e.g. after a submit attempt) */
  showErrors?: boolean;
}

export const AIQuizConfigForm: React.FC<Props> = ({ value, onChange, showErrors = false }) => {
  const set = (updates: Partial<AIQuizConfigData>) => onChange(updates);

  const nameError   = showErrors && !value.name.trim();
  const diffError   = showErrors && !value.difficulty;

  return (
    <VStack spacing={5} align="stretch">
      {/* Quiz name & description */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Quiz Name</FormLabel>
          <Input value={value.name} onChange={e => set({ name: e.target.value })}
            placeholder="Enter quiz name" borderRadius="xl"
            borderColor={nameError ? 'red.400' : undefined}
            _focus={nameError ? { borderColor: 'red.400', boxShadow: '0 0 0 1px var(--chakra-colors-red-400)' } : undefined}
          />
          {nameError && <Text fontSize="xs" color="red.500" mt={1}>Quiz name is required</Text>}
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Description</FormLabel>
          <Input value={value.description} onChange={e => set({ description: e.target.value })}
            placeholder="Optional description" borderRadius="xl" />
        </FormControl>
      </SimpleGrid>

      <Divider />

      {/* Class + Exam Style */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <Box>
          <SL>Class / Grade Level</SL>
          <HStack flexWrap="wrap" gap={2}>
            {CLASSES.map(c => (
              <Pill key={c} label={`Class ${c}`}
                active={value.gradeLevel === `Class ${c}`}
                onClick={() => set({ gradeLevel: value.gradeLevel === `Class ${c}` ? '' : `Class ${c}` })} />
            ))}
          </HStack>
        </Box>
        <Box>
          <SL>Exam Style</SL>
          <HStack flexWrap="wrap" gap={2}>
            {EXAM_STYLES.map(s => (
              <Pill key={s} label={s} active={value.examStyle === s} cs="purple"
                onClick={() => set({ examStyle: value.examStyle === s ? '' : s })} />
            ))}
          </HStack>
        </Box>
      </SimpleGrid>

      {/* Subject grid */}
      <Box>
        <SL>Subject</SL>
        <SimpleGrid columns={{ base: 3, sm: 4, md: 5 }} spacing={3}>
          {SUBJECTS_WITH_ICONS.map(({ label, icon }) => {
            const active = value.subject === label;
            return (
              <Box key={label} as="button"
                onClick={() => set({ subject: active ? '' : label })}
                p={3} borderRadius="xl" borderWidth={2}
                borderColor={active ? 'blue.500' : 'gray.200'}
                bg={active ? 'blue.50' : 'white'}
                display="flex" flexDir="column" alignItems="center" gap={1}
                transition="all 0.2s" boxShadow={active ? 'md' : 'sm'}
                _hover={{ borderColor: 'blue.300', bg: 'blue.50', transform: 'translateY(-1px)', boxShadow: 'md' }}>
                <Text fontSize="xl">{icon}</Text>
                <Text fontSize="xs" fontWeight={active ? 'bold' : 'medium'}
                  color={active ? 'blue.700' : 'gray.600'} textAlign="center" lineHeight="short">
                  {label}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Question Type */}
      <Box>
        <SL>Question Type</SL>
        <HStack flexWrap="wrap" gap={2}>
          {QUESTION_TYPES.map(qt => (
            <Pill key={qt} label={qt} active={value.questionType === qt} cs="orange"
              onClick={() => set({ questionType: value.questionType === qt ? '' : qt })} />
          ))}
        </HStack>
      </Box>

      <Divider />

      {/* Difficulty */}
      <Box>
        <SL>Difficulty <Text as="span" color="red.400">*</Text></SL>
        <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={3}>
          {DIFFICULTY_LEVELS.map(d => (
            <Button key={d} variant={value.difficulty === d ? 'solid' : 'outline'}
              colorScheme={value.difficulty === d ? DIFF_CS[d] : 'gray'}
              onClick={() => set({ difficulty: d })} borderRadius="xl" size="md"
              fontWeight={value.difficulty === d ? 'bold' : 'normal'}>
              {d}
            </Button>
          ))}
        </SimpleGrid>
        {diffError && (
          <Text fontSize="sm" color="red.500" mt={1}>Please select a difficulty level</Text>
        )}
      </Box>

      {/* Number of Questions + Time */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
        <Box>
          <SL>Number of Questions</SL>
          <HStack flexWrap="wrap" gap={2}>
            {QUESTION_PRESETS.map(n => (
              <Pill key={n} label={`${n}`} active={value.numberOfQuestions === n}
                onClick={() => set({ numberOfQuestions: n })} />
            ))}
          </HStack>
        </Box>
        <Box>
          <SL>Time Limit (minutes)</SL>
          <HStack flexWrap="wrap" gap={2}>
            {TIME_PRESETS.map(t => (
              <Pill key={t} label={`${t}`} active={value.timeLimit === String(t)} cs="teal"
                onClick={() => set({ timeLimit: value.timeLimit === String(t) ? '' : String(t) })} />
            ))}
          </HStack>
        </Box>
      </SimpleGrid>

      {/* Language + Passing % */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Language</FormLabel>
          <Select value={value.language} onChange={e => set({ language: e.target.value })}
            borderRadius="xl" size="sm">
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Hinglish">Hinglish</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Passing %</FormLabel>
          <Input type="number" value={value.passingPercentage}
            onChange={e => set({ passingPercentage: Number(e.target.value) || 60 })}
            min={0} max={100} borderRadius="xl" size="sm" />
        </FormControl>
      </SimpleGrid>

      {/* Sample question */}
      <AnimatePresence>
        <motion.div key="sample" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <FormControl>
            <FormLabel fontSize="sm">Sample Question Pattern (Optional)</FormLabel>
            <Textarea value={value.sampleQuestion}
              onChange={e => set({ sampleQuestion: e.target.value })}
              placeholder="Enter a sample question to guide AI generation style…"
              borderRadius="xl" rows={2} />
            <FormHelperText>Guides the AI on question style, format, and complexity.</FormHelperText>
          </FormControl>
        </motion.div>
      </AnimatePresence>
    </VStack>
  );
};
