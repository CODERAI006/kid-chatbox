/**
 * StudyHub - Unified page merging AI Study Mode, Study Library, and Study History
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
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@/shared/design-system';
import { StudyMode } from './StudyMode';
import { StudyLibrary } from './StudyLibrary';
import { StudyHistory } from './StudyHistory';
import { StudentPageHeader } from '@/components/layout/StudentPageHeader';
import { authApi } from '@/services/api';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { getUserId, isAppAdmin } from '@/utils/userAccess';

const TAB_KEYS = ['ai-study', 'library', 'history'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function buildStudyTabKeys(showAiStudy: boolean): TabKey[] {
  const keys: TabKey[] = [];
  if (showAiStudy) keys.push('ai-study');
  keys.push('library', 'history');
  return keys;
}

export const StudyHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = authApi.getCurrentUser();
  const userRecord = user as Record<string, unknown> | null;
  const isAdmin = isAppAdmin(userRecord);
  const { showAiStudy: planAllowsAiStudy } = usePlanAiFlags(getUserId(userRecord));
  const showAiStudyTab = planAllowsAiStudy || isAdmin;

  const tabKeysVisible = useMemo(
    () => buildStudyTabKeys(showAiStudyTab),
    [showAiStudyTab]
  );

  const [tabIndex, setTabIndex] = useState(() => {
    const raw = (location.hash || '').replace('#', '') as TabKey;
    const idx = buildStudyTabKeys(true).indexOf(raw);
    return idx >= 0 ? idx : 0;
  });
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  useEffect(() => {
    const raw = (location.hash || '').replace('#', '') as TabKey;
    const idx = tabKeysVisible.indexOf(raw);
    setTabIndex(idx >= 0 ? idx : 0);
  }, [location.hash, tabKeysVisible]);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const { user: currentUser } = authApi.getCurrentUser();
        if (currentUser && (currentUser as { id: string }).id) {
          const { studyApi } = await import('@/services/api');
          const res = await studyApi.getStudyHistory((currentUser as { id: string }).id);
          if (res.success && res.sessions) setHistoryCount(res.sessions.length);
        }
      } catch {
        /* ignore */
      }
    };
    loadCount();
  }, []);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    const key = tabKeysVisible[index];
    if (key) navigate(`/study#${key}`, { replace: true });
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <StudentPageHeader
        icon="📚"
        title="Study Hub"
        subtitle="Generate lessons, browse materials, and review your history — all in one place"
      />

      <Tabs index={tabIndex} onChange={handleTabChange} isLazy colorScheme="blue" variant="enclosed">
        <Box bg="white" borderBottomWidth="1px" borderColor="gray.200" px={{ base: 1, md: 6 }} overflowX="auto">
          <TabList border="none" flexWrap={{ base: 'nowrap', md: 'wrap' }} minW="min-content">
            {showAiStudyTab && (
              <Tab
                fontWeight="semibold"
                fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
                px={{ base: 2, md: 4 }}
                whiteSpace="nowrap"
                _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
              >
                🤖 AI Study
                {isAdmin && !planAllowsAiStudy && (
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
              📖 Library
            </Tab>
            <Tab
              fontWeight="semibold"
              fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }}
              px={{ base: 2, md: 4 }}
              whiteSpace="nowrap"
              _selected={{ color: 'blue.600', borderBottomColor: 'blue.500' }}
            >
              🕑 History
              {historyCount !== null && historyCount > 0 && (
                <Badge ml={1} colorScheme="blue" borderRadius="full" fontSize="2xs">
                  {historyCount}
                </Badge>
              )}
            </Tab>
          </TabList>
        </Box>

        <TabPanels>
          {showAiStudyTab && (
            <TabPanel p={0}>
              {isAdmin && !planAllowsAiStudy && (
                <Alert status="info" borderRadius={0}>
                  <AlertIcon />
                  <AlertDescription fontSize="sm">
                    Your admin account always sees this tab. Students on plans with &quot;Hide AI Study Mode&quot; will not.
                  </AlertDescription>
                </Alert>
              )}
              <StudyMode />
            </TabPanel>
          )}
          <TabPanel p={0}><StudyLibrary /></TabPanel>
          <TabPanel p={0}><StudyHistory /></TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};
