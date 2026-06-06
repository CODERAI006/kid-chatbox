/**
 * Schedule Test Modal — single quiz scheduling with presets and plain-language fields.
 */

import React, { useState } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  ModalCloseButton, Button, VStack, HStack, FormControl, FormLabel, Input,
  Textarea, Select, Text, Alert, AlertIcon, AlertDescription, Box, Badge,
} from '@/shared/design-system';
import { Quiz } from '@/services/admin';
import {
  applySchedulePreset, SCHEDULE_PRESET_OPTIONS, validateScheduleForm, withVisibleFrom,
  type ScheduleFormData,
} from './scheduleTestUtils';
import { ScheduleAudienceFields } from './ScheduleAudienceFields';

interface ScheduleTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  quizzes: Quiz[];
  plans: Array<{ id: string; name: string }>;
  formData: ScheduleFormData;
  setFormData: (data: ScheduleFormData) => void;
  isEditing: boolean;
  loading: boolean;
}

export const ScheduleTestModal: React.FC<ScheduleTestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  quizzes,
  plans,
  formData,
  setFormData,
  isEditing,
  loading,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const availableQuizzes = quizzes.filter((q) => {
    if (!q.isActive) return false;
    if (isEditing && formData.quizId === q.id) return true;
    return true;
  });

  const selectedQuiz = quizzes.find((q) => q.id === formData.quizId);

  const handleSubmit = async () => {
    const err = validateScheduleForm(formData, isEditing);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    await onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEditing ? 'Edit Scheduled Test' : 'Schedule a Test'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md" py={2}>
              <AlertIcon />
              <AlertDescription fontSize="sm">
                Students see the test only between the open and close times, for the plans you select below.
              </AlertDescription>
            </Alert>

            {!isEditing && (
              <FormControl isRequired>
                <FormLabel>Quiz</FormLabel>
                <Select
                  value={formData.quizId}
                  onChange={(e) => setFormData({ ...formData, quizId: e.target.value })}
                  placeholder={availableQuizzes.length === 0 ? 'No active quizzes' : 'Choose a quiz'}
                >
                  {availableQuizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.name}
                      {quiz.gradeLevel ? ` · ${quiz.gradeLevel}` : ''}
                      {quiz.difficulty ? ` · ${quiz.difficulty}` : ''}
                    </option>
                  ))}
                </Select>
                {selectedQuiz && (
                  <HStack mt={2} spacing={2} flexWrap="wrap">
                    {selectedQuiz.inLibrary && <Badge colorScheme="teal">In library</Badge>}
                    {selectedQuiz.timeLimit && <Badge>{selectedQuiz.timeLimit} min quiz</Badge>}
                  </HStack>
                )}
              </FormControl>
            )}

            {isEditing && selectedQuiz && (
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontWeight="semibold">{selectedQuiz.name}</Text>
                <Text fontSize="sm" color="gray.500">Quiz cannot be changed when editing.</Text>
              </Box>
            )}

            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>Quick presets</Text>
              <HStack spacing={2} flexWrap="wrap">
                {SCHEDULE_PRESET_OPTIONS.map(({ key, label }) => (
                  <Button
                    key={key}
                    size="xs"
                    variant="outline"
                    onClick={() => setFormData(applySchedulePreset(key, formData))}
                  >
                    {label}
                  </Button>
                ))}
              </HStack>
            </Box>

            <FormControl isRequired>
              <FormLabel>Students can start</FormLabel>
              <Input
                type="datetime-local"
                value={formData.visibleFrom}
                onChange={(e) => setFormData(withVisibleFrom(formData, e.target.value))}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Official scheduled date</FormLabel>
              <Input
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Used for sorting and admin reports. Usually matches the start time above.
              </Text>
            </FormControl>

            <HStack align="start">
              <FormControl>
                <FormLabel>Access closes</FormLabel>
                <Input
                  type="datetime-local"
                  value={formData.visibleUntil}
                  onChange={(e) => setFormData({ ...formData, visibleUntil: e.target.value })}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>Optional — leave blank for no end date</Text>
              </FormControl>
              <FormControl>
                <FormLabel>Time limit (minutes)</FormLabel>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  placeholder="60"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>Per attempt, optional</Text>
              </FormControl>
            </HStack>

            <ScheduleAudienceFields
              plans={plans}
              planIds={formData.planIds}
              onPlanIdsChange={(planIds) => setFormData({ ...formData, planIds })}
            />

            <FormControl>
              <FormLabel>Instructions for students</FormLabel>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Optional — e.g. Complete in one sitting, no notes allowed"
              />
            </FormControl>

            {localError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription fontSize="sm">{localError}</AlertDescription>
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save changes' : 'Schedule test'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
