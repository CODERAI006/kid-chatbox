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
  fullWidth = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  cs?: string;
  fullWidth?: boolean;
}) => (
  <Button
    size={{ base: 'xs', sm: 'sm' }}
    variant={active ? 'solid' : 'outline'}
    colorScheme={active ? cs : 'gray'}
    borderRadius="full"
    onClick={onClick}
    fontWeight={active ? 'bold' : 'normal'}
    flexShrink={fullWidth ? undefined : 0}
    w={fullWidth ? '100%' : undefined}
    fontSize={{ base: '2xs', sm: 'xs' }}
    px={{ base: 1.5, sm: 2 }}
    minW={0}
    whiteSpace="nowrap"
    overflow="hidden"
    textOverflow="ellipsis"
  >
    {label}
  </Button>
);
