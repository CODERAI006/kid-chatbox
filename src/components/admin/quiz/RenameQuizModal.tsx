/**
 * Quick rename dialog for quiz titles.
 */

import { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
} from '@/shared/design-system';

interface RenameQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onSave: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export const RenameQuizModal: React.FC<RenameQuizModalProps> = ({
  isOpen,
  onClose,
  initialName,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (isOpen) setName(initialName);
  }, [isOpen, initialName]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName.trim()) {
      onClose();
      return;
    }
    await onSave(trimmed);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Rename Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isRequired>
            <FormLabel>Quiz title</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter quiz title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
            />
          </FormControl>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => void handleSubmit()}
            isLoading={isLoading}
            isDisabled={!name.trim()}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
