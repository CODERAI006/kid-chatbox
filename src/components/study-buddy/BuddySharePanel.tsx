/**
 * Share a quiz with one or more accepted study buddies.
 */

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Text,
  VStack,
} from '@/shared/design-system';
import type { AcceptedStudyBuddy, QuizLibraryListItem } from '@/types';

interface BuddySharePanelProps {
  buddies: AcceptedStudyBuddy[];
  quizOptions: QuizLibraryListItem[];
  shareBuddyIds: string[];
  selectedQuizId: string;
  shareMessage: string;
  busy: boolean;
  onBuddyToggle: (buddyId: string, checked: boolean) => void;
  onSelectAllBuddies: (checked: boolean) => void;
  onQuizChange: (quizId: string) => void;
  onMessageChange: (message: string) => void;
  onShare: () => void;
}

export const BuddySharePanel: React.FC<BuddySharePanelProps> = ({
  buddies,
  quizOptions,
  shareBuddyIds,
  selectedQuizId,
  shareMessage,
  busy,
  onBuddyToggle,
  onSelectAllBuddies,
  onQuizChange,
  onMessageChange,
  onShare,
}) => {
  const allSelected = buddies.length > 0 && shareBuddyIds.length === buddies.length;

  return (
    <VStack align="stretch" spacing={3}>
      <FormControl isRequired>
        <HStack justify="space-between" mb={1}>
          <FormLabel mb={0}>Share with buddies</FormLabel>
          {buddies.length > 1 && (
            <Button
              size="xs"
              variant="link"
              onClick={() => onSelectAllBuddies(!allSelected)}
              isDisabled={!buddies.length}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </Button>
          )}
        </HStack>
        {!buddies.length ? (
          <Text fontSize="sm" color="gray.500">
            Accept a buddy request first to share quizzes.
          </Text>
        ) : (
          <VStack align="stretch" spacing={2} p={3} borderWidth="1px" borderRadius="md">
            {buddies.map((b) => (
              <Checkbox
                key={b.id}
                isChecked={shareBuddyIds.includes(b.buddyId)}
                onChange={(e) => onBuddyToggle(b.buddyId, e.target.checked)}
              >
                {b.name} ({b.buddyId})
              </Checkbox>
            ))}
          </VStack>
        )}
        {shareBuddyIds.length > 0 && (
          <Text fontSize="xs" color="gray.500" mt={1}>
            {shareBuddyIds.length} buddy{shareBuddyIds.length === 1 ? '' : 'ies'} selected
          </Text>
        )}
      </FormControl>
      <FormControl isRequired>
        <FormLabel>Quiz from library</FormLabel>
        <Select
          placeholder="Choose a quiz"
          value={selectedQuizId}
          onChange={(e) => onQuizChange(e.target.value)}
        >
          {quizOptions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title} ({q.subject})
            </option>
          ))}
        </Select>
      </FormControl>
      <FormControl>
        <FormLabel>Note (optional)</FormLabel>
        <Input
          value={shareMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Try this one!"
        />
      </FormControl>
      <Box>
        <Button
          colorScheme="purple"
          onClick={onShare}
          isLoading={busy}
          isDisabled={!shareBuddyIds.length || !selectedQuizId || !buddies.length}
        >
          {shareBuddyIds.length > 1
            ? `Share quiz with ${shareBuddyIds.length} buddies`
            : 'Share quiz'}
        </Button>
      </Box>
    </VStack>
  );
};
