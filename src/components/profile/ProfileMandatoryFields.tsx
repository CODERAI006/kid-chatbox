/**
 * Profile field blocks — editable when missing, read-only when already set.
 */

import {
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  Radio,
  RadioGroup,
  Stack,
} from '@/shared/design-system';
import { GRADES, REGISTER_CONSTANTS } from '@/constants/auth';
import { LANGUAGES } from '@/constants/quiz';
import { Language } from '@/types/quiz';
import { RegistrationAgePreview } from '@/components/auth/RegistrationAgePreview';

export interface MandatoryProfileFormValues {
  birthDate: string;
  grade: string;
  preferredLanguage: Language;
}

interface EditableBirthDateProps {
  value: string;
  onChange: (birthDate: string) => void;
}

export const EditableBirthDateField: React.FC<EditableBirthDateProps> = ({ value, onChange }) => {
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  return (
    <FormControl isRequired>
      <FormLabel>{REGISTER_CONSTANTS.BIRTH_DATE_LABEL}</FormLabel>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={maxBirthDate}
        size="lg"
        required
      />
      <Text fontSize="xs" color="gray.500" marginTop={1}>
        {REGISTER_CONSTANTS.BIRTH_DATE_HINT}
      </Text>
      <RegistrationAgePreview birthDate={value} />
    </FormControl>
  );
};

interface ReadOnlyBirthDateProps {
  label?: string;
  displayValue: string;
}

export const ReadOnlyBirthDateField: React.FC<ReadOnlyBirthDateProps> = ({
  label = 'Date of birth',
  displayValue,
}) => (
  <FormControl>
    <FormLabel>{label}</FormLabel>
    <Input type="text" value={displayValue} isDisabled bg="gray.100" size="lg" />
  </FormControl>
);

interface EditableGradeProps {
  value: string;
  onChange: (grade: string) => void;
}

export const EditableGradeField: React.FC<EditableGradeProps> = ({ value, onChange }) => (
  <FormControl isRequired>
    <FormLabel>{REGISTER_CONSTANTS.GRADE_LABEL}</FormLabel>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={REGISTER_CONSTANTS.GRADE_PLACEHOLDER}
      size="lg"
      required
    >
      {GRADES.map((grade) => (
        <option key={grade} value={grade}>
          {grade}
        </option>
      ))}
    </Select>
  </FormControl>
);

interface ReadOnlyGradeProps {
  grade: string;
}

export const ReadOnlyGradeField: React.FC<ReadOnlyGradeProps> = ({ grade }) => (
  <FormControl>
    <FormLabel>{REGISTER_CONSTANTS.GRADE_LABEL}</FormLabel>
    <Input type="text" value={grade} isDisabled bg="gray.100" size="lg" />
  </FormControl>
);

interface ReadOnlyAgeProps {
  age: number | null;
  hasBirthDate: boolean;
}

export const ReadOnlyAgeField: React.FC<ReadOnlyAgeProps> = ({ age, hasBirthDate }) => (
  <FormControl>
    <FormLabel>Age</FormLabel>
    <Input
      type="text"
      value={age != null ? String(age) : 'Not set'}
      isDisabled
      bg="gray.100"
      size="lg"
    />
    {hasBirthDate && (
      <Text fontSize="xs" color="gray.500" marginTop={1}>
        Calculated from your date of birth
      </Text>
    )}
  </FormControl>
);

interface EditableLanguageProps {
  value: Language;
  onChange: (language: Language) => void;
}

export const EditableLanguageField: React.FC<EditableLanguageProps> = ({ value, onChange }) => (
  <FormControl isRequired>
    <FormLabel>Preferred Language</FormLabel>
    <RadioGroup value={value} onChange={(next) => onChange(next as Language)}>
      <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
        {Object.values(LANGUAGES).map((lang) => (
          <Radio key={lang} value={lang} size="md">
            {lang}
          </Radio>
        ))}
      </Stack>
    </RadioGroup>
    <Text fontSize="xs" color="gray.500" marginTop={1}>
      Used for quizzes and lessons
    </Text>
  </FormControl>
);

interface EditableLanguageSelectProps {
  value: Language;
  onChange: (language: Language) => void;
}

export const EditableLanguageSelectField: React.FC<EditableLanguageSelectProps> = ({
  value,
  onChange,
}) => (
  <FormControl isRequired>
    <FormLabel>Preferred Language</FormLabel>
    <Select value={value} onChange={(e) => onChange(e.target.value as Language)} size="lg" required>
      {Object.values(LANGUAGES).map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </Select>
    <Text fontSize="xs" color="gray.500" marginTop={1}>
      This language will be used for all quizzes and lessons
    </Text>
  </FormControl>
);

export function getMissingFieldLabels(flags: {
  missingBirthDate: boolean;
  missingGrade: boolean;
  missingLanguage: boolean;
}): string[] {
  const labels: string[] = [];
  if (flags.missingBirthDate) labels.push('date of birth');
  if (flags.missingGrade) labels.push('grade');
  if (flags.missingLanguage) labels.push('preferred language');
  return labels;
}
