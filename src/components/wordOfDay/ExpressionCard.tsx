import { Box, Badge, Text, VStack, HStack, Card, CardBody } from '@/shared/design-system';
import type { ExpressionDetail } from './expressionUtils';
import { formatShortDate } from './expressionUtils';

const CARD_COLORS = [
  { bg: 'teal.50', border: 'teal.300', badge: 'teal', accent: 'teal.800' },
  { bg: 'cyan.50', border: 'cyan.300', badge: 'cyan', accent: 'cyan.800' },
  { bg: 'green.50', border: 'green.300', badge: 'green', accent: 'green.800' },
];

interface Props {
  expression: ExpressionDetail;
  index?: number;
  onOpenDetail?: (expression: ExpressionDetail) => void;
  /** Show edition date on archive cards only. */
  showDate?: boolean;
  compact?: boolean;
  /** Match Facts & Fun preview styling (orange boxes). */
  variant?: 'default' | 'facts';
}

function FactsStyleCard({
  expression,
  compact = false,
  showDate = false,
  interactive,
  onActivate,
}: {
  expression: ExpressionDetail;
  compact?: boolean;
  showDate?: boolean;
  interactive: boolean;
  onActivate: () => void;
}) {
  const isSchool = expression.context === 'school';

  return (
    <Box
      p={compact ? 2.5 : 3}
      borderRadius="md"
      bg="orange.50"
      borderWidth="1px"
      borderColor="orange.100"
      w="100%"
      minW={0}
      cursor={interactive ? 'pointer' : 'default'}
      onClick={interactive ? onActivate : undefined}
      _hover={interactive ? { borderColor: 'orange.200', boxShadow: 'sm' } : undefined}
      transition="all 0.2s"
    >
      <VStack spacing={1.5} align="stretch" minW={0}>
        <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={1}>
          <Text
            fontSize={compact ? 'sm' : 'md'}
            fontWeight="bold"
            color="gray.800"
            lineHeight="snug"
            wordBreak="break-word"
            flex={1}
          >
            {expression.phrase}
          </Text>
          <Badge
            fontSize="2xs"
            textTransform="capitalize"
            colorScheme={isSchool ? 'blue' : 'orange'}
            flexShrink={0}
          >
            {isSchool ? 'School' : 'Daily life'}
          </Badge>
        </HStack>

        {showDate && expression.editionDate && (
          <Text fontSize="2xs" color="gray.500">
            {formatShortDate(expression.editionDate)}
          </Text>
        )}

        <Text
          fontSize="xs"
          color="gray.600"
          lineHeight="1.5"
          noOfLines={compact ? 2 : 3}
          wordBreak="break-word"
        >
          {expression.meaning}
        </Text>

        {expression.example && (
          <Text
            fontSize="xs"
            color="gray.500"
            fontStyle="italic"
            noOfLines={compact ? 2 : 2}
            wordBreak="break-word"
          >
            &ldquo;{expression.example}&rdquo;
          </Text>
        )}

        {interactive && (
          <Text fontSize="2xs" color="orange.600" fontWeight="semibold">
            Tap for example &amp; usage →
          </Text>
        )}
      </VStack>
    </Box>
  );
}

export function ExpressionCard({
  expression,
  index = 0,
  onOpenDetail,
  showDate = false,
  compact = false,
  variant = 'default',
}: Props) {
  const interactive = Boolean(onOpenDetail);
  const handleActivate = () => onOpenDetail?.(expression);

  if (variant === 'facts') {
    return (
      <FactsStyleCard
        expression={expression}
        compact={compact}
        showDate={showDate}
        interactive={interactive}
        onActivate={handleActivate}
      />
    );
  }

  const isSchool = expression.context === 'school';
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <Card
      bg={color.bg}
      borderColor={color.border}
      borderWidth={1.5}
      w="100%"
      minW={0}
      cursor={interactive ? 'pointer' : 'default'}
      onClick={interactive ? handleActivate : undefined}
      _hover={interactive ? { boxShadow: 'md' } : undefined}
      transition="all 0.2s"
    >
      <CardBody p={compact ? { base: 2, md: 2.5 } : { base: 3, md: 4 }}>
        <VStack spacing={compact ? 1.5 : 2} align="stretch" minW={0}>
          <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={1}>
            <HStack spacing={2} flex={1} minW={0} align="flex-start">
              <Box
                bg={color.border}
                color="white"
                borderRadius="full"
                w={compact ? 6 : 7}
                h={compact ? 6 : 7}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize={compact ? 'xs' : 'sm'}
                fontWeight="bold"
                flexShrink={0}
              >
                {index + 1}
              </Box>
              <Text
                fontSize={compact ? 'sm' : { base: 'md', md: 'lg' }}
                fontWeight="extrabold"
                color={color.accent}
                lineHeight="snug"
                wordBreak="break-word"
                flex={1}
              >
                {expression.phrase}
              </Text>
            </HStack>
            <Badge
              fontSize="2xs"
              textTransform="uppercase"
              letterSpacing="wide"
              colorScheme={isSchool ? 'blue' : 'orange'}
              variant="subtle"
              flexShrink={0}
            >
              {isSchool ? 'School' : 'Daily'}
            </Badge>
          </HStack>

          {showDate && expression.editionDate && (
            <Text fontSize="2xs" color="gray.500" pl={compact ? 8 : 9}>
              {formatShortDate(expression.editionDate)}
            </Text>
          )}

          <Text
            fontSize={compact ? 'xs' : 'sm'}
            color="gray.700"
            lineHeight="tall"
            pl={compact ? 8 : 9}
            noOfLines={compact ? 2 : 3}
            wordBreak="break-word"
          >
            {expression.meaning}
          </Text>

          {expression.example && (
            <Text
              fontSize="xs"
              color="gray.500"
              fontStyle="italic"
              pl={compact ? 8 : 9}
              noOfLines={compact ? 2 : 3}
              wordBreak="break-word"
            >
              &ldquo;{expression.example}&rdquo;
            </Text>
          )}

          {interactive && (
            <Text fontSize="2xs" color={`${color.badge}.600`} fontWeight="semibold" pl={compact ? 8 : 9}>
              Tap for example &amp; usage →
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
