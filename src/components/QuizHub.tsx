/**
 * QuizHub - Unified page merging AI Quiz Mode, Scheduled Tests, and Quiz History
 * Includes visibility control for AI Quiz Mode (show/hide with optional date range)
 */

import { useEffect, useState } from 'react';
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
import { authApi, quizApi, scheduledTestsApi } from '@/services/api';

const TAB_KEYS = ['ai-quiz', 'scheduled', 'library', 'history'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const STORAGE_KEY = 'quiz_hub_ai_visibility';

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

const tabFromHash = (hash: string): number => {
  const key = hash.replace('#', '') as TabKey;
  const idx = TAB_KEYS.indexOf(key);
  return idx >= 0 ? idx : 0;
};

export const QuizHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(() => tabFromHash(location.hash));
  const [historyCount, setHistoryCount] = useState<number | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  // AI quiz visibility controls
  const [visibility, setVisibility] = useState<AIVisibilitySettings>(loadVisibility);
  const [showSettings, setShowSettings] = useState(false);
  const aiVisible = isAIQuizVisible(visibility);

  // Check if current user is admin
  const { user } = authApi.getCurrentUser();
  const isAdmin = (user as Record<string, unknown>)?.role === 'admin' ||
    (user as Record<string, unknown>)?.is_admin === true;

  useEffect(() => {
    setTabIndex(tabFromHash(location.hash));
  }, [location.hash]);

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
    navigate(`/quiz#${TAB_KEYS[index]}`, { replace: true });
  };

  const updateVisibility = (patch: Partial<AIVisibilitySettings>) => {
    const next = { ...visibility, ...patch };
    setVisibility(next);
    saveVisibility(next);
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Page header */}
      <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={6} py={4}>
        <HStack spacing={3} align="center" justify="space-between">
          <HStack spacing={3}>
            <Text fontSize="2xl">🎯</Text>
            <Box>
              <Heading size="md" color="blue.700">
                Quiz Hub
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Take AI quizzes, join scheduled tests, and review your results — all in one place
              </Text>
            </Box>
          </HStack>

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
                  <Badge colorScheme={aiVisible ? 'green' : 'orange'} fontSize="xs">
                    {aiVisible ? 'Visible to students' : 'Hidden from students'}
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

      {/* Tabs */}
      <Tabs
        index={tabIndex}
        onChange={handleTabChange}
        isLazy
        colorScheme="blue"
        variant="enclosed"
      >
        <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={6}>
          <TabList border="none">
            {/* AI Quiz tab — always visible to admin, conditionally to students */}
            {(isAdmin || aiVisible) && (
              <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}>
                🤖 AI Quiz Mode
                {isAdmin && !aiVisible && (
                  <Badge ml={2} colorScheme="orange" fontSize="xs">Hidden</Badge>
                )}
              </Tab>
            )}
            <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}>
              📅 Scheduled Tests
              {liveCount !== null && liveCount > 0 && (
                <Badge ml={2} colorScheme="green" borderRadius="full">
                  {liveCount} Live
                </Badge>
              )}
            </Tab>
            <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}>
              📚 Quiz Library
            </Tab>
            <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}>
              📋 Quiz History
              {historyCount !== null && historyCount > 0 && (
                <Badge ml={2} colorScheme="blue" borderRadius="full">
                  {historyCount}
                </Badge>
              )}
            </Tab>
          </TabList>
        </Box>

        <TabPanels>
          {/* AI Quiz Mode — shown to admin always; to students only when visible */}
          {(isAdmin || aiVisible) && (
            <TabPanel p={0}>
              {isAdmin && !aiVisible && (
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
          <TabPanel p={4}>
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
