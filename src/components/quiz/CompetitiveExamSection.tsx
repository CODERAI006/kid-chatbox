/**
 * Competitive exam track picker + AI/saved topic selection (mobile-first).
 */
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Button,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
} from '@/shared/design-system';
import {
  COMPETITIVE_EXAM_TRACKS,
  getCompetitiveTrack,
} from '@/constants/competitiveExams';
import { competitiveTopicsApi } from '@/services/competitiveTopics';
import { getErrorMessage } from '@/services/api';

interface Props {
  trackId: string;
  selectedTopics: string[];
  gradeLevel?: string;
  disabled?: boolean;
  onTrackChange: (trackId: string) => void;
  onTopicsChange: (topics: string[]) => void;
}

const SL = ({ children }: { children: React.ReactNode }) => (
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

export function CompetitiveExamSection({
  trackId,
  selectedTopics,
  gradeLevel,
  disabled,
  onTrackChange,
  onTopicsChange,
}: Props) {
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const activeTrack = getCompetitiveTrack(trackId);

  const loadSaved = useCallback(async (id: string) => {
    if (!id) return;
    setLoadingTopics(true);
    setTopicError(null);
    try {
      const res = await competitiveTopicsApi.getSaved(id);
      const track = getCompetitiveTrack(id);
      const merged = [...new Set([...(res.topics || []), ...(track?.defaultTopics || [])])];
      setAvailableTopics(merged);
    } catch (e) {
      const track = getCompetitiveTrack(id);
      setAvailableTopics([...(track?.defaultTopics || [])]);
      setTopicError(getErrorMessage(e));
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    if (trackId) void loadSaved(trackId);
    else setAvailableTopics([]);
  }, [trackId, loadSaved]);

  const toggleTopic = (topic: string) => {
    const next = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];
    onTopicsChange(next);
  };

  const handleGenerate = async () => {
    if (!trackId || disabled) return;
    setGenerating(true);
    setTopicError(null);
    try {
      const res = await competitiveTopicsApi.generate(trackId, gradeLevel);
      setAvailableTopics(res.topics || []);
      if (selectedTopics.length === 0 && res.topics?.length) {
        onTopicsChange(res.topics.slice(0, 4));
      }
    } catch (e) {
      setTopicError(getErrorMessage(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <VStack align="stretch" spacing={3}>
      <Box bg="purple.50" borderRadius="lg" px={3} py={2} borderWidth={1} borderColor="purple.100">
        <Text fontSize={{ base: '2xs', sm: 'xs' }} color="purple.800">
          Pick your competitive path — topics are suggested by AI and saved for next time.
        </Text>
      </Box>

      <Box>
        <SL>
          Competitive path <Text as="span" color="red.400">*</Text>
        </SL>
        <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} spacing={{ base: 2, md: 3 }}>
          {COMPETITIVE_EXAM_TRACKS.map((track) => {
            const active = trackId === track.id;
            return (
              <Box
                key={track.id}
                as="button"
                type="button"
                disabled={disabled}
                onClick={() => {
                  onTrackChange(track.id);
                  onTopicsChange([]);
                }}
                p={{ base: 2, md: 3 }}
                borderRadius="xl"
                borderWidth={2}
                borderColor={active ? 'purple.500' : 'gray.200'}
                bg={active ? 'purple.50' : 'white'}
                textAlign="center"
                transition="all 0.2s"
                _hover={{ borderColor: 'purple.300', bg: 'purple.50' }}
              >
                <Text fontSize={{ base: 'lg', md: 'xl' }}>{track.icon}</Text>
                <Text
                  fontSize={{ base: '2xs', sm: 'xs' }}
                  fontWeight={active ? 'bold' : 'medium'}
                  color={active ? 'purple.700' : 'gray.600'}
                  lineHeight="short"
                >
                  {track.shortLabel}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>

      <AnimatePresence>
        {activeTrack && (
          <motion.div
            key={activeTrack.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Box>
              <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                <Box flex={1} minW={0}>
                  <Text fontSize={{ base: 'xs', sm: 'sm' }} fontWeight="bold" color="purple.700">
                    {activeTrack.label}
                  </Text>
                  <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                    {activeTrack.exams}
                  </Text>
                </Box>
                <Button
                  size="xs"
                  colorScheme="purple"
                  borderRadius="full"
                  onClick={() => void handleGenerate()}
                  isLoading={generating}
                  isDisabled={disabled || loadingTopics}
                  flexShrink={0}
                >
                  ✨ AI topics
                </Button>
              </HStack>

              {loadingTopics ? (
                <HStack py={2} spacing={2}>
                  <Spinner size="sm" color="purple.500" />
                  <Text fontSize="xs" color="gray.500">Loading saved topics…</Text>
                </HStack>
              ) : (
                <HStack flexWrap="wrap" gap={2}>
                  {availableTopics.map((topic) => (
                    <Button
                      key={topic}
                      size="xs"
                      borderRadius="full"
                      h="auto"
                      py={1}
                      px={2}
                      fontSize="2xs"
                      variant={selectedTopics.includes(topic) ? 'solid' : 'outline'}
                      colorScheme={selectedTopics.includes(topic) ? 'purple' : 'gray'}
                      onClick={() => toggleTopic(topic)}
                      whiteSpace="normal"
                      textAlign="left"
                    >
                      {topic}
                    </Button>
                  ))}
                </HStack>
              )}

              {selectedTopics.length > 0 && (
                <Text fontSize="2xs" color="purple.600" mt={2} fontWeight="semibold">
                  {selectedTopics.length} topic{selectedTopics.length === 1 ? '' : 's'} selected
                </Text>
              )}

              {topicError && (
                <Text fontSize="2xs" color="orange.600" mt={2}>
                  {topicError}
                </Text>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </VStack>
  );
}
