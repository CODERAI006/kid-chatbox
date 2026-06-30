/**
 * Sticky nav for interactive 18-section study pages.
 */
import { useEffect, useState } from 'react';
import { Box, HStack, Button, Text } from '@/shared/design-system';
import type { StudyInteractiveSection } from '@/types/studyInteractive';
import { scrollToStudySection } from './studySectionMeta';

interface Props {
  sections: StudyInteractiveSection[];
}

export const StudyInteractiveSectionNav: React.FC<Props> = ({ sections }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length <= 1) return null;

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg="white"
      borderBottomWidth={1}
      borderColor="gray.200"
      py={2}
      mx={{ base: -4, md: 0 }}
      px={{ base: 2, md: 0 }}
      boxShadow="sm"
    >
      <HStack spacing={1} overflowX="auto" py={1} css={{ '&::-webkit-scrollbar': { height: '4px' } }}>
        {sections.map((s) => (
          <Button
            key={s.id}
            size="xs"
            variant={activeId === s.id ? 'solid' : 'ghost'}
            colorScheme={activeId === s.id ? 'blue' : 'gray'}
            flexShrink={0}
            onClick={() => scrollToStudySection(s.id)}
          >
            <Text as="span" mr={1}>{s.icon}</Text>
            {s.title.length > 14 ? `${s.title.slice(0, 12)}…` : s.title}
          </Button>
        ))}
      </HStack>
    </Box>
  );
};
