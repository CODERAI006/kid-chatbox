/**
 * Global feedback modal — opened from sidebar, quiz results, or custom event.
 */

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Box,
  Text,
} from '@/shared/design-system';
import { LearningFeedbackForm } from './LearningFeedbackForm';
import { FEEDBACK_OPEN_EVENT } from './feedbackEvents';
import type { FeedbackContext } from '@/types/feedback';

type OpenDetail = Partial<FeedbackContext>;

export const AppFeedbackModal: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [context, setContext] = useState<FeedbackContext>({ source: 'global' });

  const handleOpen = useCallback((event: Event) => {
    const detail = (event as CustomEvent<OpenDetail>).detail ?? {};
    setContext({
      source: detail.source ?? 'global',
      quizSubject: detail.quizSubject,
      quizScore: detail.quizScore,
      quizTotal: detail.quizTotal,
    });
    onOpen();
  }, [onOpen]);

  useEffect(() => {
    window.addEventListener(FEEDBACK_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(FEEDBACK_OPEN_EVENT, handleOpen);
  }, [handleOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" mx={4}>
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="4px"
          bgGradient="linear(to-r, purple.400, pink.400, blue.400)"
        />
        <ModalHeader pt={6}>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Text fontSize="lg" fontWeight="bold">
              💡 Share your ideas
            </Text>
            <Text fontSize="sm" fontWeight="normal" color="gray.600">
              Tell us what would make learning more fun and effective
            </Text>
          </motion.div>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <LearningFeedbackForm context={context} onClose={onClose} />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
