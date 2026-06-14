/**
 * Full-screen in-app browser — loads the article URL inside the app (iframe).
 */
import { useEffect, useState, useCallback } from 'react';
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
  VStack,
} from '@/shared/design-system';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';

const LOAD_TIMEOUT_MS = 15000;

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  onClose: () => void;
}

export default function EducationNewsInAppBrowser({ article, category, onClose }: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadSlow, setLoadSlow] = useState(false);

  const resetLoadState = useCallback(() => {
    setIframeLoading(true);
    setLoadSlow(false);
  }, []);

  useEffect(() => {
    resetLoadState();
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
    if (!iframeLoading) return undefined;
    const timer = window.setTimeout(() => setLoadSlow(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [iframeLoading, article.url]);

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
        py={3}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.300"
        pt={{ base: 'calc(0.75rem + env(safe-area-inset-top, 0px))', md: 3 }}
      >
        <HStack align="flex-start" spacing={2}>
          <IconButton
            aria-label="Back to news"
            icon={<FiArrowLeft size={18} />}
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.300' }}
            onClick={onClose}
            flexShrink={0}
            mt={0.5}
          />
          <Box flex={1} minW={0}>
            {category && (
              <Text fontSize="2xs" fontWeight="bold" opacity={0.9} mb={1}>
                {category.icon} {category.label}
              </Text>
            )}
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="bold" lineHeight="snug" noOfLines={2}>
              {article.title}
            </Text>
            <Text fontSize="xs" color="blue.50" mt={1}>
              {article.source.name}
            </Text>
          </Box>
        </HStack>
        <HStack mt={3} spacing={2} flexWrap="wrap" pl={10}>
          <Button
            as={Link}
            href={article.url}
            isExternal
            size="sm"
            leftIcon={<FaExternalLinkAlt />}
            bg="whiteAlpha.250"
            color="white"
            _hover={{ bg: 'whiteAlpha.400', textDecoration: 'none' }}
          >
            Open in browser
          </Button>
        </HStack>
      </Box>

      <Box flex={1} minH={0} position="relative" bg="white" display="flex" flexDirection="column">
        {loadSlow && (
          <Alert status="warning" flexShrink={0} py={2} fontSize="sm">
            <AlertDescription>
              Still loading or blocked in-app?{' '}
              <Link href={article.url} isExternal color="blue.600" fontWeight="semibold">
                Open in your browser
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
            </VStack>
          )}
          <iframe
            src={article.url}
            title={article.title}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={handleIframeLoad}
          />
        </Box>
      </Box>
    </Box>
  );
}
