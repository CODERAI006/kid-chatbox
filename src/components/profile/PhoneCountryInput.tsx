/**
 * Country selector + local mobile input (max 10 digits).
 */

import { useEffect, useRef } from 'react';
import {
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Text,
} from '@/shared/design-system';
import {
  LOCAL_PHONE_MAX_LENGTH,
  PHONE_COUNTRIES,
  formatPhoneDisplay,
} from '@/constants/phoneCountries';
import { detectPhoneCountry } from '@/utils/detectPhoneCountry';
import { sanitizeLocalPhone } from '@/utils/phoneInput';

interface PhoneCountryInputProps {
  countryCode: string;
  phone: string;
  onCountryChange: (code: string) => void;
  onPhoneChange: (phone: string) => void;
  /** Run geo lookup when no saved country on file */
  autoDetectCountry?: boolean;
  hasSavedCountry?: boolean;
}

export function PhoneCountryInput({
  countryCode,
  phone,
  onCountryChange,
  onPhoneChange,
  autoDetectCountry = true,
  hasSavedCountry = false,
}: PhoneCountryInputProps) {
  const geoAttempted = useRef(false);

  useEffect(() => {
    if (!autoDetectCountry || hasSavedCountry || geoAttempted.current) return;
    geoAttempted.current = true;

    void detectPhoneCountry().then((code) => {
      if (code && code !== countryCode) onCountryChange(code);
    });
  }, [autoDetectCountry, hasSavedCountry, countryCode, onCountryChange]);

  return (
    <FormControl>
      <FormLabel>Mobile number</FormLabel>
      <HStack spacing={2} align="stretch">
        <Select
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          size="lg"
          maxW={{ base: '140px', sm: '160px' }}
          flexShrink={0}
          aria-label="Country code"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.dialCode}
            </option>
          ))}
        </Select>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(sanitizeLocalPhone(e.target.value))}
          placeholder="9876543210"
          size="lg"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={LOCAL_PHONE_MAX_LENGTH}
          flex={1}
        />
      </HStack>
      <Text fontSize="xs" color="gray.500" marginTop={1}>
        {phone
          ? `Full number: ${formatPhoneDisplay(countryCode, phone)}`
          : `Enter ${LOCAL_PHONE_MAX_LENGTH} digits — country auto-detected from your location when possible`}
      </Text>
    </FormControl>
  );
}
