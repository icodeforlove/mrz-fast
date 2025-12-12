/**
 * Precomputed lookup table for character values in check digit calculation
 * Initialized once at module load for maximum performance
 * Index by character code, get MRZ value (0-35)
 */
const CHAR_VALUES = new Uint8Array(256);

// Initialize lookup table
(() => {
  // '<' (60) = 0
  CHAR_VALUES[60] = 0;
  
  // '0'-'9' (48-57) = 0-9
  for (let i = 48; i <= 57; i++) {
    CHAR_VALUES[i] = i - 48;
  }
  
  // 'A'-'Z' (65-90) = 10-35
  for (let i = 65; i <= 90; i++) {
    CHAR_VALUES[i] = i - 55; // A=10, B=11, ..., Z=35
  }
  
  // All other characters default to 0 (already initialized)
})();

/**
 * Calculate check digit for MRZ field using ICAO 9303 algorithm
 * Optimized with precomputed lookup table
 * 
 * Weights: [7, 3, 1] repeating
 * Character values:
 * - '<' = 0
 * - '0'-'9' = 0-9
 * - 'A'-'Z' = 10-35
 * 
 * @param input - The string to calculate check digit for
 * @returns The calculated check digit (0-9)
 */
export function calculateCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < input.length; i++) {
    sum += CHAR_VALUES[input.charCodeAt(i)] * weights[i % 3];
  }

  return sum % 10;
}

/**
 * Validate a check digit against the input string
 * 
 * @param input - The string to validate
 * @param checkDigit - The check digit character to validate
 * @returns true if valid, false otherwise
 */
export function validateCheckDigit(input: string, checkDigit: string): boolean {
  const calculated = calculateCheckDigit(input);
  const provided = checkDigit === '<' ? 0 : parseInt(checkDigit, 10);
  
  if (isNaN(provided)) {
    return false;
  }
  
  return calculated === provided;
}

/**
 * Fast validation of all TD3 check digits without full field parsing
 * This is optimized for error correction where we need to quickly filter
 * invalid combinations before doing expensive parsing
 * 
 * Validates 5 check digits:
 * - Document number (0-9, check at 9)
 * - Birth date (13-19, check at 19)
 * - Expiration date (21-27, check at 27)
 * - Personal number (28-42, check at 42)
 * - Composite (0-10 + 13-20 + 21-43, check at 43)
 * 
 * @param line2 - Second line of TD3 MRZ (must be 44 characters)
 * @returns true if all check digits are valid, false otherwise
 */
export function fastValidateTD3CheckDigits(line2: string): boolean {
  if (line2.length !== 44) {
    return false;
  }

  const weights = [7, 3, 1];

  // Validate document number check digit (0-9, check at 9)
  const docNumCheckDigit = line2.charCodeAt(9);
  const docNumProvided = docNumCheckDigit === 60 ? 0 : docNumCheckDigit - 48; // '<' or '0'-'9'
  if (docNumProvided < 0 || docNumProvided > 9) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[i % 3];
  }
  if ((sum % 10) !== docNumProvided) return false;

  // Validate birth date check digit (13-19, check at 19)
  const birthDateCheckDigit = line2.charCodeAt(19);
  const birthDateProvided = birthDateCheckDigit === 60 ? 0 : birthDateCheckDigit - 48;
  if (birthDateProvided < 0 || birthDateProvided > 9) return false;
  
  sum = 0;
  for (let i = 13, j = 0; i < 19; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  if ((sum % 10) !== birthDateProvided) return false;

  // Validate expiration date check digit (21-27, check at 27)
  const expDateCheckDigit = line2.charCodeAt(27);
  const expDateProvided = expDateCheckDigit === 60 ? 0 : expDateCheckDigit - 48;
  if (expDateProvided < 0 || expDateProvided > 9) return false;
  
  sum = 0;
  for (let i = 21, j = 0; i < 27; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  if ((sum % 10) !== expDateProvided) return false;

  // Validate personal number check digit (28-42, check at 42)
  const personalNumCheckDigit = line2.charCodeAt(42);
  const personalNumProvided = personalNumCheckDigit === 60 ? 0 : personalNumCheckDigit - 48;
  if (personalNumProvided < 0 || personalNumProvided > 9) return false;
  
  sum = 0;
  for (let i = 28, j = 0; i < 42; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  if ((sum % 10) !== personalNumProvided) return false;

  // Validate composite check digit (0-10 + 13-20 + 21-43, check at 43)
  const compositeCheckDigit = line2.charCodeAt(43);
  const compositeProvided = compositeCheckDigit === 60 ? 0 : compositeCheckDigit - 48;
  if (compositeProvided < 0 || compositeProvided > 9) return false;
  
  sum = 0;
  let j = 0;
  // Document number + check (0-10)
  for (let i = 0; i < 10; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  // Birth date + check (13-20)
  for (let i = 13; i < 20; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  // Expiration date + check + personal number + check (21-43)
  for (let i = 21; i < 43; i++, j++) {
    sum += CHAR_VALUES[line2.charCodeAt(i)] * weights[j % 3];
  }
  if ((sum % 10) !== compositeProvided) return false;

  return true;
}


