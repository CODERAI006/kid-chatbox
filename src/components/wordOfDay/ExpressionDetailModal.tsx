import { useEffect } from 'react';
import {
  Badge,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  VStack,
} from '@/shared/design-system';
import type { ExpressionDetail } from './expressionUtils';
import { formatEditionDate } from './expressionUtils';

interface Props {
  expression: ExpressionDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

function DetailBlock({
  icon,
  title,
  body,
  accent,
}: {
  icon: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      p={{ base: 4, md: 5 }}
    >
      <Text fontSize="sm" fontWeight="bold" color={`${accent}.700`} mb={2}>
        {icon} {title}
      </Text>
      <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall">
        {body}
      </Text>
    </Box>
  );
}

export function ExpressionDetailModal({ expression, isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!expression) return null;

  const isSchool = expression.context === 'school';
  const usageTip = isSchool
    ? 'Use this in class discussions, group projects, presentations, or when talking to teachers and classmates.'
    : 'Use this when chatting with friends and family, or in everyday situations outside school.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="none" scrollBehavior="inside" blockScrollOnMount>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent m={0} borderRadius={0} maxH="100dvh" bg="gray.50" overflow="hidden">
        <Box
          bgGradient="linear(to-br, teal.400, teal.500, cyan.500)"
          color="white"
          px={{ base: 4, md: 8 }}
          pt={{ base: 5, md: 6 }}
          pb={{ base: 6, md: 8 }}
          position="relative"
        >
          <ModalCloseButton color="white" top={3} right={3} _hover={{ bg: 'whiteAlpha.300' }} size="lg" />
          <VStack align="stretch" spacing={3} pr={10}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Text fontSize={{ base: '3xl', md: '4xl' }} aria-hidden>
                💬
              </Text>
              <Badge
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wide"
                px={3}
                py={1}
                borderRadius="full"
                bg="whiteAlpha.300"
                color="white"
              >
                {isSchool ? 'School' : 'Daily life'}
              </Badge>
            </Box>
            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" lineHeight="snug">
              {expression.phrase}
            </Text>
            {expression.editionDate && (
              <Text fontSize="sm" color="teal.50">
                Saved on {formatEditionDate(expression.editionDate)}
              </Text>
            )}
          </VStack>
        </Box>

        <ModalBody px={{ base: 4, md: 8 }} py={{ base: 5, md: 6 }} flex="1" overflowY="auto">
          <VStack align="stretch" spacing={4} maxW="720px" mx="auto" pb={6}>
            <Box
              bg="white"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="teal.100"
              boxShadow="md"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="xs" fontWeight="bold" color="teal.600" mb={2} textTransform="uppercase">
                What it means
              </Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.800" lineHeight="tall" fontWeight="medium">
                {expression.meaning}
              </Text>
            </Box>

            <DetailBlock
              icon="📝"
              title="Example in a sentence"
              body={`"${expression.example}"`}
              accent="blue"
            />

            <DetailBlock icon="🗣️" title="When to use it" body={usageTip} accent="purple" />

            <Button size="lg" colorScheme="teal" borderRadius="xl" onClick={onClose} w="100%" boxShadow="md">
              Got it!
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
