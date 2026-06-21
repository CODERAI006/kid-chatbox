/**
 * Admin: edit privacy policy, PII disclaimer, and other site pages (markdown rich content).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Spinner,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
  useToast,
  Badge,
} from '@/shared/design-system';
import { AiRichContentView } from '@/components/learning/AiRichContentView';
import { sitePagesApi, type SitePage } from '@/services/sitePages';
import { getErrorMessage } from '@/services/api';

export function SitePagesManagement() {
  const toast = useToast();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('privacy-policy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const list = await sitePagesApi.listAdminPages();
      setPages(list);
      if (list.length > 0 && !list.some((p) => p.slug === selectedSlug)) {
        setSelectedSlug(list[0].slug);
      }
    } catch (err) {
      toast({
        title: 'Failed to load site pages',
        description: getErrorMessage(err),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedSlug, toast]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    const page = pages.find((p) => p.slug === selectedSlug);
    if (page) {
      setTitle(page.title);
      setBody(page.body);
      setMetaDescription(page.metaDescription || '');
      setIsPublished(page.isPublished);
    }
  }, [pages, selectedSlug]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await sitePagesApi.updatePage(selectedSlug, {
        title,
        body,
        metaDescription,
        isPublished,
      });
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
      toast({
        title: 'Page saved',
        description: `"${updated.title}" is now live${isPublished ? '' : ' (draft — hidden from public)'}.`,
        status: 'success',
        duration: 4000,
      });
    } catch (err) {
      toast({
        title: 'Save failed',
        description: getErrorMessage(err),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading site pages…</Text>
      </VStack>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      <Box>
        <Heading size="md" mb={1}>
          Legal & Site Pages
        </Heading>
        <Text fontSize="sm" color="gray.600">
          Edit privacy policy and PII disclaimer content. Use markdown: headings (##), **bold**,
          lists, and callouts (&gt; quote).
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Data is stored securely. Changes appear on public pages immediately when published.
      </Alert>

      <HStack spacing={2} flexWrap="wrap">
        {pages.map((page) => (
          <Button
            key={page.slug}
            size="sm"
            variant={selectedSlug === page.slug ? 'solid' : 'outline'}
            colorScheme={selectedSlug === page.slug ? 'blue' : 'gray'}
            onClick={() => setSelectedSlug(page.slug)}
          >
            {page.title}
            {!page.isPublished && (
              <Badge ml={2} colorScheme="orange" fontSize="2xs">
                Draft
              </Badge>
            )}
          </Button>
        ))}
      </HStack>

      <FormControl>
        <FormLabel>Page title</FormLabel>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>Meta description (SEO)</FormLabel>
        <Input
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Short summary for search engines"
        />
      </FormControl>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb={0}>Published (visible to public)</FormLabel>
        <Switch isChecked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} ml={3} />
      </FormControl>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Edit</Tab>
          <Tab>Preview</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <FormControl>
              <FormLabel>Content (markdown)</FormLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                minH="420px"
                fontFamily="mono"
                fontSize="sm"
              />
              <FormHelperText>
                Supports headings, bold, lists, tables, and blockquotes — same format as AI tutor
                responses.
              </FormHelperText>
            </FormControl>
          </TabPanel>
          <TabPanel px={0}>
            <Box
              borderWidth="1px"
              borderRadius="md"
              p={6}
              bg="white"
              minH="420px"
              overflowY="auto"
            >
              <AiRichContentView content={body || '_No content yet._'} />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <HStack>
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
          Save changes
        </Button>
        {selectedSlug === 'privacy-policy' && (
          <Button as="a" href="/privacy" target="_blank" rel="noopener noreferrer" variant="outline">
            View live page
          </Button>
        )}
        {selectedSlug === 'pii-disclaimer' && (
          <Button as="a" href="/disclaimer" target="_blank" rel="noopener noreferrer" variant="outline">
            View live page
          </Button>
        )}
      </HStack>
    </VStack>
  );
}
