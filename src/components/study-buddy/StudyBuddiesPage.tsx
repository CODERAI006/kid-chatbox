/**
 * Study Buddies — accept requests, manage accepted list, share quizzes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
  useToast,
} from '@/shared/design-system';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';
import { BuddySharePanel } from '@/components/study-buddy/BuddySharePanel';
import { getErrorMessage, quizLibraryApi, studyBuddyApi } from '@/services/api';
import type { AcceptedStudyBuddy, QuizLibraryListItem, StudyBuddyDashboard } from '@/types';

function connectionLabel(via?: AcceptedStudyBuddy['connectedVia']) {
  if (via === 'you_sent') return 'You sent the request';
  if (via === 'they_sent') return 'They sent the request';
  return 'Accepted buddy';
}

export const StudyBuddiesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const shareRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudyBuddyDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buddyLookup, setBuddyLookup] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [shareBuddyIds, setShareBuddyIds] = useState<string[]>([]);
  const [shareMessage, setShareMessage] = useState('');
  const [quizOptions, setQuizOptions] = useState<QuizLibraryListItem[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const dashboard = await studyBuddyApi.getDashboard();
      setData(dashboard);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    quizLibraryApi
      .getQuizzes({ limit: 50 })
      .then((res) => setQuizOptions((res.quizzes || []) as QuizLibraryListItem[]))
      .catch(() => setQuizOptions([]));
  }, [load]);

  const focusShareForBuddy = (buddyId: string) => {
    setShareBuddyIds((prev) => (prev.includes(buddyId) ? prev : [...prev, buddyId]));
    shareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleShareBuddy = (buddyId: string, checked: boolean) => {
    setShareBuddyIds((prev) =>
      checked ? (prev.includes(buddyId) ? prev : [...prev, buddyId]) : prev.filter((id) => id !== buddyId)
    );
  };

  const selectAllShareBuddies = (checked: boolean) => {
    const ids = (data?.buddies ?? []).map((b) => b.buddyId);
    setShareBuddyIds(checked ? ids : []);
  };

  const copyBuddyId = async () => {
    if (!data?.myBuddyId) return;
    await navigator.clipboard.writeText(data.myBuddyId);
    toast({ title: 'Buddy ID copied!', status: 'success', duration: 2000 });
  };

  const sendRequest = async () => {
    if (!buddyLookup.trim()) return;
    setBusy(true);
    try {
      const res = await studyBuddyApi.sendRequest(buddyLookup, requestMessage || undefined);
      toast({ title: res.message, status: 'success' });
      setBuddyLookup('');
      setRequestMessage('');
      await load();
    } catch (e) {
      toast({ title: getErrorMessage(e), status: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const respond = async (id: string, action: 'accept' | 'reject' | 'cancel', buddyId?: string) => {
    setBusy(true);
    try {
      const res = await studyBuddyApi.respondToRequest(id, action);
      toast({ title: res.message, status: 'success' });
      try {
        await load();
      } catch (refreshError) {
        console.error('Study buddies refresh failed after respond:', refreshError);
        toast({
          title: 'Request updated — refresh the page if the list looks stale.',
          status: 'warning',
          duration: 5000,
        });
      }
      if (action === 'accept' && buddyId) {
        focusShareForBuddy(buddyId);
        toast({
          title: 'Buddy added! You can share a quiz below.',
          status: 'info',
          duration: 4000,
        });
      }
    } catch (e) {
      toast({ title: getErrorMessage(e), status: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const shareQuiz = async () => {
    if (!shareBuddyIds.length || !selectedQuizId) return;
    setBusy(true);
    try {
      const res = await studyBuddyApi.shareQuiz(shareBuddyIds, selectedQuizId, shareMessage || undefined);
      toast({ title: res.message, status: 'success' });
      setShareMessage('');
    } catch (e) {
      toast({ title: getErrorMessage(e), status: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const startSharedQuiz = async (shareId: string) => {
    setBusy(true);
    try {
      const { quizId } = await studyBuddyApi.startSharedQuiz(shareId);
      navigate(`/quiz/attempt/${quizId}`);
    } catch (e) {
      toast({ title: getErrorMessage(e), status: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box py={12} textAlign="center">
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  const buddies = data?.buddies ?? [];

  return (
    <StudentPageLayout
      icon="👫"
      title="Study Buddies"
      subtitle="Accept buddy requests, see your accepted friends, and share quizzes"
    >
      <VStack spacing={5} align="stretch">
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <Card>
          <CardBody>
            <Text fontWeight="bold" mb={2}>Your Buddy ID</Text>
            <HStack>
              <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                {data?.myBuddyId || '—'}
              </Badge>
              <Button size="sm" onClick={copyBuddyId} isDisabled={!data?.myBuddyId}>
                Copy
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {(data?.incomingRequests.length ?? 0) > 0 && (
          <Card borderColor="green.200" borderWidth="2px">
            <CardBody>
              <Text fontWeight="bold" mb={1}>Requests for you — accept to add to your list</Text>
              <Text fontSize="sm" color="gray.600" mb={3}>
                When you accept, they appear in Accepted study buddies and you can share quizzes.
              </Text>
              <VStack align="stretch" spacing={3}>
                {data?.incomingRequests.map((req) => (
                  <Box key={req.id} p={3} borderWidth="1px" borderRadius="md" bg="green.50">
                    <Text fontWeight="medium">{req.from?.name} ({req.from?.buddyId})</Text>
                    {req.message && <Text fontSize="sm" mt={1}>{req.message}</Text>}
                    <HStack mt={3} flexWrap="wrap">
                      <Button
                        size="sm"
                        colorScheme="green"
                        onClick={() => respond(req.id, 'accept', req.from?.buddyId)}
                        isLoading={busy}
                      >
                        Accept buddy
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respond(req.id, 'reject')} isLoading={busy}>
                        Decline
                      </Button>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        {(data?.outgoingRequests.length ?? 0) > 0 && (
          <Card>
            <CardBody>
              <Text fontWeight="bold" mb={3}>Requests you sent (waiting)</Text>
              <VStack align="stretch" spacing={3}>
                {data?.outgoingRequests.map((req) => (
                  <HStack key={req.id} justify="space-between" p={3} borderWidth="1px" borderRadius="md">
                    <Box>
                      <Text fontWeight="medium">{req.to?.name} ({req.to?.buddyId})</Text>
                      <Text fontSize="sm" color="gray.600">Waiting for them to accept</Text>
                    </Box>
                    <Button size="sm" variant="outline" onClick={() => respond(req.id, 'cancel')} isLoading={busy}>
                      Cancel
                    </Button>
                  </HStack>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <Text fontWeight="bold" mb={1}>Accepted study buddies</Text>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Friends you accepted or who accepted your request — share quizzes with anyone here.
            </Text>
            {buddies.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                No accepted buddies yet. Send a request or accept someone who invited you.
              </Text>
            ) : (
              <VStack align="stretch" spacing={2}>
                {buddies.map((b) => (
                  <HStack key={b.id} justify="space-between" p={3} borderWidth="1px" borderRadius="md" flexWrap="wrap" gap={2}>
                    <Box>
                      <HStack>
                        <Text fontWeight="medium">{b.name}</Text>
                        <Badge colorScheme="green" fontSize="xs">Accepted</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">{b.buddyId}</Text>
                      <Text fontSize="xs" color="gray.500">{connectionLabel(b.connectedVia)}</Text>
                    </Box>
                    <Button size="sm" colorScheme="purple" onClick={() => focusShareForBuddy(b.buddyId)}>
                      Share a quiz
                    </Button>
                  </HStack>
                ))}
              </VStack>
            )}
          </CardBody>
        </Card>

        <Card ref={shareRef}>
          <CardBody>
            <Text fontWeight="bold" mb={3}>Share a quiz with buddies</Text>
            <BuddySharePanel
              buddies={buddies}
              quizOptions={quizOptions}
              shareBuddyIds={shareBuddyIds}
              selectedQuizId={selectedQuizId}
              shareMessage={shareMessage}
              busy={busy}
              onBuddyToggle={toggleShareBuddy}
              onSelectAllBuddies={selectAllShareBuddies}
              onQuizChange={setSelectedQuizId}
              onMessageChange={setShareMessage}
              onShare={shareQuiz}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Text fontWeight="bold" mb={3}>Send a new buddy request</Text>
            <VStack align="stretch" spacing={3}>
              <FormControl>
                <FormLabel>Friend&apos;s Buddy ID</FormLabel>
                <Input value={buddyLookup} onChange={(e) => setBuddyLookup(e.target.value)} placeholder="e.g. john472" />
              </FormControl>
              <FormControl>
                <FormLabel>Message (optional)</FormLabel>
                <Textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} rows={2} />
              </FormControl>
              <Button colorScheme="blue" onClick={sendRequest} isLoading={busy}>
                Send request
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {(data?.receivedQuizShares.length ?? 0) > 0 && (
          <Card>
            <CardBody>
              <Text fontWeight="bold" mb={3}>Quizzes shared with you</Text>
              <VStack align="stretch" spacing={3}>
                {data?.receivedQuizShares.map((share) => (
                  <Box key={share.id} p={3} borderWidth="1px" borderRadius="md">
                    <Text fontWeight="medium">{share.quiz.title}</Text>
                    <Text fontSize="sm" color="gray.600">
                      From {share.from.name} · {share.quiz.subject} · {share.quiz.questionCount} questions
                    </Text>
                    {share.message && <Text fontSize="sm" mt={1}>{share.message}</Text>}
                    <Button size="sm" mt={3} colorScheme="blue" onClick={() => startSharedQuiz(share.id)} isLoading={busy}>
                      Start quiz
                    </Button>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </StudentPageLayout>
  );
};
