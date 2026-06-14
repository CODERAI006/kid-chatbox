/**
 * In-app browser modal — loads the article URL inside the app (iframe).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  AlertDescription,
  Box,
  Button,
  HStack,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from '@/shared/design-system';
import { FaExternalLinkAlt } from 'react-icons/fa';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';

const LOAD_TIMEOUT_MS = 15000;

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  isOpen: boolean;
  onClose: () => void;
}

export default function EducationNewsBrowserModal({ article, category, isOpen, onClose }: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadSlow, setLoadSlow] = useState(false);

  const resetLoadState = useCallback(() => {
    setIframeLoading(true);
    setLoadSlow(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    resetLoadState();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose, article.url, resetLoadState]);

  useEffect(() => {
    if (!isOpen || !iframeLoading) return undefined;
    const timer = window.setTimeout(() => setLoadSlow(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen, iframeLoading, article.url]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setLoadSlow(false);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="none" blockScrollOnMount>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        m={0}
        borderRadius={0}
        maxH="100dvh"
        h="100dvh"
        bg="gray.50"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <Box
          flexShrink={0}
          bgGradient="linear(to-r, blue.600, cyan.500)"
          color="white"
          px={{ base: 3, md: 4 }}
          py={3}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.300"
          position="relative"
        >
          <Box pr={10}>
            {category && (
              <Text fontSize="2xs" fontWeight="bold" opacity={0.9} mb={1}>
                {category.icon} {category.label}
              </Text>
            )}
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="bold" lineHeight="snug" noOfLines={2}>
              {article.title}
            </Text>
            <Text fontSize="xs" color="blue.50" mt={1}>{article.source.name}</Text>
          </Box>
          <ModalCloseButton
            position="absolute"
            top={2}
            right={2}
            color="white"
            _hover={{ bg: 'whiteAlpha.300' }}
          />
          <HStack mt={3} spacing={2} flexWrap="wrap">
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
            <Button size="sm" variant="outline" color="white" borderColor="whiteAlpha.500" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </Box>

        <ModalBody flex={1} p={0} minH={0} position="relative" bg="white" display="flex" flexDirection="column">
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
                <Text fontSize="sm" color="gray.600">Loading article…</Text>
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
