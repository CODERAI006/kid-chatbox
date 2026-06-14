import { Box, HStack } from '@/shared/design-system';
import { QuizPill, QuizSectionLabel } from '@/components/quiz/quizFormUi';
import type { EducationCategory, EducationNewsCategoryId } from '@/types/educationNews';

const CS_MAP: Record<string, string> = {
  blue: 'blue',
  amber: 'orange',
  emerald: 'green',
  rose: 'pink',
  purple: 'purple',
  cyan: 'cyan',
  orange: 'orange',
  teal: 'teal',
  indigo: 'purple',
};

interface Props {
  categories: EducationCategory[];
  activeId: EducationNewsCategoryId;
  onSelect: (id: EducationNewsCategoryId) => void;
}

export default function EducationCategoryPicker({ categories, activeId, onSelect }: Props) {
  return (
    <Box minW={0}>
      <QuizSectionLabel>Browse by topic</QuizSectionLabel>
      <Box
        overflowX="auto"
        pb={1}
        mx={{ base: -1, md: 0 }}
        px={{ base: 1, md: 0 }}
        css={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
      >
        <HStack spacing={2} flexWrap={{ base: 'nowrap', lg: 'wrap' }} w="max-content" maxW="100%">
          {categories.map((c) => (
            <QuizPill
              key={c.id}
              label={`${c.icon} ${c.label}`}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
              cs={CS_MAP[c.color] || 'blue'}
            />
          ))}
        </HStack>
      </Box>
    </Box>
  );
}
