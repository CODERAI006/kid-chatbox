import type { KeyboardEvent } from 'react';
import { Box, Badge, Text, VStack } from '@/shared/design-system';
import type { ExpressionDetail } from './expressionUtils';
import { formatShortDate } from './expressionUtils';

interface Props {
  expression: ExpressionDetail;
  index?: number;
  onOpenDetail?: (expression: ExpressionDetail) => void;
}

export function ExpressionCard({ expression, index, onOpenDetail }: Props) {
  const isSchool = expression.context === 'school';
  const accent = isSchool ? 'blue' : 'green';

  return (
    <Box
      as="button"
      type="button"
      display="flex"
      flexDirection="column"
      h="100%"
      minW={0}
      w="100%"
      textAlign="left"
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      overflow="hidden"
      cursor={onOpenDetail ? 'pointer' : 'default'}
      aria-label={onOpenDetail ? `${expression.phrase}. Tap for full details.` : undefined}
      onClick={() => onOpenDetail?.(expression)}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (!onOpenDetail) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(expression);
        }
      }}
      _hover={onOpenDetail ? { boxShadow: 'md', borderColor: 'teal.200' } : undefined}
      _active={onOpenDetail ? { transform: 'scale(0.99)' } : undefined}
      _focusVisible={{ outline: '2px solid', outlineColor: 'teal.400', outlineOffset: '2px' }}
      transition="box-shadow 0.2s, border-color 0.2s, transform 0.1s"
    >
      <Box
        px={{ base: 3, md: 4 }}
        pt={{ base: 3, md: 4 }}
        pb={2}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        minW={0}
      >
        <Text fontSize={{ base: 'xl', md: '2xl' }} flexShrink={0} aria-hidden>
          💬
        </Text>
        <Badge
          fontSize={{ base: '2xs', sm: 'xs' }}
          textTransform="uppercase"
          letterSpacing="wide"
          px={2}
          py={0.5}
          borderRadius="full"
          colorScheme={accent}
          variant="subtle"
        >
          {isSchool ? 'School' : 'Daily life'}
        </Badge>
      </Box>
      <VStack align="stretch" px={{ base: 3, md: 4 }} pb={{ base: 3, md: 4 }} flex={1} spacing={2} minW={0}>
        {expression.editionDate && (
          <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.400">
            {formatShortDate(expression.editionDate)}
          </Text>
        )}
        {index != null && !expression.editionDate && (
          <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.400">
            Expression #{index + 1}
          </Text>
        )}
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="extrabold"
          color="teal.800"
          lineHeight="snug"
          wordBreak="break-word"
        >
          {expression.phrase}
        </Text>
        <Text
          fontSize={{ base: 'xs', sm: 'sm' }}
          color="gray.600"
          lineHeight="relaxed"
          flex={1}
          noOfLines={{ base: 4, md: 5 }}
          wordBreak="break-word"
        >
          {expression.meaning}
        </Text>
        {onOpenDetail && (
          <Text fontSize="2xs" color="teal.500" fontWeight="semibold" pt={1}>
            Tap for example &amp; usage →
          </Text>
        )}
      </VStack>
    </Box>
  );
}
