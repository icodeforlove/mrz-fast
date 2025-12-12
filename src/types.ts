/**
 * Range represents a position in the MRZ text
 */
export interface Range {
  line: number;
  start: number;
  end: number;
}

/**
 * Details about a specific field in the MRZ
 */
export interface Details {
  label: string;
  field: FieldName | null;
  value: string | null;
  valid: boolean;
  ranges: Range[];
  line: number;
  start: number;
  end: number;
  error?: string;
}

/**
 * Metrics about error correction process
 */
export interface CorrectionMetrics {
  attemptNumber: number;      // Which attempt succeeded (1-based)
  totalAttempts: number;      // Total number of combinations tried
  totalCombinations: number;  // Total number of possible combinations
  correctionApplied: boolean; // Whether any correction was applied
}

/**
 * Result of parsing an MRZ document
 */
export interface ParseResult {
  format: 'TD3';
  valid: boolean;
  corrected: boolean;
  fields: FieldRecords;
  documentNumber: string | null;
  details: Details[];
  lines: {
    line1: string;
    line2: string;
  };
  correctionMetrics?: CorrectionMetrics;  // Only present when errorCorrection is enabled
}

/**
 * Record of all parsed fields
 */
export type FieldRecords = Partial<Record<FieldName, string | null>>;

/**
 * All possible field names in TD3 format
 */
export type FieldName =
  | 'documentCode'
  | 'issuingState'
  | 'lastName'
  | 'firstName'
  | 'documentNumber'
  | 'documentNumberCheckDigit'
  | 'nationality'
  | 'birthDate'
  | 'birthDateCheckDigit'
  | 'sex'
  | 'expirationDate'
  | 'expirationDateCheckDigit'
  | 'personalNumber'
  | 'personalNumberCheckDigit'
  | 'compositeCheckDigit';

/**
 * Options for parsing MRZ
 */
export interface ParseOptions {
  /**
   * Enable error correction through padding and brute-forcing
   * When enabled, the parser will attempt to fix common OCR errors and validate through combinations
   * @default false
   */
  errorCorrection?: boolean;
}

/**
 * Date input for MRZ creation
 */
export interface MRZDate {
  year: number;
  month: number;
  day: number;
}

/**
 * Input data for creating a TD3 passport MRZ
 */
export interface CreateMRZInput {
  documentCode: string;
  issuingState: string;
  lastName: string;
  firstName: string;
  documentNumber: string;
  nationality: string;
  birthDate: MRZDate;
  sex: 'male' | 'female' | 'unspecified';
  expirationDate: MRZDate;
  personalNumber?: string;
}

