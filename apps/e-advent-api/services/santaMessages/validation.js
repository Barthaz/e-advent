'use strict';

const ADDRESS_FORMS = ['male', 'female', 'siblings'];
const AGE_BANDS = ['2-3', '4-6', '7-9', '10+'];

const NAME_FIELDS = {
  childName: { required: true, min: 2, max: 40 },
  childVocative: { required: true, min: 2, max: 40 },
};

const TEXT_FIELDS = {
  achievement: { required: true, min: 3, max: 180 },
  proudOf: { required: true, min: 3, max: 180 },
  workingOn: { required: false, min: 3, max: 150 },
  wishes: { required: false, min: 3, max: 180 },
  siblingsNote: { required: false, min: 3, max: 120 },
};

const NAME_PATTERN = /^\p{L}[\p{L}\p{M}' .-]*$/u;
const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:pl|com|net|org|eu|io)\b)/i;
const MARKUP_PATTERN = /[<>{}\\[\]`|]/;

function clean(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Unicode-aware length; never truncates silently. */
function length(value) {
  return [...value].length;
}

function checkLength(field, value, rule, errors) {
  const len = length(value);
  if (len < rule.min) errors.push({ field, code: 'TOO_SHORT', min: rule.min });
  else if (len > rule.max) errors.push({ field, code: 'TOO_LONG', max: rule.max });
}

/**
 * Validates parent input for the Santa message. Text is treated as untrusted data:
 * no markup or links, bounded length, plain sentences only.
 * @returns {{ value: object|null, errors: Array<{field: string, code: string}> }}
 */
function validatePersonalization(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const errors = [];
  const value = {};
  const addressForm = typeof raw.addressForm === 'string' ? clean(raw.addressForm) : '';
  const siblings = addressForm === 'siblings';

  for (const [field, rule] of Object.entries(NAME_FIELDS)) {
    const text = typeof raw[field] === 'string' ? clean(raw[field]) : '';
    if (!text) { errors.push({ field, code: 'REQUIRED' }); continue; }
    const names = siblings ? text.split(',').map(clean) : [text];
    if (siblings && (names.length < 2 || names.length > 9 || names.some(name => !name))) {
      errors.push({ field, code: 'SIBLING_COUNT' });
      continue;
    }
    for (const name of names) {
      checkLength(field, name, rule, errors);
      if (!NAME_PATTERN.test(name)) errors.push({ field, code: 'INVALID_CHARS' });
    }
    value[field] = names.join(', ');
  }
  if (siblings && value.childName && value.childVocative &&
      value.childName.split(',').length !== value.childVocative.split(',').length) {
    errors.push({ field: 'childVocative', code: 'SIBLING_MISMATCH' });
  }

  if (!addressForm) errors.push({ field: 'addressForm', code: 'REQUIRED' });
  else if (!ADDRESS_FORMS.includes(addressForm)) errors.push({ field: 'addressForm', code: 'INVALID_OPTION' });
  else value.addressForm = addressForm;

  const ageBand = clean(raw.ageBand);
  const ageInput = raw.ageYears;
  if (ageInput != null && ageInput !== '') {
    const ageText = typeof ageInput === 'string' || typeof ageInput === 'number' ? String(ageInput) : '';
    const ages = ageText.split(',').map(age => age.trim());
    if (ages.some(age => !/^\d{1,3}$/.test(age) || Number(age) > 120) || (!siblings && ages.length !== 1)) {
      errors.push({ field: 'ageYears', code: 'INVALID_AGE' });
    } else if (siblings && ages.length !== value.childName?.split(',').length) {
      errors.push({ field: 'ageYears', code: 'AGE_COUNT' });
    } else {
      value.ageYears = ages.map(Number).join(', ');
    }
  } else if (ageBand) {
    if (!AGE_BANDS.includes(ageBand)) errors.push({ field: 'ageBand', code: 'INVALID_OPTION' });
    else value.ageBand = ageBand;
  }

  for (const [field, rule] of Object.entries(TEXT_FIELDS)) {
    const text = clean(raw[field]);
    if (!text) {
      if (rule.required) errors.push({ field, code: 'REQUIRED' });
      continue;
    }
    checkLength(field, text, rule, errors);
    if (LINK_PATTERN.test(text)) errors.push({ field, code: 'LINK_NOT_ALLOWED' });
    else if (MARKUP_PATTERN.test(text)) errors.push({ field, code: 'INVALID_CHARS' });
    value[field] = text;
  }

  return errors.length ? { value: null, errors } : { value, errors: [] };
}

module.exports = { validatePersonalization, ADDRESS_FORMS, AGE_BANDS, TEXT_FIELDS, NAME_FIELDS };
