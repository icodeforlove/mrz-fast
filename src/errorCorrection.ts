/**
 * Error correction utilities for MRZ parsing
 * Includes padding and brute-forcing logic for common OCR errors
 * Optimized with smart ordering and fast check digit validation
 */

import { parseTD3 } from './td3.js';
import { fastValidateTD3CheckDigits } from './checkDigit.js';
import type { ParseResult, CorrectionMetrics } from './types.js';

/**
 * Ambiguous character pairs that are commonly confused in OCR
 * Maps from commonly misread characters (usually letters) to their correct form (usually numbers)
 */
const AMBIGUOUS_CHARS: Array<[string, string[]]> = [
  ['S', ['5']],
  ['5', ['S']],
  ['I', ['1', 'l']],
  ['1', ['I']],
  ['O', ['0']],
  ['0', ['O']],
  ['B', ['8']],
  ['8', ['B']],
  ['l', ['1', 'I']],
  ['Z', ['2']],
  ['7', ['2']],
  ['G', ['6']]
];

/**
 * Position of an ambiguous character
 */
interface AmbiguousPosition {
  pos: number;
  original: string;
  alternatives: string[];
}

/**
 * Pad or truncate line to target length
 * For Line 2, pads/removes padding before the final check digits (last 2 chars) if they're not '<'
 * Also removes invalid front padding (leading '<' characters) from both lines
 */
function padMRZLine(line: string, targetLength: number, isLine2: boolean = false): string {
  // Remove invalid front padding (leading '<' characters) from both lines
  line = line.replace(/^<+/, '');

  if (line.length === targetLength) {
    return line;
  }

  // For Line 2, handle checksum preservation
  if (isLine2 && line.length >= 2) {
    const last2 = line.slice(-2);
    // Check if last 2 chars are check digits (not '<' filler characters)
    if (last2 !== '<<' && !/^<+$/.test(last2)) {
      const beforeChecksum = line.slice(0, -2);
      const charsNeeded = targetLength - 2; // Account for 2-char checksum

      if (beforeChecksum.length < charsNeeded) {
        // Need to add padding before checksum
        const padding = '<'.repeat(charsNeeded - beforeChecksum.length);
        return beforeChecksum + padding + last2;
      } else if (beforeChecksum.length > charsNeeded) {
        // Need to remove padding (extra '<' chars) before checksum
        // Remove from the end of beforeChecksum (where padding typically is)
        const toRemove = beforeChecksum.length - charsNeeded;
        // Try to remove '<' characters from the end
        let trimmed = beforeChecksum;
        let removed = 0;
        for (let i = beforeChecksum.length - 1; i >= 0 && removed < toRemove; i--) {
          if (beforeChecksum[i] === '<') {
            removed++;
          } else {
            break;
          }
        }
        if (removed === toRemove) {
          // Successfully removed all needed chars from padding
          trimmed = beforeChecksum.slice(0, -removed);
        } else {
          // Couldn't remove enough padding, fall back to truncation
          trimmed = beforeChecksum.slice(0, charsNeeded);
        }
        return trimmed + last2;
      } else {
        // Exact length already
        return line;
      }
    }
  }

  // Default behavior for Line 1 or Line 2 without checksum
  if (line.length < targetLength) {
    return line + '<'.repeat(targetLength - line.length);
  } else {
    return line.substring(0, targetLength);
  }
}

/**
 * Find all positions of ambiguous characters in a string
 * Only applies to Line 2
 */
function findAmbiguousPositions(str: string): AmbiguousPosition[] {
  const positions: AmbiguousPosition[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    // Check ambiguous chars list
    for (const [from, toList] of AMBIGUOUS_CHARS) {
      if (char === from) {
        positions.push({ pos: i, original: char, alternatives: [...toList] });
        break; // Only one match per character
      }
    }
  }

  return positions;
}

/**
 * Generate combinations ordered by edit distance (number of character changes)
 * This allows us to find valid MRZs faster since most valid MRZs need 0-2 corrections
 * 
 * Generator yields: [line1, line2, editDistance]
 * Order: original (0 edits), then all 1-edit combos, then all 2-edit combos, etc.
 */
function* generateCombinationsOrdered(
  line1: string,
  line2: string,
  positions: AmbiguousPosition[],
  maxCombinations: number = 2000000
): Generator<[string, string, number]> {
  if (positions.length === 0) {
    yield [line1, line2, 0];
    return;
  }

  let totalYielded = 0;

  // Try original first (0 edits)
  yield [line1, line2, 0];
  totalYielded++;
  if (totalYielded >= maxCombinations) return;

  // Try all combinations ordered by edit distance
  // For each edit distance k, try all combinations of k position changes
  const n = positions.length;
  
  for (let k = 1; k <= n && totalYielded < maxCombinations; k++) {
    // Generate all k-combinations of position indices
    const combos = getCombinations(n, k);
    
    for (const combo of combos) {
      if (totalYielded >= maxCombinations) return;
      
      // For each position in this combination, try each alternative
      const alternatives = combo.map(idx => positions[idx].alternatives);
      const altCombos = cartesianProduct(alternatives);
      
      for (const alts of altCombos) {
        if (totalYielded >= maxCombinations) return;
        
        const chars = line2.split('');
        for (let i = 0; i < combo.length; i++) {
          const posIdx = combo[i];
          const posInfo = positions[posIdx];
          chars[posInfo.pos] = alts[i];
        }
        
        yield [line1, chars.join(''), k];
        totalYielded++;
      }
    }
  }
}

/**
 * Generate all k-combinations of indices 0..n-1
 */
function getCombinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  
  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < n; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * Cartesian product of arrays
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(x => [x]);
  
  const result: T[][] = [];
  const [first, ...rest] = arrays;
  const restProduct = cartesianProduct(rest);
  
  for (const item of first) {
    for (const restItems of restProduct) {
      result.push([item, ...restItems]);
    }
  }
  
  return result;
}

/**
 * Attempt to parse MRZ with error correction
 * Applies padding and brute-forcing to find valid combinations
 * Optimized with:
 * - Smart ordering (try fewer edits first)
 * - Fast check digit validation (filter before full parse)
 */
export function parseWithErrorCorrection(line1: string, line2: string): ParseResult {
  // Pad/truncate to standard lengths (TD3 format: 44 chars)
  const line1Padded = padMRZLine(line1, 44, false);
  const line2Padded = padMRZLine(line2, 44, true);

  // Check if padding/truncation made any changes
  const paddingApplied = line1 !== line1Padded || line2 !== line2Padded;

  // Find ambiguous positions in line 2
  const positions = findAmbiguousPositions(line2Padded);
  
  // Calculate total possible combinations (for reporting purposes)
  let theoreticalMaxCombinations = 1;
  for (const pos of positions) {
    theoreticalMaxCombinations *= (1 + pos.alternatives.length);
  }
  const maxCombos = 2000000;
  theoreticalMaxCombinations = Math.min(theoreticalMaxCombinations, maxCombos);
  
  let attemptNumber = 0;

  // Generate and test combinations in order of edit distance
  for (const [l1, l2] of generateCombinationsOrdered(
    line1Padded,
    line2Padded,
    positions,
    maxCombos
  )) {
    attemptNumber++;
    
    // Phase 1: Fast check digit validation (eliminates 99%+ of invalid combinations)
    if (!fastValidateTD3CheckDigits(l2)) {
      continue;
    }
    
    // Phase 2: Full parsing (only for combinations that pass fast validation)
    try {
      // Check if character correction was applied
      const characterCorrectionApplied = l1 !== line1Padded || l2 !== line2Padded;
      const corrected = paddingApplied || characterCorrectionApplied;
      
      const result = parseTD3([l1, l2], corrected);
      
      if (result.valid) {
        // Add correction metrics
        // If we succeed on attempt 1, totalCombinations should be 1, not the theoretical max
        const totalCombinations = attemptNumber === 1 ? 1 : theoreticalMaxCombinations;
        const metrics: CorrectionMetrics = {
          attemptNumber,
          totalAttempts: attemptNumber,
          totalCombinations,
          correctionApplied: corrected,
        };
        
        return {
          ...result,
          correctionMetrics: metrics,
        };
      }
    } catch (error) {
      // Continue to next combination
      continue;
    }
  }

  // If no valid combination found, return the result from the padded version
  // (will be invalid but will show the details)
  const failedResult = parseTD3([line1Padded, line2Padded], paddingApplied);
  
  // Add metrics even for failed attempts
  const metrics: CorrectionMetrics = {
    attemptNumber: 0,  // No successful attempt
    totalAttempts: attemptNumber,
    totalCombinations: theoreticalMaxCombinations,
    correctionApplied: paddingApplied,
  };
  
  return {
    ...failedResult,
    correctionMetrics: metrics,
  };
}

