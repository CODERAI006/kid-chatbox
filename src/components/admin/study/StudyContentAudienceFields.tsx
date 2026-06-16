/**
 * Grade, subject, and general-audience fields for study library uploads.
 */

import {
  FormControl,
  FormLabel,
  HStack,
  Select,
  Text,
} from '@/shared/design-system';
import { GRADES } from '@/constants/auth';
import { SUBJECTS } from '@/constants/quiz';

export type StudyContentAudience = {
  subject: string;
  grade: string;
  isGeneral: boolean;
};

type Props = {
  value: StudyContentAudience;
  onChange: (patch: Partial<StudyContentAudience>) => void;
};

export const StudyContentAudienceFields: React.FC<Props> = ({ value, onChange }) => (
  <>
    <FormControl>
      <HStack>
        <input
          type="checkbox"
          checked={value.isGeneral}
          onChange={(e) => onChange({ isGeneral: e.target.checked })}
          id="study-content-general"
        />
        <FormLabel mb={0} htmlFor="study-content-general">
          General content (visible to all students)
        </FormLabel>
      </HStack>
      <Text fontSize="xs" color="gray.500" mt={1}>
        When checked, grade and subject are optional. Otherwise, set grade and/or subject to target
        specific students.
      </Text>
    </FormControl>

    <HStack spacing={4} align="flex-start" flexWrap="wrap">
      <FormControl flex="1" minW="200px" isDisabled={value.isGeneral}>
        <FormLabel>Subject</FormLabel>
        <Select
          placeholder="All subjects / General"
          value={value.subject}
          onChange={(e) => onChange({ subject: e.target.value })}
        >
          {Object.values(SUBJECTS).map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl flex="1" minW="200px" isDisabled={value.isGeneral}>
        <FormLabel>Grade</FormLabel>
        <Select
          placeholder="All grades"
          value={value.grade}
          onChange={(e) => onChange({ grade: e.target.value })}
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </FormControl>
    </HStack>
  </>
);

/** Must match multer limit in server/routes/study-library-content.js */
export const STUDY_LIBRARY_MAX_FILE_BYTES = 50 * 1024 * 1024;

export const STUDY_CONTENT_FILE_ACCEPT: Record<string, string> = {
  pdf: '.pdf',
  ppt: '.ppt,.pptx',
  text: '.txt',
  image: '.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.ico,.tif,.tiff,.heic,.avif',
  doc: '.doc,.docx,.odt,.rtf',
};

export const STUDY_CONTENT_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Image' },
  { value: 'doc', label: 'Word Document' },
  { value: 'ppt', label: 'PowerPoint' },
  { value: 'text', label: 'Text' },
] as const;

export type StudyContentType = (typeof STUDY_CONTENT_TYPES)[number]['value'];
