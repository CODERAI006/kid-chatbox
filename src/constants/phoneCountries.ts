/**
 * Supported mobile countries — local number length capped at 10 digits.
 */

export interface PhoneCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const DEFAULT_PHONE_COUNTRY = 'IN';

export const LOCAL_PHONE_MAX_LENGTH = 10;

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'IN', name: 'India', dialCode: '91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dialCode: '1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', dialCode: '971', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', dialCode: '65', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', dialCode: '61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dialCode: '1', flag: '🇨🇦' },
  { code: 'MY', name: 'Malaysia', dialCode: '60', flag: '🇲🇾' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dialCode: '974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dialCode: '965', flag: '🇰🇼' },
  { code: 'OM', name: 'Oman', dialCode: '968', flag: '🇴🇲' },
  { code: 'BH', name: 'Bahrain', dialCode: '973', flag: '🇧🇭' },
  { code: 'NP', name: 'Nepal', dialCode: '977', flag: '🇳🇵' },
  { code: 'BD', name: 'Bangladesh', dialCode: '880', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '94', flag: '🇱🇰' },
  { code: 'PK', name: 'Pakistan', dialCode: '92', flag: '🇵🇰' },
];

const byCode = new Map(PHONE_COUNTRIES.map((c) => [c.code, c]));

export function getPhoneCountry(code?: string | null): PhoneCountry | undefined {
  if (!code) return undefined;
  return byCode.get(code.toUpperCase());
}

export function formatPhoneDisplay(countryCode: string | undefined, localPhone?: string | null): string {
  if (!localPhone) return '';
  const country = getPhoneCountry(countryCode) || getPhoneCountry(DEFAULT_PHONE_COUNTRY)!;
  return `+${country.dialCode} ${localPhone}`;
}
