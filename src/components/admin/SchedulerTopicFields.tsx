/**
 * Topic / subtopic multi-select for quiz scheduler jobs.
 */

import { useEffect, useState } from 'react';
import {
  FormControl, FormLabel, Checkbox, CheckboxGroup, Stack, Text, Spinner, Box,
} from '@/shared/design-system';
import { adminApi, Topic, Subtopic } from '@/services/admin';

interface Props {
  topicIds: string[];
  subtopicIds: string[];
  onChange: (topicIds: string[], subtopicIds: string[]) => void;
}

export const SchedulerTopicFields: React.FC<Props> = ({
  topicIds,
  subtopicIds,
  onChange,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getTopics({ isActive: true }).then((res) => {
      setTopics(res.topics || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!topicIds.length) {
      setSubtopics([]);
      return;
    }
    Promise.all(topicIds.map((id) => adminApi.getTopic(id)))
      .then((results) => {
        const all = results.flatMap((r) => r.subtopics || []) as Array<Subtopic & { topic_id?: string; is_active?: boolean }>;
        setSubtopics(
          all.filter((s) => (s.isActive ?? s.is_active) !== false) as Subtopic[]
        );
      })
      .catch(() => setSubtopics([]));
  }, [topicIds]);

  const onTopicsChange = (nextTopics: string[]) => {
    onChange(
      nextTopics,
      subtopicIds.filter((sid) => {
        const st = subtopics.find((s) => s.id === sid) as Subtopic & { topic_id?: string };
        const tid = st?.topicId || st?.topic_id;
        return tid && nextTopics.includes(tid);
      })
    );
  };

  const toggleSubtopic = (id: string) => {
    const next = subtopicIds.includes(id)
      ? subtopicIds.filter((s) => s !== id)
      : [...subtopicIds, id];
    onChange(topicIds, next);
  };

  if (loading) return <Spinner size="sm" />;

  return (
    <Box>
      <FormControl isRequired>
        <FormLabel>Topics</FormLabel>
        <CheckboxGroup
          value={topicIds}
          onChange={(v) => onTopicsChange((v as (string | number)[]).map(String))}
        >
          <Stack spacing={1} maxH="120px" overflowY="auto">
            {topics.map((t) => (
              <Checkbox key={t.id} value={t.id}>{t.title}</Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </FormControl>

      {topicIds.length > 0 && (
        <FormControl mt={4}>
          <FormLabel>Subtopics (optional — empty = all subtopics under selected topics)</FormLabel>
          <Stack spacing={1} maxH="160px" overflowY="auto">
            {subtopics.map((s) => (
              <Checkbox
                key={s.id}
                isChecked={subtopicIds.includes(s.id)}
                onChange={() => toggleSubtopic(s.id)}
              >
                {s.title}
              </Checkbox>
            ))}
          </Stack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Leave none selected to include every active subtopic under the chosen topics.
          </Text>
        </FormControl>
      )}
    </Box>
  );
};
