/**

 * Conversational Learning Workspace — chat is one component among cards.

 */



import { useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';

import {

  Box,

  Button,

  Flex,

  HStack,

  IconButton,

  Text,

  Input,

  VStack,

  Spinner,

  useColorModeValue,

  Badge,

  Divider,

  SimpleGrid,

} from '@/shared/design-system';

import { getErrorMessage, learningBotApi, type LearningBotUiMessage } from '@/services/api';

import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';

import { resolveWorkspace } from '@/utils/learningWorkspaceParser';

import {

  QUICK_ACTION_PROMPTS,

  type LearningQuickAction,

} from '@/types/learningWorkspace';



const WELCOME_TOPIC = 'Ask me anything';

const QUICK_ACTIONS: Array<{ key: LearningQuickAction; emoji: string; label: string; hint: string }> = [

  { key: 'learn', emoji: '📖', label: 'Learn', hint: 'Quick explanation' },

  { key: 'visualize', emoji: '🖼', label: 'Visualize', hint: 'Diagram / sketch' },

  { key: 'watch', emoji: '🎥', label: 'Watch', hint: 'Video & audio' },

  { key: 'quiz', emoji: '🎮', label: 'Quiz', hint: 'Quick challenge' },

  { key: 'flashcards', emoji: '⚡', label: 'Flashcards', hint: '20+ cards' },

];



export const LearningChatWidget: FC = () => {

  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState<LearningBotUiMessage[]>([]);

  const [conversationId, setConversationId] = useState<string | null>(null);

  const [draft, setDraft] = useState('');

  const [pending, setPending] = useState(false);

  const [bootLoading, setBootLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastModel, setLastModel] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);



  const panelBg = useColorModeValue('white', 'gray.800');

  const panelBorder = useColorModeValue('gray.200', 'gray.600');

  const userBubble = useColorModeValue('blue.50', 'blue.900');

  const workspaceBg = useColorModeValue('gray.50', 'gray.900');



  const currentTopic = useMemo(() => {

    for (let i = messages.length - 1; i >= 0; i -= 1) {

      const m = messages[i];

      if (m.role === 'assistant') {

        const ws = resolveWorkspace(m.content);

        if (ws.topic && ws.topic !== 'Learning') return ws.topic;

      }

    }

    return WELCOME_TOPIC;

  }, [messages]);



  useEffect(() => {

    if (!open) return;

    let cancelled = false;

    setBootLoading(true);

    setError(null);

    learningBotApi

      .getConversation()

      .then((data) => {

        if (cancelled) return;

        setConversationId(data.conversationId);

        setMessages(Array.isArray(data.messages) ? data.messages : []);

      })

      .catch((e) => {

        if (!cancelled) setError(getErrorMessage(e));

      })

      .finally(() => {

        if (!cancelled) setBootLoading(false);

      });

    return () => {

      cancelled = true;

    };

  }, [open]);



  useEffect(() => {

    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [messages, open, pending, bootLoading]);



  const sendText = useCallback(

    async (text: string) => {

      const trimmed = text.trim();

      if (!trimmed || pending || bootLoading) return;



      setError(null);

      setDraft('');

      setPending(true);



      try {

        const { conversationId: cid, content, model } = await learningBotApi.sendMessage({

          conversationId,

          text: trimmed,

        });

        setConversationId(cid);

        if (model) setLastModel(model);

        setMessages((prev) => [

          ...prev,

          { role: 'user', content: trimmed },

          { role: 'assistant', content },

        ]);

      } catch (e) {

        const msg = getErrorMessage(e);

        setError(msg);

        console.error('[LearningChatWidget] send failed', { message: msg });

        setDraft(trimmed);

      } finally {

        setPending(false);

      }

    },

    [pending, bootLoading, conversationId]

  );



  const send = useCallback(() => void sendText(draft), [draft, sendText]);



  const onKeyDown = (ev: KeyboardEvent) => {

    if (ev.key === 'Enter' && !ev.shiftKey) {

      ev.preventDefault();

      void send();

    }

  };



  const newChat = async () => {

    try {

      setError(null);

      await learningBotApi.resetConversation();

      setConversationId(null);

      setMessages([]);

      setLastModel(null);

    } catch (e) {

      setError(getErrorMessage(e));

    }

  };



  const showWelcome = messages.length === 0 && !bootLoading;



  return (

    <>

      {!open && (

        <IconButton

          aria-label="Open AI study assistant"

          icon={<Text fontSize="xl">🎓</Text>}

          position="fixed"

          bottom={{ base: 5, md: 8 }}

          right={{ base: 5, md: 8 }}

          zIndex={1500}

          size="lg"

          rounded="full"

          colorScheme="blue"

          boxShadow="lg"

          onClick={() => setOpen(true)}

        />

      )}



      {open && (

        <Box

          position="fixed"

          bottom={{ base: 4, md: 6 }}

          right={{ base: 4, md: 6 }}

          zIndex={1500}

          w={{ base: 'calc(100vw - 2rem)', sm: '400px', md: '440px' }}

          maxW="100vw"

          h={{ base: 'min(78vh, 580px)', md: '580px' }}

          bg={panelBg}

          borderWidth="1px"

          borderColor={panelBorder}

          borderRadius="xl"

          boxShadow="2xl"

          display="flex"

          flexDirection="column"

          overflow="hidden"

        >

          <Flex px={3} py={2} align="center" justify="space-between" borderBottomWidth="1px" borderColor={panelBorder} bg="blue.600" color="white">

            <Box>

              <Text fontWeight="bold" fontSize="sm">🎓 AI Study Assistant</Text>

              <Text fontSize="xs" opacity={0.9}>Topic: {currentTopic}</Text>

            </Box>

            <HStack spacing={1}>

              {lastModel && (

                <Badge fontSize="0.6rem" colorScheme="purple" display={{ base: 'none', sm: 'inline-flex' }}>

                  {lastModel}

                </Badge>

              )}

              <Button size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} onClick={() => void newChat()}>

                New topic

              </Button>

              <IconButton

                aria-label="Close assistant"

                size="sm"

                variant="ghost"

                color="white"

                _hover={{ bg: 'whiteAlpha.200' }}

                icon={<Text>✕</Text>}

                onClick={() => setOpen(false)}

              />

            </HStack>

          </Flex>



          <VStack align="stretch" flex={1} spacing={0} overflow="hidden">

            <Box flex={1} overflowY="auto" px={2} py={2} bg={workspaceBg}>

              {bootLoading ? (

                <HStack py={6} justify="center">

                  <Spinner size="sm" />

                  <Text fontSize="sm" color="gray.500">Loading workspace…</Text>

                </HStack>

              ) : (

                <VStack align="stretch" spacing={3}>

                  {showWelcome && (

                    <Box px={1}>

                      <Text fontSize="sm" color="gray.600" mb={2}>

                        Pick a mode or ask anything below. Every answer arrives as learning cards—not plain chat bubbles.

                      </Text>

                      <SimpleGrid columns={2} spacing={2}>

                        {QUICK_ACTIONS.map((action) => (

                          <Button

                            key={action.key}

                            h="auto"

                            py={3}

                            px={2}

                            flexDirection="column"

                            whiteSpace="normal"

                            variant="outline"

                            bg="white"

                            onClick={() => void sendText(QUICK_ACTION_PROMPTS[action.key])}

                            isDisabled={pending}

                          >

                            <Text fontSize="lg">{action.emoji}</Text>

                            <Text fontSize="sm" fontWeight="bold">{action.label}</Text>

                            <Text fontSize="xs" color="gray.500">{action.hint}</Text>

                          </Button>

                        ))}

                      </SimpleGrid>

                    </Box>

                  )}



                  {messages.map((m, i) =>

                    m.role === 'user' ? (

                      <Box

                        key={m.id || `u-${i}`}

                        alignSelf="flex-end"

                        maxW="88%"

                        px={3}

                        py={2}

                        borderRadius="lg"

                        bg={userBubble}

                      >

                        <Text fontSize="sm" whiteSpace="pre-wrap">{m.content}</Text>

                      </Box>

                    ) : (

                      <Box key={m.id || `a-${i}`} w="100%">

                        <LearningWorkspaceMessage

                          content={m.content}

                          onAskPrompt={(prompt) => void sendText(prompt)}

                        />

                      </Box>

                    )

                  )}



                  {pending && (

                    <HStack py={2} spacing={2} justify="center">

                      <Spinner size="sm" />

                      <Text fontSize="sm" color="gray.500">Building your learning cards…</Text>

                    </HStack>

                  )}

                  <div ref={endRef} />

                </VStack>

              )}



              {error && (

                <Text fontSize="xs" color="red.500" px={1} py={1}>{error}</Text>

              )}

            </Box>



            <Divider />



            <HStack align="center" spacing={2} px={2} py={2}>

              <Input

                value={draft}

                onChange={(e) => setDraft(e.target.value)}

                onKeyDown={onKeyDown}

                placeholder="Ask anything…"

                size="sm"

                isDisabled={pending || bootLoading}

              />

              <Button

                colorScheme="blue"

                size="sm"

                onClick={() => void send()}

                isDisabled={pending || bootLoading || !draft.trim()}

              >

                Send

              </Button>

            </HStack>

          </VStack>

        </Box>

      )}

    </>

  );

};

