/**
 * Admin: scrape puzzles from web sources.
 */

import { useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, HStack, Input, Text, VStack, useToast,
} from '@/shared/design-system';
import { puzzleAdminApi } from '@/services/admin';

interface Props {
  onComplete?: () => void;
}

export function PuzzleScrapePanel({ onComplete }: Props) {
  const toast = useToast();
  const [count, setCount] = useState(20);
  const [loading, setLoading] = useState(false);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const res = await puzzleAdminApi.scrapeFromWeb(count);
      toast({
        title: res.message || 'Scrape complete',
        status: res.success ? 'success' : 'error',
        duration: 5000,
      });
      onComplete?.();
    } catch (err) {
      toast({ title: 'Scrape failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box bg="white" p={4} borderRadius="lg" borderWidth={1}>
      <Heading size="sm" mb={2}>Import from web</Heading>
      <Alert status="info" borderRadius="md" mb={3} fontSize="sm">
        <AlertIcon />
        Fetches trivia from Open Trivia DB, riddles from Braingle RSS, and science questions from ScienceKids.
      </Alert>
      <VStack align="stretch" spacing={3}>
        <HStack>
          <Text fontSize="sm" minW="100px">Items to fetch</Text>
          <Input type="number" size="sm" w="80px" min={5} max={50} value={count}
            onChange={(e) => setCount(Number(e.target.value))} />
        </HStack>
        <Button colorScheme="teal" size="sm" onClick={handleScrape} isLoading={loading} alignSelf="flex-start">
          Scrape &amp; add to bank
        </Button>
      </VStack>
    </Box>
  );
}
