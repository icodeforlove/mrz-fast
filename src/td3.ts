/**
 * TD3 (2-line passport) MRZ parser
 */

import { validateCheckDigit, calculateCheckDigit } from './checkDigit.js';
import {
  parseDocumentCode,
  parseState,
  parseNames,
  parseDocumentNumber,
  parseDate,
  parseSex,
  parsePersonalNumber,
} from './fieldParsers.js';
import type { ParseResult, Details, FieldRecords } from './types.js';

/**
 * Parse TD3 format MRZ (2 lines, 44 characters each)
 * 
 * Line 1: Document code (0-2), Issuing state (2-5), Names (5-44)
 * Line 2: Document number (0-9), Check (9), Nationality (10-13), 
 *         Birth date (13-19), Check (19), Sex (20), 
 *         Expiration date (21-27), Check (27), 
 *         Personal number (28-42), Check (42), Composite check (43)
 */
export function parseTD3(lines: string[], corrected: boolean = false): ParseResult {
  // Validate format
  if (lines.length !== 2) {
    throw new Error(`TD3 format requires exactly 2 lines, got ${lines.length}`);
  }
  
  if (lines[0].length !== 44) {
    throw new Error(`TD3 line 1 must be 44 characters, got ${lines[0].length}`);
  }
  
  if (lines[1].length !== 44) {
    throw new Error(`TD3 line 2 must be 44 characters, got ${lines[1].length}`);
  }

  const details: Details[] = [];
  const fields: FieldRecords = {};
  let allValid = true;

  // Line 1 - Field extraction
  const line1 = lines[0];
  
  // Document Code (0-2)
  const documentCodeRaw = line1.substring(0, 2);
  const documentCodeResult = parseDocumentCode(documentCodeRaw);
  const documentCodeValid = !documentCodeResult.error;
  details.push({
    label: 'Document code',
    field: 'documentCode',
    value: documentCodeResult.value,
    valid: documentCodeValid,
    ranges: [{ line: 0, start: 0, end: 2 }],
    line: 0,
    start: 0,
    end: 2,
    error: documentCodeResult.error,
  });
  fields.documentCode = documentCodeValid ? documentCodeResult.value : null;
  if (!documentCodeValid) allValid = false;

  // Issuing State (2-5)
  const issuingStateRaw = line1.substring(2, 5);
  const issuingStateResult = parseState(issuingStateRaw);
  const issuingStateValid = !issuingStateResult.error;
  details.push({
    label: 'Issuing state',
    field: 'issuingState',
    value: issuingStateResult.value,
    valid: issuingStateValid,
    ranges: [{ line: 0, start: 2, end: 5 }],
    line: 0,
    start: 2,
    end: 5,
    error: issuingStateResult.error,
  });
  fields.issuingState = issuingStateValid ? issuingStateResult.value : null;
  if (!issuingStateValid) allValid = false;

  // Names (5-44)
  const namesField = line1.substring(5, 44);
  const namesResult = parseNames(namesField);
  
  // Last Name
  details.push({
    label: 'Last name',
    field: 'lastName',
    value: namesResult.lastName.value,
    valid: true,
    ranges: [{ line: 0, start: 5, end: 44 }],
    line: 0,
    start: 5 + namesResult.lastName.start,
    end: 5 + namesResult.lastName.end,
  });
  fields.lastName = namesResult.lastName.value;

  // First Name
  details.push({
    label: 'First name',
    field: 'firstName',
    value: namesResult.firstName.value,
    valid: true,
    ranges: [{ line: 0, start: 5, end: 44 }],
    line: 0,
    start: 5 + namesResult.firstName.start,
    end: 5 + namesResult.firstName.end,
  });
  fields.firstName = namesResult.firstName.value;

  // Line 2 - Field extraction
  const line2 = lines[1];

  // Document Number (0-9)
  const documentNumberRaw = line2.substring(0, 9);
  const documentNumberResult = parseDocumentNumber(documentNumberRaw);
  const documentNumberValid = !documentNumberResult.error;
  details.push({
    label: 'Document number',
    field: 'documentNumber',
    value: documentNumberResult.value,
    valid: documentNumberValid,
    ranges: [{ line: 1, start: 0, end: 9 }],
    line: 1,
    start: 0,
    end: 9,
    error: documentNumberResult.error,
  });
  fields.documentNumber = documentNumberValid ? documentNumberResult.value : null;
  if (!documentNumberValid) allValid = false;

  // Document Number Check Digit (9)
  const documentNumberCheckDigit = line2.substring(9, 10);
  const documentNumberCheckValid = validateCheckDigit(documentNumberRaw, documentNumberCheckDigit);
  let documentNumberCheckError: string | undefined;
  if (!documentNumberCheckValid) {
    const calculated = calculateCheckDigit(documentNumberRaw);
    documentNumberCheckError = `invalid check digit: ${documentNumberCheckDigit}. Must be ${calculated}`;
  }
  details.push({
    label: 'Document number check digit',
    field: 'documentNumberCheckDigit',
    value: documentNumberCheckDigit,
    valid: documentNumberCheckValid,
    ranges: [{ line: 1, start: 9, end: 10 }],
    line: 1,
    start: 9,
    end: 10,
    error: documentNumberCheckError,
  });
  fields.documentNumberCheckDigit = documentNumberCheckValid ? documentNumberCheckDigit : null;
  if (!documentNumberCheckValid) allValid = false;

  // Nationality (10-13)
  const nationalityRaw = line2.substring(10, 13);
  const nationalityResult = parseState(nationalityRaw);
  const nationalityValid = !nationalityResult.error;
  details.push({
    label: 'Nationality',
    field: 'nationality',
    value: nationalityResult.value,
    valid: nationalityValid,
    ranges: [{ line: 1, start: 10, end: 13 }],
    line: 1,
    start: 10,
    end: 13,
    error: nationalityResult.error,
  });
  fields.nationality = nationalityValid ? nationalityResult.value : null;
  if (!nationalityValid) allValid = false;

  // Birth Date (13-19)
  const birthDateRaw = line2.substring(13, 19);
  const birthDateResult = parseDate(birthDateRaw);
  const birthDateValid = !birthDateResult.error;
  details.push({
    label: 'Birth date',
    field: 'birthDate',
    value: birthDateResult.value,
    valid: birthDateValid,
    ranges: [{ line: 1, start: 13, end: 19 }],
    line: 1,
    start: 13,
    end: 19,
    error: birthDateResult.error,
  });
  fields.birthDate = birthDateValid ? birthDateResult.value : null;
  if (!birthDateValid) allValid = false;

  // Birth Date Check Digit (19)
  const birthDateCheckDigit = line2.substring(19, 20);
  const birthDateCheckValid = validateCheckDigit(birthDateRaw, birthDateCheckDigit);
  let birthDateCheckError: string | undefined;
  if (!birthDateCheckValid) {
    const calculated = calculateCheckDigit(birthDateRaw);
    birthDateCheckError = `invalid check digit: ${birthDateCheckDigit}. Must be ${calculated}`;
  }
  details.push({
    label: 'Birth date check digit',
    field: 'birthDateCheckDigit',
    value: birthDateCheckDigit,
    valid: birthDateCheckValid,
    ranges: [{ line: 1, start: 19, end: 20 }],
    line: 1,
    start: 19,
    end: 20,
    error: birthDateCheckError,
  });
  fields.birthDateCheckDigit = birthDateCheckValid ? birthDateCheckDigit : null;
  if (!birthDateCheckValid) allValid = false;

  // Sex (20)
  const sexRaw = line2.substring(20, 21);
  const sexResult = parseSex(sexRaw);
  const sexValid = !sexResult.error;
  details.push({
    label: 'Sex',
    field: 'sex',
    value: sexResult.value,
    valid: sexValid,
    ranges: [{ line: 1, start: 20, end: 21 }],
    line: 1,
    start: 20,
    end: 21,
    error: sexResult.error,
  });
  fields.sex = sexValid ? sexResult.value : null;
  if (!sexValid) allValid = false;

  // Expiration Date (21-27)
  const expirationDateRaw = line2.substring(21, 27);
  const expirationDateResult = parseDate(expirationDateRaw);
  const expirationDateValid = !expirationDateResult.error;
  details.push({
    label: 'Expiration date',
    field: 'expirationDate',
    value: expirationDateResult.value,
    valid: expirationDateValid,
    ranges: [{ line: 1, start: 21, end: 27 }],
    line: 1,
    start: 21,
    end: 27,
    error: expirationDateResult.error,
  });
  fields.expirationDate = expirationDateValid ? expirationDateResult.value : null;
  if (!expirationDateValid) allValid = false;

  // Expiration Date Check Digit (27)
  const expirationDateCheckDigit = line2.substring(27, 28);
  const expirationDateCheckValid = validateCheckDigit(expirationDateRaw, expirationDateCheckDigit);
  let expirationDateCheckError: string | undefined;
  if (!expirationDateCheckValid) {
    const calculated = calculateCheckDigit(expirationDateRaw);
    expirationDateCheckError = `invalid check digit: ${expirationDateCheckDigit}. Must be ${calculated}`;
  }
  details.push({
    label: 'Expiration date check digit',
    field: 'expirationDateCheckDigit',
    value: expirationDateCheckDigit,
    valid: expirationDateCheckValid,
    ranges: [{ line: 1, start: 27, end: 28 }],
    line: 1,
    start: 27,
    end: 28,
    error: expirationDateCheckError,
  });
  fields.expirationDateCheckDigit = expirationDateCheckValid ? expirationDateCheckDigit : null;
  if (!expirationDateCheckValid) allValid = false;

  // Personal Number (28-42)
  const personalNumberRaw = line2.substring(28, 42);
  const personalNumberResult = parsePersonalNumber(personalNumberRaw);
  details.push({
    label: 'Personal number',
    field: 'personalNumber',
    value: personalNumberResult.value,
    valid: true, // Personal number is optional, always valid
    ranges: [{ line: 1, start: 28, end: 42 }],
    line: 1,
    start: 28,
    end: 28 + personalNumberResult.value.length,
  });
  fields.personalNumber = personalNumberResult.value;

  // Personal Number Check Digit (42)
  const personalNumberCheckDigit = line2.substring(42, 43);
  const personalNumberCheckValid = validateCheckDigit(personalNumberRaw, personalNumberCheckDigit);
  let personalNumberCheckError: string | undefined;
  if (!personalNumberCheckValid) {
    const calculated = calculateCheckDigit(personalNumberRaw);
    personalNumberCheckError = `invalid check digit: ${personalNumberCheckDigit}. Must be ${calculated}`;
  }
  details.push({
    label: 'Personal number check digit',
    field: 'personalNumberCheckDigit',
    value: personalNumberCheckDigit,
    valid: personalNumberCheckValid,
    ranges: [{ line: 1, start: 42, end: 43 }],
    line: 1,
    start: 42,
    end: 43,
    error: personalNumberCheckError,
  });
  fields.personalNumberCheckDigit = personalNumberCheckValid ? personalNumberCheckDigit : null;
  if (!personalNumberCheckValid) allValid = false;

  // Composite Check Digit (43)
  // Validates: document number + check digit + birth date + check digit + expiration date + check digit + personal number + check digit
  const compositeCheckDigit = line2.substring(43, 44);
  const compositeInput = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
  const compositeCheckValid = validateCheckDigit(compositeInput, compositeCheckDigit);
  let compositeCheckError: string | undefined;
  if (!compositeCheckValid) {
    const calculated = calculateCheckDigit(compositeInput);
    compositeCheckError = `invalid check digit: ${compositeCheckDigit}. Must be ${calculated}`;
  }
  details.push({
    label: 'Composite check digit',
    field: 'compositeCheckDigit',
    value: compositeCheckDigit,
    valid: compositeCheckValid,
    ranges: [{ line: 1, start: 43, end: 44 }],
    line: 1,
    start: 43,
    end: 44,
    error: compositeCheckError,
  });
  fields.compositeCheckDigit = compositeCheckValid ? compositeCheckDigit : null;
  if (!compositeCheckValid) allValid = false;

  return {
    format: 'TD3',
    valid: allValid,
    corrected,
    fields,
    documentNumber: fields.documentNumber || null,
    details,
    lines: {
      line1: lines[0],
      line2: lines[1],
    },
  };
}

