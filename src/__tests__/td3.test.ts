/**
 * Tests for TD3 MRZ parser
 * Based on test cases from @mrz library
 */

import { describe, it, expect } from 'vitest';
import { parseMRZ } from '../index.js';

describe('TD3 MRZ Parser', () => {
  it('should parse Utopia example passport', () => {
    const mrz: [string, string] = [
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
      'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
    ];

    const result = parseMRZ(mrz);

    expect(result.format).toBe('TD3');
    expect(result.documentNumber).toBe('L898902C3');
    expect(result.corrected).toBe(false);
    expect(result.lines.line1).toBe('P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<');
    expect(result.lines.line2).toBe('L898902C36UTO7408122F1204159ZE184226B<<<<<10');
    
    // Check all parsed fields
    expect(result.fields.documentCode).toBe('P');
    expect(result.fields.lastName).toBe('ERIKSSON');
    expect(result.fields.firstName).toBe('ANNA MARIA');
    expect(result.fields.documentNumber).toBe('L898902C3');
    expect(result.fields.documentNumberCheckDigit).toBe('6');
    expect(result.fields.birthDate).toBe('740812');
    expect(result.fields.birthDateCheckDigit).toBe('2');
    expect(result.fields.sex).toBe('female');
    expect(result.fields.expirationDate).toBe('120415');
    expect(result.fields.expirationDateCheckDigit).toBe('9');
    expect(result.fields.personalNumber).toBe('ZE184226B');
    expect(result.fields.personalNumberCheckDigit).toBe('1');
    expect(result.fields.compositeCheckDigit).toBe('0');
    
    // Note: UTO is accepted as a state code (format is valid)
    // Real country code validation would require maintaining a full ISO 3166 list
    expect(result.fields.issuingState).toBe('UTO');
    expect(result.fields.nationality).toBe('UTO');
    expect(result.valid).toBe(true);
  });

  it('should parse German passport example', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);

    expect(result.format).toBe('TD3');
    expect(result.valid).toBe(true);
    expect(result.documentNumber).toBe('C01X0006H');

    expect(result.fields).toMatchObject({
      documentCode: 'P',
      issuingState: 'D',
      lastName: 'MUSTERMANN',
      firstName: 'ERIKA',
      documentNumber: 'C01X0006H',
      documentNumberCheckDigit: '1',
      nationality: 'D',
      birthDate: '640812',
      birthDateCheckDigit: '5',
      sex: 'female',
      expirationDate: '171031',
      expirationDateCheckDigit: '9',
      personalNumber: '',
      personalNumberCheckDigit: '<',
      compositeCheckDigit: '0',
    });
  });

  it('should handle passport with no last name', () => {
    const mrz: [string, string] = [
      'P<IND<<FIRST<NAME<<<<<<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);

    expect(result.format).toBe('TD3');
    expect(result.valid).toBe(true);

    expect(result.fields.lastName).toBe('');
    expect(result.fields.firstName).toBe('FIRST NAME');
    expect(result.fields.issuingState).toBe('IND');
  });

  it('should parse Chinese passport (CHN PO)', () => {
    const mrz: [string, string] = [
      'POCHNABULIKEMU<<ABULA<<<<<<<<<<<<<<<<<<<<<<<',
      'E596593216CHN9701078M2510077LAKCLCLMMBKGG932',
    ];

    const result = parseMRZ(mrz);

    expect(result.format).toBe('TD3');
    expect(result.valid).toBe(true);

    expect(result.fields).toMatchObject({
      documentCode: 'PO',
      issuingState: 'CHN',
      lastName: 'ABULIKEMU',
      firstName: 'ABULA',
      documentNumber: 'E59659321',
      documentNumberCheckDigit: '6',
      nationality: 'CHN',
      birthDate: '970107',
      birthDateCheckDigit: '8',
      sex: 'male',
      expirationDate: '251007',
      expirationDateCheckDigit: '7',
      personalNumber: 'LAKCLCLMMBKGG9',
      personalNumberCheckDigit: '3',
      compositeCheckDigit: '2',
    });
  });

  it('should parse Chinese passport (CHN PT)', () => {
    const mrz: [string, string] = [
      'PTCHNCESHI<<YANGBEN<<<<<<<<<<<<<<<<<<<<<<<<<',
      'G622925996CHN8310291F1904220LCOCMKNENBPJB984',
    ];

    const result = parseMRZ(mrz);

    expect(result.format).toBe('TD3');
    expect(result.valid).toBe(true);

    expect(result.fields).toMatchObject({
      documentCode: 'PT',
      issuingState: 'CHN',
      lastName: 'CESHI',
      firstName: 'YANGBEN',
      documentNumber: 'G62292599',
      documentNumberCheckDigit: '6',
      nationality: 'CHN',
      birthDate: '831029',
      birthDateCheckDigit: '1',
      sex: 'female',
      expirationDate: '190422',
      expirationDateCheckDigit: '0',
      personalNumber: 'LCOCMKNENBPJB9',
      personalNumberCheckDigit: '8',
      compositeCheckDigit: '4',
    });
  });

  it('should throw error for invalid line length', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    expect(() => parseMRZ(mrz)).toThrow(/44 characters/);
  });

  it('should validate check digits correctly', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);

    // All check digits should be valid
    expect(result.fields.documentNumberCheckDigit).toBe('1');
    expect(result.fields.birthDateCheckDigit).toBe('5');
    expect(result.fields.expirationDateCheckDigit).toBe('9');
    expect(result.fields.compositeCheckDigit).toBe('0');
    
    const checkDigitDetails = result.details.filter(d => 
      d.field && d.field.includes('CheckDigit')
    );
    
    checkDigitDetails.forEach(detail => {
      expect(detail.valid).toBe(true);
    });
  });

  it('should handle male sex code', () => {
    const mrz: [string, string] = [
      'POCHNABULIKEMU<<ABULA<<<<<<<<<<<<<<<<<<<<<<<',
      'E596593216CHN9701078M2510077LAKCLCLMMBKGG932',
    ];

    const result = parseMRZ(mrz);
    expect(result.fields.sex).toBe('male');
  });

  it('should handle female sex code', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);
    expect(result.fields.sex).toBe('female');
  });

  it('should handle unspecified sex code', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125<1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);
    expect(result.fields.sex).toBe('unspecified');
  });

  it('should provide detailed information for each field', () => {
    const mrz: [string, string] = [
      'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
      'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
    ];

    const result = parseMRZ(mrz);

    expect(result.details).toHaveLength(15); // 15 fields total in TD3
    
    // Check that each detail has required properties
    result.details.forEach(detail => {
      expect(detail).toHaveProperty('label');
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('value');
      expect(detail).toHaveProperty('valid');
      expect(detail).toHaveProperty('ranges');
      expect(detail).toHaveProperty('line');
      expect(detail).toHaveProperty('start');
      expect(detail).toHaveProperty('end');
    });
  });

  describe('Error Correction', () => {
    it('should pad short lines when errorCorrection is enabled', () => {
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA',  // Only 22 characters
        'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
      ];

      // Should throw without error correction
      expect(() => parseMRZ(mrz)).toThrow(/44 characters/);

      // Should succeed with error correction
      const result = parseMRZ(mrz, { errorCorrection: true });
      expect(result.format).toBe('TD3');
      expect(result.corrected).toBe(true); // Padding was applied
      expect(result.fields.lastName).toBe('MUSTERMANN');
      expect(result.fields.firstName).toBe('ERIKA');
      expect(result.lines.line1).toBe('P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<');
      expect(result.lines.line1.length).toBe(44); // Padded to 44 chars
      
      // Check correction metrics
      expect(result.correctionMetrics).toBeDefined();
      expect(result.correctionMetrics?.attemptNumber).toBeGreaterThan(0);
      expect(result.correctionMetrics?.totalAttempts).toBeGreaterThan(0);
      expect(result.correctionMetrics?.totalCombinations).toBeGreaterThan(0);
      expect(result.correctionMetrics?.correctionApplied).toBe(true);
    });

    it('should correct ambiguous characters (O/0, I/1)', () => {
      // More realistic test with 2-3 OCR errors (typical real-world scenario)
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
        'C0IX0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',  // I instead of 1 at position 2
      ];

      const result = parseMRZ(mrz, { errorCorrection: true });
      
      // Should still be valid after correction
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(true); // Character corrections were applied
      expect(result.fields.documentNumber).toBe('C01X0006H');
      expect(result.lines.line2).toBe('C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0'); // Corrected line
      
      // Check correction metrics - multiple combinations should be tried
      expect(result.correctionMetrics).toBeDefined();
      expect(result.correctionMetrics?.attemptNumber).toBeGreaterThan(0);
      expect(result.correctionMetrics?.totalCombinations).toBeGreaterThan(1); // Multiple combos due to ambiguous chars
      expect(result.correctionMetrics?.correctionApplied).toBe(true);
    });

    it('should handle both padding and character correction', () => {
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA',  // Short line
        'C0IX0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',  // With 1 OCR error (I->1)
      ];

      const result = parseMRZ(mrz, { errorCorrection: true });
      
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(true); // Both padding and character corrections applied
      expect(result.fields.lastName).toBe('MUSTERMANN');
      expect(result.fields.firstName).toBe('ERIKA');
      expect(result.fields.documentNumber).toBe('C01X0006H');
      expect(result.lines.line1.length).toBe(44);
      expect(result.lines.line2.length).toBe(44);
    });

    it('should remove leading < characters', () => {
      const mrz: [string, string] = [
        '<<P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',  // Leading <<
        '<<C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
      ];

      const result = parseMRZ(mrz, { errorCorrection: true });
      
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(true); // Leading characters were removed
      expect(result.fields.documentCode).toBe('P');
      expect(result.fields.documentNumber).toBe('C01X0006H');
      expect(result.lines.line1).not.toMatch(/^</); // No leading <
      expect(result.lines.line2).not.toMatch(/^</); // No leading <
    });

    it('should truncate overly long lines', () => {
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<EXTRATEXT',  // Too long
        'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
      ];

      const result = parseMRZ(mrz, { errorCorrection: true });
      
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(true); // Truncation was applied
      expect(result.fields.lastName).toBe('MUSTERMANN');
      expect(result.fields.firstName).toBe('ERIKA');
      expect(result.lines.line1.length).toBe(44); // Truncated to 44 chars
    });

    it('should set corrected to false when no corrections needed', () => {
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
        'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
      ];

      const result = parseMRZ(mrz, { errorCorrection: true });
      
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(false); // No corrections were needed
      expect(result.lines.line1).toBe('P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<');
      expect(result.lines.line2).toBe('C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0');
      
      // Should still have metrics showing first attempt succeeded
      expect(result.correctionMetrics).toBeDefined();
      expect(result.correctionMetrics?.attemptNumber).toBe(1);
      expect(result.correctionMetrics?.totalAttempts).toBe(1);
      expect(result.correctionMetrics?.totalCombinations).toBe(1);
      expect(result.correctionMetrics?.correctionApplied).toBe(false);
    });

    it('should not have correctionMetrics when errorCorrection is disabled', () => {
      const mrz: [string, string] = [
        'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
        'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
      ];

      const result = parseMRZ(mrz); // No error correction
      
      expect(result.valid).toBe(true);
      expect(result.corrected).toBe(false);
      expect(result.correctionMetrics).toBeUndefined(); // No metrics when errorCorrection is off
    });
  });
});

