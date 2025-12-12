/**
 * Parse MRZ text into structured data
 */

import { parseTD3 } from './td3.js';
import { parseWithErrorCorrection } from './errorCorrection.js';
import type { ParseResult, ParseOptions } from './types.js';

/**
 * Parse MRZ text into structured data
 * 
 * Supports TD3 format (2-line passport codes, 44 characters per line)
 * 
 * @param input - MRZ text as a tuple of exactly 2 strings (2 lines)
 * @param options - Optional parsing options
 * @returns Parsed result with fields, validation status, and details
 * 
 * @example
 * ```typescript
 * // Basic parsing (requires exactly 44 characters per line)
 * const mrz: [string, string] = [
 *   'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
 *   'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
 * ];
 * const result = parseMRZ(mrz);
 * console.log(result.fields.firstName); // 'ANNA MARIA'
 * console.log(result.valid); // true/false
 * 
 * // With error correction (pads/truncates and tries combinations)
 * const shortMrz: [string, string] = [
 *   'P<UTOERIKSSON<<ANNA<MARIA',
 *   'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
 * ];
 * const resultWithCorrection = parseMRZ(shortMrz, { errorCorrection: true });
 * ```
 */
export function parseMRZ(input: readonly [string, string], options?: ParseOptions): ParseResult {
  const { errorCorrection = false } = options || {};

  if (errorCorrection) {
    // Use optimized TypeScript error correction
    return parseWithErrorCorrection(input[0], input[1]);
  } else {
    // Standard parsing: requires exactly 44 characters per line, no corrections applied
    return parseTD3(Array.from(input), false);
  }
}

