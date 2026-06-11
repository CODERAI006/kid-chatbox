/**
 * Modal to create a new exam prep schedule from My Schedules page.
 */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@/shared/design-system';
import { StudyPlanOnboarding } from './StudyPlanOnboarding';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function StudyPlanGeneratorModal({ isOpen, onClose, onCreated }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={3}>
        <ModalHeader fontSize="md">Generate study schedule</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <StudyPlanOnboarding
            onBack={onClose}
            onPlanCreated={() => {
              onCreated();
              onClose();
            }}
            skipChatLesson
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
