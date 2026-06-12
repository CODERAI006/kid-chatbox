import { DEFAULT_PHONE_COUNTRY, getPhoneCountry } from '@/constants/phoneCountries';

/**
 * Guess ISO country for phone dial code — geo IP first, then browser locale.
 */
export async function detectPhoneCountry(): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipapi.co/country_code/', { signal: controller.signal });
    window.clearTimeout(timer);
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase();
      if (getPhoneCountry(code)) return code;
    }
  } catch {
    // Geo lookup unavailable — fall through to locale
  }

  const locale = navigator.language || '';
  const region = locale.split('-')[1]?.toUpperCase();
  if (region && getPhoneCountry(region)) return region;

  return DEFAULT_PHONE_COUNTRY;
}
