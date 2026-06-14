/**
 * Full-screen in-app browser — iframe first, falls back to in-app summary reader.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  HStack,
  IconButton,
  Link,
  Spinner,
  Text,
  List,
  ListItem,
  VStack,
} from '@/shared/design-system';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';

const LOAD_TIMEOUT_MS = 8000;

type ViewMode = 'iframe' | 'summary';

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  onClose: () => void;
}

function buildSummaryBody(article: EducationArticle): string[] {
  if (article.formattedParagraphs?.length) return article.formattedParagraphs;
  const text = article.kidSummary || article.summary || article.description;
  return text ? text.split(/\n+/).map((p) => p.trim()).filter(Boolean) : [];
}

export default function EducationNewsInAppBrowser({ article, category, onClose }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('iframe');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadSlow, setLoadSlow] = useState(false);

  const summaryParagraphs = useMemo(() => buildSummaryBody(article), [article]);
  const hasSummary = summaryParagraphs.length > 0 || (article.keyPoints?.length ?? 0) > 0;

  const resetLoadState = useCallback(() => {
    setIframeLoading(true);
    setLoadSlow(false);
  }, []);

  const switchToSummary = useCallback(() => {
    setViewMode('summary');
    setIframeLoading(false);
    setLoadSlow(false);
  }, []);

  useEffect(() => {
    resetLoadState();
    setViewMode('iframe');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, article.url, resetLoadState]);

  useEffect(() => {
    if (viewMode !== 'iframe' || !iframeLoading) return undefined;
    const timer = window.setTimeout(() => {
      setLoadSlow(true);
      if (hasSummary) switchToSummary();
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [iframeLoading, article.url, viewMode, hasSummary, switchToSummary]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setLoadSlow(false);
  };

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={1500}
      bg="gray.50"
      display="flex"
      flexDirection="column"
      overflow="hidden"
    >
      <Box
        flexShrink={0}
        bgGradient="linear(to-r, blue.600, cyan.500)"
        color="white"
        px={{ base: 3, md: 4 }}
        py={2.5}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.300"
        pt={{ base: 'calc(0.5rem + env(safe-area-inset-top, 0px))', md: 2.5 }}
      >
        <HStack align="center" spacing={2}>
          <IconButton
            aria-label="Back to news"
            icon={<FiArrowLeft size={18} />}
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.300' }}
            onClick={onClose}
            flexShrink={0}
            size="sm"
          />
          <Box flex={1} minW={0}>
            {category && (
              <Text fontSize="2xs" fontWeight="bold" opacity={0.9} noOfLines={1}>
                {category.icon} {category.label}
              </Text>
            )}
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="bold" lineHeight="snug" noOfLines={2}>
              {article.title}
            </Text>
          </Box>
          <HStack spacing={1} flexShrink={0}>
            {hasSummary && viewMode === 'iframe' && (
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                onClick={switchToSummary}
              >
                Summary
              </Button>
            )}
            {viewMode === 'summary' && (
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                onClick={() => { setViewMode('iframe'); resetLoadState(); }}
              >
                Web view
              </Button>
            )}
            <Button
              as={Link}
              href={article.url}
              isExternal
              size="xs"
              leftIcon={<FaExternalLinkAlt />}
              bg="whiteAlpha.250"
              color="white"
              _hover={{ bg: 'whiteAlpha.400', textDecoration: 'none' }}
            >
              Browser
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Box flex={1} minH={0} position="relative" bg="white" display="flex" flexDirection="column">
        {viewMode === 'summary' ? (
          <Box flex={1} overflowY="auto" px={{ base: 4, md: 6 }} py={5}>
            {loadSlow && (
              <Alert status="info" mb={4} borderRadius="lg" fontSize="sm">
                <AlertDescription>
                  This site cannot load inside the app. Here is the story summary instead.
                </AlertDescription>
              </Alert>
            )}
            <VStack align="stretch" spacing={4} maxW="720px" mx="auto">
              {summaryParagraphs.map((para) => (
                <Text key={para.slice(0, 48)} fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall">
                  {para}
                </Text>
              ))}
              {article.keyPoints && article.keyPoints.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase">
                    Key points
                  </Text>
                  <List spacing={2} pl={4} styleType="disc">
                    {article.keyPoints.map((point) => (
                      <ListItem key={point} fontSize="sm" color="gray.700">
                        {point}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              {article.funFact && (
                <Box p={3} bg="amber.50" borderRadius="lg" borderWidth="1px" borderColor="amber.100">
                  <Text fontSize="2xs" fontWeight="bold" color="amber.700" mb={1}>
                    Did you know?
                  </Text>
                  <Text fontSize="sm" color="amber.900">
                    {article.funFact}
                  </Text>
                </Box>
              )}
              <Button
                as={Link}
                href={article.url}
                isExternal
                size="sm"
                colorScheme="blue"
                alignSelf="flex-start"
                leftIcon={<FaExternalLinkAlt />}
              >
                Read on {article.source.name}
              </Button>
            </VStack>
          </Box>
        ) : (
          <>
            {loadSlow && hasSummary && (
              <Alert status="warning" flexShrink={0} py={2} fontSize="sm">
                <AlertDescription>
                  Still loading?{' '}
                  <Button variant="link" colorScheme="blue" size="sm" onClick={switchToSummary}>
                    Read in-app summary
                  </Button>
                  {' or '}
                  <Link href={article.url} isExternal color="blue.600" fontWeight="semibold">
                    open in browser
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <Box flex={1} position="relative" minH={0}>
              {iframeLoading && (
                <VStack
                  position="absolute"
                  inset={0}
                  zIndex={1}
                  justify="center"
                  spacing={3}
                  bg="gray.50"
                >
                  <Spinner size="lg" color="blue.500" thickness="3px" />
                  <Text fontSize="sm" color="gray.600">
                    Loading article…
                  </Text>
                  {hasSummary && (
                    <Button size="sm" variant="outline" colorScheme="blue" onClick={switchToSummary}>
                      Read summary instead
                    </Button>
                  )}
                </VStack>
              )}
              <iframe
                src={article.url}
                title={article.title}
                width="100%"
                height="100%"
                style={{ border: 'none', display: 'block' }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={handleIframeLoad}
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
