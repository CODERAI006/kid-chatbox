/**
 * Five idiomatic phrases — card grid with tap-for-detail and link to full archive.
 */

import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  Badge,
  HStack,
  Button,
  SimpleGrid,
} from '@/shared/design-system';
import type { DailyPhrase } from '@/types/wordOfDay';
import { MESSAGES } from '@/constants/app';
import { ExpressionCard } from './ExpressionCard';
import { ExpressionDetailModal } from './ExpressionDetailModal';
import type { ExpressionDetail } from './expressionUtils';

interface CommonPhrasesSectionProps {
  phrases: DailyPhrase[];
  /** Denser layout for dashboard sidebar. */
  compact?: boolean;
  editionDate?: string;
}

export const CommonPhrasesSection: FC<CommonPhrasesSectionProps> = ({
  phrases,
  compact = false,
  editionDate,
}) => {
  const navigate = useNavigate();
  const [detailExpression, setDetailExpression] = useState<ExpressionDetail | null>(null);

  if (!phrases.length) return null;

  const openDetail = (expression: ExpressionDetail) => setDetailExpression(expression);

  return (
    <>
      <Card bg="teal.50" borderColor="teal.200" borderWidth={compact ? 1 : 1.5}>
        <CardBody p={compact ? { base: 2, md: 3 } : { base: 3, md: 4 }}>
          <VStack spacing={compact ? 2 : 3} align="stretch">
            <HStack justify="space-between" flexWrap="wrap" gap={1}>
              <Heading size={compact ? 'xs' : 'sm'} color="teal.700">
                💬 {phrases.length} expressions for better communication
              </Heading>
              <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                AI daily
              </Badge>
            </HStack>
            {!compact && (
              <Text fontSize="xs" color="gray.600">
                {MESSAGES.IDIOMS_AI_LABEL} — tap any card for the full example.
              </Text>
            )}

            {compact ? (
              <VStack spacing={2} align="stretch">
                {phrases.map((item, i) => (
                  <ExpressionCard
                    key={item.id || `${item.phrase}-${i}`}
                    expression={{ ...item, editionDate }}
                    index={i}
                    onOpenDetail={openDetail}
                  />
                ))}
              </VStack>
            ) : (
              <SimpleGrid minChildWidth={{ base: '100%', md: '240px' }} spacing={3}>
                {phrases.map((item, i) => (
                  <ExpressionCard
                    key={item.id || `${item.phrase}-${i}`}
                    expression={{ ...item, editionDate }}
                    index={i}
                    onOpenDetail={openDetail}
                  />
                ))}
              </SimpleGrid>
            )}

            <Button
              size="sm"
              colorScheme="teal"
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
};
