/**
 * Phone normalization — local number capped at 10 digits with ISO country.
 */

const LOCAL_PHONE_LENGTH = 10;
const DEFAULT_COUNTRY = 'IN';

const COUNTRIES = {
  IN: '91',
  US: '1',
  GB: '44',
  AE: '971',
  SG: '65',
  AU: '61',
  CA: '1',
  MY: '60',
  SA: '966',
  QA: '974',
  KW: '965',
  OM: '968',
  BH: '973',
  NP: '977',
  BD: '880',
  LK: '94',
  PK: '92',
};

function normalizeCountryCode(value) {
  if (value == null || value === '') return DEFAULT_COUNTRY;
  const code = String(value).trim().toUpperCase();
  return COUNTRIES[code] ? code : DEFAULT_COUNTRY;
}

function splitLegacyPhone(rawPhone, countryCode) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';

  const dial = COUNTRIES[countryCode] || COUNTRIES[DEFAULT_COUNTRY];
  if (digits.startsWith(dial) && digits.length > LOCAL_PHONE_LENGTH) {
    return digits.slice(dial.length, dial.length + LOCAL_PHONE_LENGTH);
  }
  return digits.slice(0, LOCAL_PHONE_LENGTH);
}

function normalizePhone(phone, phoneCountry) {
  if (phone == null || phone === '') {
    return { phone: null, phoneCountry: normalizeCountryCode(phoneCountry) };
  }

  const country = normalizeCountryCode(phoneCountry);
  const local = splitLegacyPhone(phone, country);

  if (!local) {
    return { phone: null, phoneCountry: country };
  }

  if (local.length !== LOCAL_PHONE_LENGTH) {
    return { error: `Mobile number must be exactly ${LOCAL_PHONE_LENGTH} digits` };
  }

  return { phone: local, phoneCountry: country };
}

function mapPhoneFields(userRow) {
  const storedCountry = userRow.phone_country
    ? normalizeCountryCode(userRow.phone_country)
    : null;
  const phone = userRow.phone
    ? splitLegacyPhone(userRow.phone, storedCountry || DEFAULT_COUNTRY)
    : null;

  return {
    phone: phone || null,
    phoneCountry: phone ? storedCountry || DEFAULT_COUNTRY : storedCountry,
  };
}

module.exports = {
  LOCAL_PHONE_LENGTH,
  DEFAULT_COUNTRY,
  normalizePhone,
  mapPhoneFields,
  normalizeCountryCode,
};
