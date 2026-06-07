/**
 * Sticky jump navigation for 17-section study lessons.
 */
import { HStack, Button, Box, Text } from '@/shared/design-system';
import { STUDY_LESSON_SECTIONS, scrollToStudySection } from './studySectionMeta';

export const StudyLessonSectionNav: React.FC = () => (
  <Box
    position="sticky"
    top={0}
    zIndex={10}
    bg="white"
    borderBottomWidth={1}
    borderColor="gray.200"
    py={2}
    px={1}
    boxShadow="sm"
    borderRadius="xl"
    mb={2}
  >
    <Text fontSize="xs" fontWeight="bold" color="gray.500" px={2} mb={1}>
      Jump to section
    </Text>
    <HStack
      spacing={2}
      overflowX="auto"
      px={2}
      pb={1}
      css={{ '&::-webkit-scrollbar': { height: '6px' }, scrollbarWidth: 'thin' }}
    >
      {STUDY_LESSON_SECTIONS.map((s) => (
        <Button
          key={s.id}
          size="xs"
          variant="outline"
          colorScheme="blue"
          flexShrink={0}
          borderRadius="full"
          onClick={() => scrollToStudySection(s.id)}
        >
          {s.emoji} {s.label}
        </Button>
      ))}
    </HStack>
  </Box>
);
