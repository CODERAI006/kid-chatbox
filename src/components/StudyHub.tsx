/**
 * StudyHub - Unified page merging AI Study Mode, Study Library, and Study History
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
  Badge,
} from '@/shared/design-system';
import { StudyMode } from './StudyMode';
import { StudyLibrary } from './StudyLibrary';
import { StudyHistory } from './StudyHistory';
import { authApi } from '@/services/api';

const TAB_KEYS = ['ai-study', 'library', 'history'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const tabFromHash = (hash: string): number => {
  const key = hash.replace('#', '') as TabKey;
  const idx = TAB_KEYS.indexOf(key);
  return idx >= 0 ? idx : 0;
};

export const StudyHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(() => tabFromHash(location.hash));
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  useEffect(() => {
    setTabIndex(tabFromHash(location.hash));
  }, [location.hash]);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const { user } = authApi.getCurrentUser();
        if (user && (user as { id: string }).id) {
          const { studyApi } = await import('@/services/api');
          const res = await studyApi.getStudyHistory((user as { id: string }).id);
          if (res.success && res.sessions) setHistoryCount(res.sessions.length);
        }
      } catch {
        // silently ignore
      }
    };
    loadCount();
  }, []);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    navigate(`/study#${TAB_KEYS[index]}`, { replace: true });
  };

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Page header */}
      <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={6} py={4}>
        <HStack spacing={3} align="center">
          <Text fontSize="2xl">📚</Text>
          <Box>
            <Heading size="md" color="blue.700">
              Study Hub
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Generate lessons, browse materials, and review your history — all in one place
            </Text>
          </Box>
        </HStack>
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
            <Tab
              fontWeight="semibold"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              🤖 AI Study Mode
            </Tab>
            <Tab
              fontWeight="semibold"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              📖 Study Library
            </Tab>
            <Tab
              fontWeight="semibold"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              🕑 Study History
              {historyCount !== null && historyCount > 0 && (
                <Badge ml={2} colorScheme="blue" borderRadius="full">
                  {historyCount}
                </Badge>
              )}
            </Tab>
          </TabList>
        </Box>

        <TabPanels>
          {/* AI Study Mode */}
          <TabPanel p={0}>
            <StudyMode />
          </TabPanel>

          {/* Study Library */}
          <TabPanel p={0}>
            <StudyLibrary />
          </TabPanel>

          {/* Study History */}
          <TabPanel p={0}>
            <StudyHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
