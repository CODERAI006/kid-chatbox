/** Shared compact UI bits for quiz configuration forms (mobile-first). */
import { Button, Text } from '@/shared/design-system';

export const QuizSectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Text
    fontSize={{ base: '2xs', sm: 'xs' }}
    fontWeight="bold"
    color="gray.500"
    mb={2}
    textTransform="uppercase"
    letterSpacing="widest"
  >
    {children}
  </Text>
);

export const QuizPill = ({
  label,
  active,
  onClick,
  cs = 'blue',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  cs?: string;
}) => (
  <Button
    size={{ base: 'xs', sm: 'sm' }}
    variant={active ? 'solid' : 'outline'}
    colorScheme={active ? cs : 'gray'}
    borderRadius="full"
    onClick={onClick}
    fontWeight={active ? 'bold' : 'normal'}
    flexShrink={0}
    fontSize={{ base: '2xs', sm: 'xs' }}
    px={{ base: 2, sm: 3 }}
  >
    {label}
  </Button>
);
