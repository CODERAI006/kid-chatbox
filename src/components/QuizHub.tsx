/**
 * QuizHub - Unified page merging AI Quiz Mode, Scheduled Tests, and Quiz History
 * Includes visibility control for AI Quiz Mode (show/hide with optional date range)
 */

import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  Collapse,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Input,
  Tooltip,
} from '@/shared/design-system';
import { QuizTutor } from './QuizTutor';
import { QuizTutorErrorBoundary } from './QuizTutorErrorBoundary';
import { ScheduledTests } from './ScheduledTests';
import { QuizHistory } from './QuizHistory';
import { QuizLibraryTab } from './QuizLibraryTab';
import { TodaysQuizzes } from './TodaysQuizzes';
import { authApi, quizApi, scheduledTestsApi } from '@/services/api';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { getUserId, isAppAdmin } from '@/utils/userAccess';

const TAB_KEYS = ['ai-quiz', 'scheduled', 'library', 'history'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const STORAGE_KEY = 'quiz_hub_ai_visibility';

/** Tab keys in visual order; AI tab is omitted when hidden from non-admins. */
function buildQuizHubTabKeys(showAiTab: boolean): TabKey[] {
  const keys: TabKey[] = [];
  if (showAiTab) keys.push('ai-quiz');
  keys.push('scheduled', 'library', 'history');
  return keys;
}

interface AIVisibilitySettings {
  enabled: boolean;
  useSchedule: boolean;
  showFrom: string;
  showUntil: string;
}

const defaultVisibility: AIVisibilitySettings = {
  enabled: true,
  useSchedule: false,
  showFrom: '',
  showUntil: '',
};

const loadVisibility = (): AIVisibilitySettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultVisibility, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultVisibility;
};

const saveVisibility = (settings: AIVisibilitySettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

/** Compute whether AI quiz mode is currently visible based on settings */
const isAIQuizVisible = (settings: AIVisibilitySettings): boolean => {
  if (!settings.enabled) return false;
  if (!settings.useSchedule) return true;
  const now = new Date();
  const from = settings.showFrom ? new Date(settings.showFrom) : null;
  const until = settings.showUntil ? new Date(settings.showUntil) : null;
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
};

export const QuizHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current user is admin
  const { user } = authApi.getCurrentUser();
  const userRecord = user as Record<string, unknown> | null;
  const isAdmin = isAppAdmin(userRecord);

  const { showAiQuiz: planAllowsAiQuiz } = usePlanAiFlags(getUserId(userRecord));

  // AI quiz visibility controls
  const [visibility, setVisibility] = useState<AIVisibilitySettings>(loadVisibility);
  const [showSettings, setShowSettings] = useState(false);
  const aiGloballyVisible = isAIQuizVisible(visibility);
  const aiVisibleForUser = isAdmin || (aiGloballyVisible && planAllowsAiQuiz);

  const tabKeysVisible = useMemo(
    () => buildQuizHubTabKeys(aiVisibleForUser),
    [aiVisibleForUser]
  );

  const [tabIndex, setTabIndex] = useState(() => {
    const vis = loadVisibility();
    const { user: u } = authApi.getCurrentUser();
    const admin = isAppAdmin(u as Record<string, unknown> | null);
    const keys = buildQuizHubTabKeys(Boolean(admin) || isAIQuizVisible(vis));
    const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const idx = keys.indexOf(raw as TabKey);
    return idx >= 0 ? idx : 0;
  });
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    const raw = (location.hash || '').replace(/^#/, '') as TabKey;
    const idx = tabKeysVisible.indexOf(raw);
    setTabIndex(idx >= 0 ? idx : 0);
  }, [location.hash, tabKeysVisible]);

  // Load badge counts for tabs
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const { user } = authApi.getCurrentUser();
        if (user && (user as { id: string }).id) {
          const res = await quizApi.getQuizHistory((user as { id: string }).id);
          if (res.success && res.results) setHistoryCount(res.results.length);
        }
      } catch { /* ignore */ }

      try {
        const data = await scheduledTestsApi.getMyScheduledTests();
        if (data?.scheduledTests) {
          const now = new Date();
          const live = data.scheduledTests.filter((t: Record<string, unknown>) => {
            const status = t.status as string;
            const visibleFrom = new Date((t.visible_from || t.visibleFrom) as string);
            const visibleUntil = t.visible_until ? new Date(t.visible_until as string) : null;
            return (
              status === 'active' &&
              visibleFrom <= now &&
              (!visibleUntil || visibleUntil >= now)
            );
          });
          setLiveCount(live.length);
        }
      } catch { /* ignore */ }
    };
    loadCounts();
  }, []);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    const key = tabKeysVisible[index];
    if (key) navigate(`/quiz#${key}`, { replace: true });
  };

  const updateVisibility = (patch: Partial<AIVisibilitySettings>) => {
    const next = { ...visibility, ...patch };
    setVisibility(next);
    saveVisibility(next);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Page header */}
      <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={{ base: 3, md: 6 }} py={{ base: 3, md: 4 }}>
        <HStack spacing={{ base: 2, md: 3 }} align="flex-start" justify="space-between" flexWrap="wrap" rowGap={2} w="100%">
          <HStack spacing={{ base: 2, md: 3 }} flex={1} minW={0}>
            <Text fontSize={{ base: 'xl', md: '2xl' }} flexShrink={0}>🎯</Text>
            <Box minW={0}>
              <Heading size={{ base: 'sm', md: 'md' }} color="blue.700">
                Quiz Hub
              </Heading>
              <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="gray.500" noOfLines={2}>
                AI quizzes, scheduled tests, and your results
              </Text>
            </Box>
          </HStack>

          <HStack spacing={2} flexShrink={0} flexWrap="wrap">
            {/* Admin: AI mode visibility control */}
            {isAdmin && (
              <Tooltip label="Control when AI Quiz Mode is visible to students">
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  leftIcon={<Text>⚙️</Text>}
                  onClick={() => setShowSettings((s) => !s)}
                >
                  AI Mode Visibility
                </Button>
              </Tooltip>
            )}
          </HStack>
        </HStack>

        {/* Visibility settings panel (admin only) */}
        {isAdmin && (
          <Collapse in={showSettings} animateOpacity>
            <Box
              mt={4}
              p={4}
              bg="purple.50"
              border="1px"
              borderColor="purple.200"
              borderRadius="md"
            >
              <Heading size="xs" color="purple.700" mb={3}>
                🔮 AI Quiz Mode — Visibility Settings
              </Heading>
              <VStack spacing={3} align="stretch">
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0} fontWeight="semibold" color="gray.700">
                    Show AI Quiz Mode tab
                  </FormLabel>
                  <Switch
                    colorScheme="purple"
                    isChecked={visibility.enabled}
                    onChange={(e) => updateVisibility({ enabled: e.target.checked })}
                  />
                  <Badge
                    ml={3}
                    colorScheme={visibility.enabled ? 'green' : 'red'}
                    borderRadius="full"
                  >
                    {visibility.enabled ? 'Enabled' : 'Hidden'}
                  </Badge>
                </FormControl>

                {visibility.enabled && (
                  <FormControl display="flex" alignItems="center">
                    <FormLabel mb={0} color="gray.700">
                      Use date/time schedule
                    </FormLabel>
                    <Switch
                      colorScheme="blue"
                      isChecked={visibility.useSchedule}
                      onChange={(e) => updateVisibility({ useSchedule: e.target.checked })}
                    />
                  </FormControl>
                )}

                {visibility.enabled && visibility.useSchedule && (
                  <HStack spacing={4} flexWrap="wrap">
                    <FormControl flex={1} minW="200px">
                      <FormLabel fontSize="sm" color="gray.600">
                        Show From
                      </FormLabel>
                      <Input
                        type="datetime-local"
                        size="sm"
                        value={visibility.showFrom}
                        onChange={(e) => updateVisibility({ showFrom: e.target.value })}
                      />
                    </FormControl>
                    <FormControl flex={1} minW="200px">
                      <FormLabel fontSize="sm" color="gray.600">
                        Show Until
                      </FormLabel>
                      <Input
                        type="datetime-local"
                        size="sm"
                        value={visibility.showUntil}
                        onChange={(e) => updateVisibility({ showUntil: e.target.value })}
                      />
                    </FormControl>
                  </HStack>
                )}

                <Text fontSize="xs" color="gray.500">
                  Current status:{' '}
                  <Badge colorScheme={aiGloballyVisible ? 'green' : 'orange'} fontSize="xs">
                    {aiGloballyVisible ? 'Visible to students' : 'Hidden from students'}
                  </Badge>
                  {visibility.useSchedule && visibility.showFrom && (
                    <> · from {new Date(visibility.showFrom).toLocaleString()}</>
                  )}
                  {visibility.useSchedule && visibility.showUntil && (
                    <> · until {new Date(visibility.showUntil).toLocaleString()}</>
                  )}
                </Text>
              </VStack>
            </Box>
          </Collapse>
        )}
      </Box>

      <Box px={{ base: 2, md: 6 }} pt={{ base: 2, md: 4 }}>
        <TodaysQuizzes />
      </Box>

      {/* Tabs */}
      <Tabs
        index={tabIndex}
        onChange={handleTabChange}
        isLazy
        colorScheme="blue"
        variant="enclosed"
      >
        <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={{ base: 1, md: 6 }} overflowX="auto">
          <TabList border="none" flexWrap={{ base: 'nowrap', md: 'wrap' }} minW="min-content">
            {(isAdmin || aiVisibleForUser) && (
              <Tab
                fontWeight="semibold"
                fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
                px={{ base: 2, md: 4 }}
                whiteSpace="nowrap"
                _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
              >
                🤖 AI Quiz
                {isAdmin && !aiGloballyVisible && (
                  <Badge ml={1} colorScheme="orange" fontSize="2xs">Hidden</Badge>
                )}
              </Tab>
            )}
            <Tab
              fontWeight="semibold"
              fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
              px={{ base: 2, md: 4 }}
              whiteSpace="nowrap"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              📅 Scheduled
              {liveCount !== null && liveCount > 0 && (
                <Badge ml={1} colorScheme="green" borderRadius="full" fontSize="2xs">
                  {liveCount}
                </Badge>
              )}
            </Tab>
            <Tab
              fontWeight="semibold"
              fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
              px={{ base: 2, md: 4 }}
              whiteSpace="nowrap"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              📚 Library
            </Tab>
            <Tab
              fontWeight="semibold"
              fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
              px={{ base: 2, md: 4 }}
              whiteSpace="nowrap"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              📋 History
              {historyCount !== null && historyCount > 0 && (
                <Badge ml={1} colorScheme="blue" borderRadius="full" fontSize="2xs">
                  {historyCount}
                </Badge>
              )}
            </Tab>
          </TabList>
        </Box>

        <TabPanels>
          {/* AI Quiz Mode — shown to admin always; to students only when visible */}
          {(isAdmin || aiVisibleForUser) && (
            <TabPanel p={0}>
              {isAdmin && !aiGloballyVisible && (
                <Alert status="warning" borderRadius={0}>
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    AI Quiz Mode is currently <strong>hidden from students</strong>. Only admins can see this tab.
                    {visibility.useSchedule && visibility.showFrom && (
                      <> It will become visible on {new Date(visibility.showFrom).toLocaleString()}.</>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              <QuizTutorErrorBoundary>
                <QuizTutor />
              </QuizTutorErrorBoundary>
            </TabPanel>
          )}

          {/* Scheduled Tests */}
          <TabPanel p={{ base: 2, md: 4 }}>
            <ScheduledTests />
          </TabPanel>

          {/* Quiz Library — on-demand quizzes published by admin */}
          <TabPanel p={0}>
            <QuizLibraryTab />
          </TabPanel>

          {/* Quiz History */}
          <TabPanel p={0}>
            <QuizHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
