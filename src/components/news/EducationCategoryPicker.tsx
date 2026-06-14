import { Box, SimpleGrid } from '@/shared/design-system';
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

/** Short labels so all 9 topics fit in two rows without scrolling. */
const SHORT_LABEL: Partial<Record<EducationNewsCategoryId, string>> = {
  all: 'All',
  science: 'Science',
  history: 'History',
  geography: 'Geography',
  current_affairs: 'News',
  technology: 'Tech',
  sports: 'Sports',
  environment: 'Nature',
  arts_culture: 'Arts',
  general_knowledge: 'GK',
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
      <SimpleGrid columns={5} spacing={{ base: 1.5, md: 2 }} w="100%">
        {categories.map((c) => {
          const short = SHORT_LABEL[c.id] || c.label.split(' ')[0];
          return (
            <QuizPill
              key={c.id}
              label={`${c.icon} ${short}`}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
              cs={CS_MAP[c.color] || 'blue'}
              fullWidth
            />
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
