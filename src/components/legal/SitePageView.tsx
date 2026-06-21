/**
 * Public legal / static page viewer (privacy policy, PII disclaimer).
 */
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  HStack,
  useColorModeValue,
} from '@/shared/design-system';
import { AiRichContentView } from '@/components/learning/AiRichContentView';
import { sitePagesApi, type SitePage } from '@/services/sitePages';
import { APP_CONSTANTS } from '@/constants/app';

interface SitePageViewProps {
  slug: string;
}

export function SitePageView({ slug }: SitePageViewProps) {
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageBg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const muted = useColorModeValue('gray.600', 'gray.400');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    sitePagesApi
      .getPublicPage(slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load page');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (page?.title) {
      document.title = `${page.title} | ${APP_CONSTANTS.BRAND_NAME}`;
    }
    return () => {
      document.title = APP_CONSTANTS.BRAND_NAME;
    };
  }, [page?.title]);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Box bg="gray.800" color="white" py={4} px={4} borderBottomWidth="1px" borderColor="whiteAlpha.200">
        <Container maxW="4xl">
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontWeight="bold" fontSize="lg">
              {APP_CONSTANTS.BRAND_NAME}
            </Text>
            <HStack spacing={3}>
              <Button as={RouterLink} to="/privacy" size="sm" variant="ghost" color="cyan.300">
                Privacy
              </Button>
              <Button as={RouterLink} to="/disclaimer" size="sm" variant="ghost" color="cyan.300">
                Disclaimer
              </Button>
              <Button as={RouterLink} to="/" size="sm" colorScheme="cyan" variant="outline">
                Home
              </Button>
            </HStack>
          </HStack>
        </Container>
      </Box>

      <Container maxW="4xl" py={{ base: 6, md: 10 }}>
        {loading && (
          <VStack py={16}>
            <Spinner size="lg" color="blue.500" />
            <Text color={muted}>Loading…</Text>
          </VStack>
        )}

        {!loading && error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {!loading && page && (
          <Box
            bg={cardBg}
            borderRadius="xl"
            borderWidth="1px"
            borderColor={borderColor}
            p={{ base: 5, md: 8 }}
            boxShadow="sm"
          >
            <VStack align="stretch" spacing={4}>
              <Heading size="lg">{page.title}</Heading>
              {page.metaDescription && (
                <Text fontSize="sm" color={muted}>
                  {page.metaDescription}
                </Text>
              )}
              {page.updatedAt && (
                <Text fontSize="xs" color={muted}>
                  Last updated: {new Date(page.updatedAt).toLocaleDateString()}
                </Text>
              )}
              <Box pt={2}>
                <AiRichContentView content={page.body} />
              </Box>
            </VStack>
          </Box>
        )}
      </Container>
    </Box>
  );
}
