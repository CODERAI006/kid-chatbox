/**
 * Editable mandatory profile fields for Google / incomplete onboarding users.
 */

import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  Radio,
  RadioGroup,
  Stack,
} from '@/shared/design-system';
import { GRADES } from '@/constants/auth';
import { LANGUAGES } from '@/constants/quiz';
import { Language } from '@/types/quiz';
import { RegistrationAgePreview } from '@/components/auth/RegistrationAgePreview';
import { REGISTER_CONSTANTS } from '@/constants/auth';

export interface MandatoryProfileFormValues {
  birthDate: string;
  grade: string;
  preferredLanguage: Language;
}

interface ProfileMandatoryFieldsProps {
  values: MandatoryProfileFormValues;
  onChange: (values: MandatoryProfileFormValues) => void;
  missingBirthDate: boolean;
  missingGrade: boolean;
  missingLanguage: boolean;
}

export const ProfileMandatoryFields: React.FC<ProfileMandatoryFieldsProps> = ({
  values,
  onChange,
  missingBirthDate,
  missingGrade,
  missingLanguage,
}) => {
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  return (
    <VStack spacing={4} align="stretch">
      {missingBirthDate && (
        <FormControl isRequired>
          <FormLabel>{REGISTER_CONSTANTS.BIRTH_DATE_LABEL}</FormLabel>
          <Input
            type="date"
            value={values.birthDate}
            onChange={(e) => onChange({ ...values, birthDate: e.target.value })}
            max={maxBirthDate}
            size="lg"
            required
          />
          <Text fontSize="xs" color="gray.500" marginTop={1}>
            {REGISTER_CONSTANTS.BIRTH_DATE_HINT}
          </Text>
          <RegistrationAgePreview birthDate={values.birthDate} />
        </FormControl>
      )}

      {missingGrade && (
        <FormControl isRequired>
          <FormLabel>{REGISTER_CONSTANTS.GRADE_LABEL}</FormLabel>
          <Select
            value={values.grade}
            onChange={(e) => onChange({ ...values, grade: e.target.value })}
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
      )}

      {missingLanguage && (
        <FormControl isRequired>
          <FormLabel>Preferred Language</FormLabel>
          <RadioGroup
            value={values.preferredLanguage}
            onChange={(value) =>
              onChange({ ...values, preferredLanguage: value as Language })
            }
          >
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
      )}

      {!missingBirthDate && !missingGrade && !missingLanguage && (
        <Box>
          <Text fontSize="sm" color="gray.600">
            All required details are set. Save any optional changes below.
          </Text>
        </Box>
      )}
    </VStack>
  );
};
