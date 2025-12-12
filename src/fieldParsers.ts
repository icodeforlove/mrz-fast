/**
 * Field parser functions for TD3 MRZ format
 * Optimized with pre-compiled regex patterns
 */

// Pre-compiled regex patterns for performance
const TRAILING_ANGLES = /<+$/g;
const ALL_ANGLES = /</g;
const ALPHA_ONLY = /^[A-Z<]+$/;
const ALPHANUM_ONLY = /^[0-9A-Z<]+$/;
const STATE_CODE_PATTERN = /^[A-Z<]{3}$/;
const DATE_PATTERN = /^[0-9<]{6}$/;

/**
 * Clean text by replacing '<' with spaces and removing trailing '<' characters
 */
function cleanText(text: string): string {
  // Reset regex lastIndex for global regexes to ensure correct behavior
  TRAILING_ANGLES.lastIndex = 0;
  ALL_ANGLES.lastIndex = 0;
  return text.replace(TRAILING_ANGLES, '').replace(ALL_ANGLES, ' ');
}

/**
 * Parse document code (P, PA, PT, PO, etc.)
 */
export function parseDocumentCode(code: string): { value: string; error?: string } {
  ALL_ANGLES.lastIndex = 0;
  const cleaned = code.replace(ALL_ANGLES, '');
  
  if (cleaned.length === 0 || cleaned.length > 2 || !ALPHA_ONLY.test(cleaned)) {
    return { value: code, error: `invalid document code: ${code}` };
  }
  
  // Valid passport codes
  const validCodes = ['P', 'PA', 'PO', 'PT'];
  if (!validCodes.includes(cleaned)) {
    return { value: cleaned, error: `unknown document code: ${cleaned}` };
  }
  
  return { value: cleaned };
}

/**
 * Parse 3-letter state/country code
 */
export function parseState(state: string): { value: string; error?: string } {
  if (!STATE_CODE_PATTERN.test(state)) {
    return { value: state, error: `invalid state code: ${state}` };
  }
  
  ALL_ANGLES.lastIndex = 0;
  const cleaned = state.replace(ALL_ANGLES, '');
  
  if (cleaned.length === 0) {
    return { value: '', error: 'state code is empty' };
  }
  
  // Basic validation - should be 1-3 letters
  if (cleaned.length < 1 || cleaned.length > 3) {
    return { value: cleaned, error: `invalid state code: ${state}` };
  }
  
  return { value: cleaned };
}

/**
 * Parse names field and extract last name and first name
 * Format: LASTNAME<<FIRSTNAME<MIDDLE
 */
export function parseNames(namesField: string): { 
  lastName: { value: string; start: number; end: number };
  firstName: { value: string; start: number; end: number };
} {
  // Find the double angle bracket separator
  const separatorIndex = namesField.indexOf('<<');
  
  if (separatorIndex === -1) {
    // No separator found, entire field is last name
    TRAILING_ANGLES.lastIndex = 0;
    const lastNameRaw = namesField.replace(TRAILING_ANGLES, '');
    const lastName = cleanText(lastNameRaw);
    return {
      lastName: { value: lastName, start: 0, end: lastNameRaw.length },
      firstName: { value: '', start: namesField.length, end: namesField.length }
    };
  }
  
  // Extract last name (before <<)
  const lastNameRaw = namesField.substring(0, separatorIndex);
  const lastName = cleanText(lastNameRaw);
  
  // Extract first name (after <<)
  const firstNameStart = separatorIndex + 2;
  TRAILING_ANGLES.lastIndex = 0;
  const firstNameRaw = namesField.substring(firstNameStart).replace(TRAILING_ANGLES, '');
  const firstName = cleanText(firstNameRaw);
  
  return {
    lastName: { value: lastName, start: 0, end: separatorIndex },
    firstName: { value: firstName, start: firstNameStart, end: firstNameStart + firstNameRaw.length }
  };
}

/**
 * Parse document number (alphanumeric)
 */
export function parseDocumentNumber(docNum: string): { value: string; error?: string } {
  if (!ALPHANUM_ONLY.test(docNum)) {
    return { value: docNum, error: `invalid document number: ${docNum}` };
  }
  
  TRAILING_ANGLES.lastIndex = 0;
  const cleaned = docNum.replace(TRAILING_ANGLES, '');
  
  if (cleaned.length === 0) {
    return { value: '', error: 'document number is empty' };
  }
  
  return { value: cleaned };
}

/**
 * Parse date in YYMMDD format
 */
export function parseDate(date: string): { value: string; error?: string } {
  if (!DATE_PATTERN.test(date)) {
    return { value: date, error: `invalid date format: ${date}` };
  }
  
  // Check month (positions 2-3)
  const month = date.substring(2, 4);
  if (month !== '<<') {
    const monthNum = parseInt(month, 10);
    if (monthNum < 1 || monthNum > 12) {
      return { value: date, error: `invalid date month: ${month}` };
    }
  }
  
  // Check day (positions 4-5)
  const day = date.substring(4, 6);
  if (day !== '<<') {
    const dayNum = parseInt(day, 10);
    if (dayNum < 1 || dayNum > 31) {
      return { value: date, error: `invalid date day: ${day}` };
    }
  }
  
  return { value: date };
}

/**
 * Parse sex field (M, F, or <)
 */
export function parseSex(sex: string): { value: string; error?: string } {
  if (sex === 'M') {
    return { value: 'male' };
  } else if (sex === 'F') {
    return { value: 'female' };
  } else if (sex === '<') {
    return { value: 'unspecified' };
  }
  
  return { value: sex, error: `invalid sex: ${sex}. Must be M, F, or <` };
}

/**
 * Parse optional personal number field
 */
export function parsePersonalNumber(personalNum: string): { value: string } {
  TRAILING_ANGLES.lastIndex = 0;
  const cleaned = personalNum.replace(TRAILING_ANGLES, '');
  return { value: cleaned };
}

