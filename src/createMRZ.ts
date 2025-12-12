/**
 * TD3 (2-line passport) MRZ creator
 * Creates properly formatted and checksummed MRZ strings from structured data
 */

import { calculateCheckDigit } from './checkDigit.js';
import type { CreateMRZInput } from './types.js';

/**
 * Pad a field with '<' characters to reach the specified length
 * Truncates if the value is too long
 */
function padField(value: string, length: number): string {
  const cleaned = value.toUpperCase().replace(/ /g, '<');
  if (cleaned.length >= length) {
    return cleaned.substring(0, length);
  }
  return cleaned.padEnd(length, '<');
}

/**
 * Format date as YYMMDD string
 */
function formatDate(year: number, month: number, day: number): string {
  // Convert to 2-digit year (last 2 digits)
  const yy = String(year % 100).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return yy + mm + dd;
}

/**
 * Convert sex value to MRZ format
 */
function formatSex(sex: 'male' | 'female' | 'unspecified'): string {
  switch (sex) {
    case 'male':
      return 'M';
    case 'female':
      return 'F';
    case 'unspecified':
      return '<';
  }
}

/**
 * Format names as "LASTNAME<<FIRSTNAME" with proper padding
 * Total length should be 39 characters for TD3 format
 */
function formatNames(lastName: string, firstName: string, totalLength: number): string {
  // Clean and uppercase names, replace spaces with <
  const lastNameClean = lastName.toUpperCase().replace(/ /g, '<');
  const firstNameClean = firstName.toUpperCase().replace(/ /g, '<');
  
  // Format as LASTNAME<<FIRSTNAME
  const formatted = lastNameClean + '<<' + firstNameClean;
  
  // Pad or truncate to total length
  if (formatted.length >= totalLength) {
    return formatted.substring(0, totalLength);
  }
  return formatted.padEnd(totalLength, '<');
}

/**
 * Create a TD3 passport MRZ from structured input data
 * Returns [line1, line2] with proper formatting and check digits
 * 
 * @param input - The passport data to format
 * @returns A tuple of two 44-character MRZ lines
 */
export function createMRZ(input: CreateMRZInput): [string, string] {
  // Line 1: Document code (2) + Issuing state (3) + Names (39) = 44 chars
  const documentCode = padField(input.documentCode, 2);
  const issuingState = padField(input.issuingState, 3);
  const names = formatNames(input.lastName, input.firstName, 39);
  const line1 = documentCode + issuingState + names;

  // Line 2 components
  const documentNumber = padField(input.documentNumber, 9);
  const documentNumberCheck = String(calculateCheckDigit(documentNumber));
  
  const nationality = padField(input.nationality, 3);
  
  const birthDate = formatDate(input.birthDate.year, input.birthDate.month, input.birthDate.day);
  const birthDateCheck = String(calculateCheckDigit(birthDate));
  
  const sex = formatSex(input.sex);
  
  const expirationDate = formatDate(input.expirationDate.year, input.expirationDate.month, input.expirationDate.day);
  const expirationDateCheck = String(calculateCheckDigit(expirationDate));
  
  const personalNumber = padField(input.personalNumber || '', 14);
  const personalNumberCheck = String(calculateCheckDigit(personalNumber));
  
  // Composite check digit calculation
  // Includes: document number + check digit + birth date + check digit + expiration date + check digit + personal number + check digit
  const compositeInput = documentNumber + documentNumberCheck + birthDate + birthDateCheck + expirationDate + expirationDateCheck + personalNumber + personalNumberCheck;
  const compositeCheck = String(calculateCheckDigit(compositeInput));

  // Line 2: Document number (9) + check (1) + nationality (3) + birth date (6) + check (1) + sex (1) + expiration date (6) + check (1) + personal number (14) + check (1) + composite check (1) = 44 chars
  const line2 = documentNumber + documentNumberCheck + nationality + birthDate + birthDateCheck + sex + expirationDate + expirationDateCheck + personalNumber + personalNumberCheck + compositeCheck;

  return [line1, line2];
}


