/**
 * Tests for MRZ creation (create.ts)
 */

import { describe, it, expect } from 'vitest';
import { createMRZ } from '../createMRZ.js';
import { parseMRZ } from '../index.js';
import type { CreateMRZInput, ParseResult } from '../types.js';

/**
 * Helper function to assert validity and log errors if invalid
 */
function expectValid(result: ParseResult) {
  if (!result.valid) {
    const errors = result.details.filter(d => !d.valid);
    console.log('Validation failed:', errors.map(e => `${e.label}: ${e.error || 'invalid'}`).join(', '));
  }
  expect(result.valid).toBe(true);
}

describe('createMRZ', () => {
  describe('basic functionality', () => {
    it('should create a valid MRZ with all fields', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'UTO',
        lastName: 'ERIKSSON',
        firstName: 'ANNA MARIA',
        documentNumber: 'L898902C3',
        nationality: 'UTO',
        birthDate: { year: 1974, month: 8, day: 12 },
        sex: 'female',
        expirationDate: { year: 2012, month: 4, day: 15 },
        personalNumber: 'ZE184226B',
      };

      const [line1, line2] = createMRZ(input);

      expect(line1).toBe('P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<');
      expect(line2).toBe('L898902C36UTO7408122F1204159ZE184226B<<<<<10');
      expect(line1.length).toBe(44);
      expect(line2.length).toBe(44);

      // Verify it parses correctly
      const result = parseMRZ([line1, line2]);
      expectValid(result);
      expect(result.fields.documentNumber).toBe('L898902C3');
      expect(result.fields.lastName).toBe('ERIKSSON');
      expect(result.fields.firstName).toBe('ANNA MARIA');
    });

    it('should create valid MRZ without personal number', () => {
      const input: CreateMRZInput = {
        documentCode: 'PA',
        issuingState: 'USA',
        lastName: 'SMITH',
        firstName: 'JOHN',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 12, day: 31 },
        sex: 'male',
        expirationDate: { year: 2025, month: 6, day: 15 },
      };

      const [line1, line2] = createMRZ(input);

      expect(line1.length).toBe(44);
      expect(line2.length).toBe(44);

      const result = parseMRZ([line1, line2]);
      expectValid(result);
      expect(result.fields.sex).toBe('male');
      expect(result.fields.personalNumber).toBe('');
    });

    it('should create valid MRZ with empty personal number', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'GBR',
        lastName: 'DOE',
        firstName: 'JANE',
        documentNumber: 'AB123456',
        nationality: 'GBR',
        birthDate: { year: 2000, month: 1, day: 1 },
        sex: 'female',
        expirationDate: { year: 2030, month: 12, day: 31 },
        personalNumber: '',
      };

      const [line1, line2] = createMRZ(input);

      expect(line1.length).toBe(44);
      expect(line2.length).toBe(44);

      const result = parseMRZ([line1, line2]);
      expectValid(result);
    });
  });

  describe('sex field', () => {
    it('should format male sex correctly', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'MALE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [, line2] = createMRZ(input);
      expect(line2[20]).toBe('M');

      const result = parseMRZ([createMRZ(input)[0], line2]);
      expect(result.fields.sex).toBe('male');
    });

    it('should format female sex correctly', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'FEMALE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'female',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [, line2] = createMRZ(input);
      expect(line2[20]).toBe('F');

      const result = parseMRZ([createMRZ(input)[0], line2]);
      expect(result.fields.sex).toBe('female');
    });

    it('should format unspecified sex correctly', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'UNSPEC',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'unspecified',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [, line2] = createMRZ(input);
      expect(line2[20]).toBe('<');

      const result = parseMRZ([createMRZ(input)[0], line2]);
      expect(result.fields.sex).toBe('unspecified');
    });
  });

  describe('date formatting', () => {
    it('should format dates correctly in YYMMDD format', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'DATE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1985, month: 5, day: 20 },
        sex: 'male',
        expirationDate: { year: 2028, month: 10, day: 31 },
      };

      const [, line2] = createMRZ(input);

      // Birth date at positions 13-18
      expect(line2.substring(13, 19)).toBe('850520');
      // Expiration date at positions 21-26
      expect(line2.substring(21, 27)).toBe('281031');

      const result = parseMRZ(createMRZ(input));
      expect(result.valid).toBe(true);
      expect(result.fields.birthDate).toBe('850520');
      expect(result.fields.expirationDate).toBe('281031');
    });

    it('should handle year 2000+ correctly (use last 2 digits)', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'Y2K',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 2000, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2025, month: 12, day: 31 },
      };

      const [, line2] = createMRZ(input);

      expect(line2.substring(13, 19)).toBe('000101');
      expect(line2.substring(21, 27)).toBe('251231');
    });

    it('should pad single-digit months and days with zeros', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'PAD',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 3, day: 5 },
        sex: 'male',
        expirationDate: { year: 2030, month: 9, day: 7 },
      };

      const [, line2] = createMRZ(input);

      expect(line2.substring(13, 19)).toBe('900305');
      expect(line2.substring(21, 27)).toBe('300907');
    });
  });

  describe('name formatting', () => {
    it('should format names with spaces correctly', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'FRA',
        lastName: 'DE LA CRUZ',
        firstName: 'MARIA JOSE',
        documentNumber: '123456789',
        nationality: 'FRA',
        birthDate: { year: 1985, month: 5, day: 20 },
        sex: 'female',
        expirationDate: { year: 2028, month: 10, day: 10 },
      };

      const [line1] = createMRZ(input);

      expect(line1).toContain('DE<LA<CRUZ<<MARIA<JOSE');
      expect(line1.length).toBe(44);

      const result = parseMRZ(createMRZ(input));
      expect(result.fields.lastName).toBe('DE LA CRUZ');
      expect(result.fields.firstName).toBe('MARIA JOSE');
    });

    it('should handle very long names by truncating', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'VERYLONGLASTNAMETHATEXCEEDSLIMIT',
        firstName: 'VERYLONGFIRSTNAMETHATEXCEEDSLIMIT',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [line1] = createMRZ(input);

      expect(line1.length).toBe(44);
      // Should be truncated but still parseable
      const result = parseMRZ(createMRZ(input));
      expect(result.valid).toBe(true);
    });

    it('should handle single name (no first name)', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'IDN',
        lastName: 'SUKARNO',
        firstName: '',
        documentNumber: '123456789',
        nationality: 'IDN',
        birthDate: { year: 1970, month: 6, day: 15 },
        sex: 'male',
        expirationDate: { year: 2030, month: 6, day: 15 },
      };

      const [line1] = createMRZ(input);

      expect(line1).toContain('SUKARNO<<');
      expect(line1.length).toBe(44);

      const result = parseMRZ(createMRZ(input));
      expect(result.valid).toBe(true);
      expect(result.fields.lastName).toBe('SUKARNO');
      expect(result.fields.firstName).toBe('');
    });
  });

  describe('document codes', () => {
    it('should handle P document code', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'CODE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [line1] = createMRZ(input);
      expect(line1.substring(0, 2)).toBe('P<');
    });

    it('should handle PA document code', () => {
      const input: CreateMRZInput = {
        documentCode: 'PA',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'CODE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [line1] = createMRZ(input);
      expect(line1.substring(0, 2)).toBe('PA');
    });

    it('should handle PT document code', () => {
      const input: CreateMRZInput = {
        documentCode: 'PT',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'CODE',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [line1] = createMRZ(input);
      expect(line1.substring(0, 2)).toBe('PT');
    });

    it('should handle PC document code', () => {
      const input: CreateMRZInput = {
        documentCode: 'PC',
        issuingState: 'USA',
        lastName: 'SMITH',
        firstName: 'JOHN ROBERT',
        documentNumber: 'A12345678',
        nationality: 'USA',
        birthDate: { year: 1989, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2025, month: 12, day: 31 },
      };

      const [line1, line2] = createMRZ(input);
      expect(line1.substring(0, 2)).toBe('PC');
      expect(line1).toBe('PCUSASMITH<<JOHN<ROBERT<<<<<<<<<<<<<<<<<<<<<');
      expect(line2).toBe('A123456784USA8901011M2512314<<<<<<<<<<<<<<08');

      // Verify it parses correctly
      const result = parseMRZ([line1, line2]);
      expectValid(result);
      expect(result.fields.documentCode).toBe('PC');
      expect(result.fields.lastName).toBe('SMITH');
      expect(result.fields.firstName).toBe('JOHN ROBERT');
    });
  });

  describe('check digits', () => {
    it('should calculate all check digits correctly', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'UTO',
        lastName: 'ERIKSSON',
        firstName: 'ANNA MARIA',
        documentNumber: 'L898902C3',
        nationality: 'UTO',
        birthDate: { year: 1974, month: 8, day: 12 },
        sex: 'female',
        expirationDate: { year: 2012, month: 4, day: 15 },
        personalNumber: 'ZE184226B',
      };

      const [line1, line2] = createMRZ(input);
      const result = parseMRZ([line1, line2]);

      // All check digits should be valid
      const checkDigitDetails = result.details.filter(d => d.label.includes('check'));
      expect(checkDigitDetails.every(d => d.valid)).toBe(true);

      // Verify specific check digits
      expect(result.fields.documentNumberCheckDigit).toBe('6');
      expect(result.fields.birthDateCheckDigit).toBe('2');
      expect(result.fields.expirationDateCheckDigit).toBe('9');
      expect(result.fields.personalNumberCheckDigit).toBe('1');
      expect(result.fields.compositeCheckDigit).toBe('0');
    });

    it('should calculate composite check digit correctly with no personal number', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'SMITH',
        firstName: 'JOHN',
        documentNumber: 'AB1234567',
        nationality: 'USA',
        birthDate: { year: 1990, month: 6, day: 15 },
        sex: 'male',
        expirationDate: { year: 2030, month: 12, day: 31 },
      };

      const [line1, line2] = createMRZ(input);
      const result = parseMRZ([line1, line2]);

      expect(result.valid).toBe(true);
      expect(result.fields.compositeCheckDigit).not.toBeNull();
    });
  });

  describe('round-trip compatibility', () => {
    it('should create MRZ that parses back to the same data', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'CAN',
        lastName: 'NGUYEN',
        firstName: 'TRAN VAN',
        documentNumber: 'CA123456',
        nationality: 'CAN',
        birthDate: { year: 1988, month: 3, day: 25 },
        sex: 'male',
        expirationDate: { year: 2029, month: 8, day: 10 },
        personalNumber: 'ABC123',
      };

      const [line1, line2] = createMRZ(input);
      const result = parseMRZ([line1, line2]);

      expect(result.valid).toBe(true);
      expect(result.fields.documentCode).toBe('P');
      expect(result.fields.issuingState).toBe('CAN');
      expect(result.fields.lastName).toBe('NGUYEN');
      expect(result.fields.firstName).toBe('TRAN VAN');
      expect(result.fields.documentNumber).toBe('CA123456');
      expect(result.fields.nationality).toBe('CAN');
      expect(result.fields.birthDate).toBe('880325');
      expect(result.fields.sex).toBe('male');
      expect(result.fields.expirationDate).toBe('290810');
      expect(result.fields.personalNumber).toBe('ABC123');
    });

    it('should handle multiple round-trips consistently', () => {
      const input: CreateMRZInput = {
        documentCode: 'PA',
        issuingState: 'AUS',
        lastName: 'WILLIAMS',
        firstName: 'SARAH JANE',
        documentNumber: 'AU9876543',
        nationality: 'AUS',
        birthDate: { year: 1995, month: 11, day: 5 },
        sex: 'female',
        expirationDate: { year: 2035, month: 2, day: 28 },
        personalNumber: 'XYZ789',
      };

      // First round-trip
      const [line1_1, line2_1] = createMRZ(input);
      const result1 = parseMRZ([line1_1, line2_1]);

      // Second round-trip (parsing should give same lines)
      expect(result1.valid).toBe(true);
      expect(result1.lines.line1).toBe(line1_1);
      expect(result1.lines.line2).toBe(line2_1);
    });
  });

  describe('field padding', () => {
    it('should pad short document numbers with <', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'SHORT',
        documentNumber: 'A1',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
      };

      const [, line2] = createMRZ(input);
      expect(line2.substring(0, 9)).toBe('A1<<<<<<<');

      const result = parseMRZ(createMRZ(input));
      expect(result.valid).toBe(true);
      expect(result.fields.documentNumber).toBe('A1');
    });

    it('should pad short personal numbers with <', () => {
      const input: CreateMRZInput = {
        documentCode: 'P',
        issuingState: 'USA',
        lastName: 'TEST',
        firstName: 'SHORT',
        documentNumber: '123456789',
        nationality: 'USA',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
        personalNumber: 'X1',
      };

      const [, line2] = createMRZ(input);
      expect(line2.substring(28, 42)).toBe('X1<<<<<<<<<<<<');

      const result = parseMRZ(createMRZ(input));
      expect(result.valid).toBe(true);
      expect(result.fields.personalNumber).toBe('X1');
    });
  });

  describe('uppercase conversion', () => {
    it('should convert lowercase input to uppercase', () => {
      const input: CreateMRZInput = {
        documentCode: 'p',
        issuingState: 'usa',
        lastName: 'smith',
        firstName: 'john',
        documentNumber: 'ab123456',
        nationality: 'usa',
        birthDate: { year: 1990, month: 1, day: 1 },
        sex: 'male',
        expirationDate: { year: 2030, month: 1, day: 1 },
        personalNumber: 'xyz',
      };

      const [line1, line2] = createMRZ(input);

      expect(line1).toContain('SMITH');
      expect(line1).toContain('JOHN');
      expect(line2).toContain('AB123456');
      expect(line2).toContain('XYZ');

      const result = parseMRZ([line1, line2]);
      expect(result.valid).toBe(true);
    });
  });
});

