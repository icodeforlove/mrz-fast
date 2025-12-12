/**
 * MRZ Fast - High-performance TypeScript MRZ Parser
 * Focused on 2-line passport codes with optimized error correction
 */

// Export types
export type { ParseResult, Details, FieldRecords, FieldName, Range, ParseOptions, CorrectionMetrics, CreateMRZInput, MRZDate } from './types.js';

// Export MRZ parsing
export { parseMRZ } from './parseMRZ.js';

// Export MRZ creation
export { createMRZ } from './createMRZ.js';
