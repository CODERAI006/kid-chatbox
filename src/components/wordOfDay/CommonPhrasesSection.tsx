/**
 * Expression of the Day — separate box, Facts & Fun orange theme.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  Button,
  Box,
} from '@/shared/design-system';
import type { DailyPhrase } from '@/types/wordOfDay';
import { MESSAGES } from '@/constants/app';
import { ExpressionCard } from './ExpressionCard';
import { ExpressionDetailModal } from './ExpressionDetailModal';
import type { ExpressionDetail } from './expressionUtils';

interface CommonPhrasesSectionProps {
  phrases: DailyPhrase[];
  /** Denser layout for dashboard home. */
  compact?: boolean;
}

export function CommonPhrasesSection({
  phrases,
  compact = false,
}: CommonPhrasesSectionProps) {
  const navigate = useNavigate();
  const [detailExpression, setDetailExpression] = useState<ExpressionDetail | null>(null);

  if (!phrases.length) return null;

  const openDetail = (expression: ExpressionDetail) => setDetailExpression(expression);

  return (
    <>
      <Card bg="white" borderColor="orange.200" borderWidth={2} boxShadow="md">
        <CardBody p={compact ? { base: 3, md: 4 } : { base: 3, md: 4 }}>
          <VStack spacing={compact ? 2 : 3} align="stretch">
            <Box>
              <Heading size="sm" color="orange.600">
                💬 Expression of the Day
              </Heading>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                {phrases.length} phrases for better communication · refreshes daily
              </Text>
            </Box>

            {!compact && (
              <Text fontSize="xs" color="gray.600">
                {MESSAGES.IDIOMS_AI_LABEL} — tap any card for the full example.
              </Text>
            )}

            <VStack spacing={2} align="stretch">
              {phrases.map((item, i) => (
                <ExpressionCard
                  key={item.id || `${item.phrase}-${i}`}
                  expression={item}
                  index={i}
                  compact={compact}
                  variant="facts"
                  onOpenDetail={openDetail}
                />
              ))}
            </VStack>

            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              alignSelf="flex-start"
              onClick={() => navigate('/expressions')}
            >
              All expressions till today →
            </Button>
          </VStack>
        </CardBody>
      </Card>

      <ExpressionDetailModal
        expression={detailExpression}
        isOpen={Boolean(detailExpression)}
        onClose={() => setDetailExpression(null)}
      />
    </>
  );
}

export default CommonPhrasesSection;
