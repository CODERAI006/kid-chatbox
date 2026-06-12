import {
  DEFAULT_PHONE_COUNTRY,
  LOCAL_PHONE_MAX_LENGTH,
  getPhoneCountry,
} from '@/constants/phoneCountries';

export function sanitizeLocalPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, LOCAL_PHONE_MAX_LENGTH);
}

export function splitStoredPhone(
  rawPhone?: string | null,
  rawCountry?: string | null
): { countryCode: string; localPhone: string } {
  const countryCode = (rawCountry || DEFAULT_PHONE_COUNTRY).toUpperCase();
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return { countryCode, localPhone: '' };

  const country = getPhoneCountry(countryCode) || getPhoneCountry(DEFAULT_PHONE_COUNTRY)!;
  if (digits.startsWith(country.dialCode) && digits.length > LOCAL_PHONE_MAX_LENGTH) {
    return {
      countryCode: country.code,
      localPhone: digits.slice(country.dialCode.length).slice(0, LOCAL_PHONE_MAX_LENGTH),
    };
  }

  return {
    countryCode: country.code,
    localPhone: digits.slice(0, LOCAL_PHONE_MAX_LENGTH),
  };
}

export function validateLocalPhone(localPhone: string): string | null {
  if (!localPhone) return null;
  if (localPhone.length !== LOCAL_PHONE_MAX_LENGTH) {
    return `Mobile number must be exactly ${LOCAL_PHONE_MAX_LENGTH} digits`;
  }
  return null;
}
