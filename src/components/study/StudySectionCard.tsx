/**
 * Anchored section card for study lesson pages.
 */
import { ReactNode } from 'react';
import { Box } from '@/shared/design-system';
import { AnimatedCard } from './AnimatedCard';
import { AnimatedSection } from './AnimatedSection';

interface StudySectionCardProps {
  id: string;
  title: string;
  delay?: number;
  titleColor?: string;
  borderColor?: string;
  bg?: string;
  children: ReactNode;
}

export const StudySectionCard: React.FC<StudySectionCardProps> = ({
  id,
  title,
  delay = 0.2,
  titleColor = 'blue.600',
  borderColor = 'blue.200',
  bg = 'white',
  children,
}) => (
  <Box id={id} scrollMarginTop="88px">
    <AnimatedCard delay={delay} bg={bg} borderWidth={2} borderColor={borderColor} boxShadow="md">
      <AnimatedSection title={title} delay={delay + 0.05} titleColor={titleColor} borderColor={borderColor}>
        {children}
      </AnimatedSection>
    </AnimatedCard>
  </Box>
);
