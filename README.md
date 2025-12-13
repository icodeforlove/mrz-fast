# MRZ Fast

A high-performance, **zero-dependency** TypeScript library for parsing and generating passport MRZ codes (TD3 format).

Supports the **ICAO 9303 TD3 specification** - the standard machine-readable zone format used in international passports.

![MRZ Format Explained](https://i.ibb.co/0RM2v68p/mrz-explained.jpg)

## Features

- **Zero Dependencies**: Pure TypeScript, no external packages required
- **Passport-Only**: Focused exclusively on TD3 passport format (ICAO 9303)
- **Fast**: >200,000 parses/second with optimized algorithms
- **Validation**: Full check digit validation and field-level error reporting
- **Error Correction**: Built-in OCR/AI error correction for common mistakes (O→0, I→1, S→5, etc.)
- **Parse & Create**: Both parse MRZ strings and generate valid MRZ from data
- **Type-safe**: Full TypeScript support with strict types

## Installation

```bash
npm install mrz-fast
```

## Quick Start

### Parsing MRZ

```typescript
import { parseMRZ } from 'mrz-fast';

const mrz: [string, string] = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
];

const result = parseMRZ(mrz);
```

```json
{
  "valid": true,
  "fields": {
    "firstName": "ANNA MARIA",
    "lastName": "ERIKSSON",
    "documentNumber": "L898902C3",
    "nationality": "UTO",
    "birthDate": "740812",
    "sex": "female"
  }
}
```

### Creating MRZ

```typescript
import { createMRZ } from 'mrz-fast';

const data = {
  documentCode: 'P',
  issuingState: 'UTO',
  lastName: 'ERIKSSON',
  firstName: 'ANNA MARIA',
  documentNumber: 'L898902C3',
  nationality: 'UTO',
  birthDate: { year: 1974, month: 8, day: 12 },
  sex: 'female',
  expirationDate: { year: 2012, month: 4, day: 15 },
  personalNumber: 'ZE184226B'  // optional
};

const [line1, line2] = createMRZ(data);
```

```json
[
  "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10"
]
```

### Error Correction for OCR/AI

One of the most powerful features is automatic error correction, especially useful for:
- **OCR systems** that may confuse similar-looking characters
- **AI models** that generate MRZ codes with common mistakes
- **Damaged or unclear scans** of physical documents

```typescript
import { parseMRZ } from 'mrz-fast';

// MRZ with common OCR/AI errors: O→0, I→1 confusion
const messyMrz: [string, string] = [
  'P<UTOERIKSSON<<ANNA<MARIA',  // Too short (will be padded)
  'L8989O2C36UTO74O8I22FI2O4I59ZEI84226B<<<<<IO'  // Multiple O/0 and I/1 errors
];

const result = parseMRZ(messyMrz, { errorCorrection: true });
```

```json
{
  "valid": true,
  "corrected": true,
  "fields": {
    "documentNumber": "L898902C3"
  },
  "correctionMetrics": {
    "attemptNumber": 42,
    "totalAttempts": 42,
    "totalCombinations": 16384,
    "correctionApplied": true
  }
}
```

**What error correction handles:**
- **Character confusion**: O↔0, I↔1↔l, S↔5, B↔8, Z↔2, G↔6
- **Length issues**: Automatically pads short lines or truncates long ones
- **Leading padding**: Removes invalid leading `<` characters
- **Smart search**: Tests up to 2 million combinations, trying most likely fixes first

This makes the library extremely robust for real-world applications where input quality varies.

## API Reference

### `parseMRZ(mrz, options?)`

Parses a TD3 passport MRZ.

**Parameters:**
- `mrz`: `[string, string]` - Tuple of 2 MRZ lines
- `options`: Optional settings
  - `errorCorrection?: boolean` - Enable OCR/AI error correction (default: `false`)

**Returns:** `ParseResult` with parsed fields and validation status

### `createMRZ(data)`

Creates a valid TD3 passport MRZ.

**Parameters:**
- `data`: Object with required fields:
  - `documentCode`: string (e.g., 'P', 'PA')
  - `issuingState`: string (3-letter country code)
  - `lastName`: string
  - `firstName`: string
  - `documentNumber`: string
  - `nationality`: string (3-letter country code)
  - `birthDate`: `{ year: number, month: number, day: number }`
  - `sex`: `'male' | 'female' | 'unspecified'`
  - `expirationDate`: `{ year: number, month: number, day: number }`
  - `personalNumber?`: string (optional)

**Returns:** `[string, string]` - Tuple of two 44-character MRZ lines with correct check digits

## Available Fields

```typescript
interface ParseResult {
  format: 'TD3';
  valid: boolean;           // Overall validation status
  corrected: boolean;       // Whether corrections were applied
  fields: {
    documentCode: string | null;
    issuingState: string | null;
    lastName: string | null;
    firstName: string | null;
  documentNumber: string | null;
    nationality: string | null;
    birthDate: string | null;        // YYMMDD
    sex: string | null;              // 'male', 'female', or 'unspecified'
    expirationDate: string | null;   // YYMMDD
    personalNumber: string | null;
    // ... and check digits
  };
  lines: {
    line1: string;  // Actual MRZ line 1 (corrected if errorCorrection was used)
    line2: string;  // Actual MRZ line 2 (corrected if errorCorrection was used)
  };
  details: Details[];  // Per-field validation details
  correctionMetrics?: {  // Only when errorCorrection: true
    attemptNumber: number;
    totalAttempts: number;
    totalCombinations: number;
    correctionApplied: boolean;
  };
}
```

## Performance

- **Clean parsing**: ~0.005ms per parse (>200,000 ops/sec)
- **With error correction**: ~0.006-0.009ms per parse (>100,000 ops/sec)
- **Batch processing**: 156,760+ MRZs/second

Optimizations:
- Precomputed lookup tables
- Smart ordering (tries likely fixes first)
- Fast check digit validation
- Minimal memory allocations

## TD3 Passport Format (ICAO 9303)

This library **only supports TD3 format** - the two-line machine-readable zone used in international passports according to the ICAO 9303 specification.

TD3 format consists of 2 lines of 44 characters each:

**Line 1:**
- Document code (2 chars): P, PA, PO, PT
- Issuing state (3 chars): Country code
- Names (39 chars): LASTNAME<<FIRSTNAME

**Line 2:**
- Document number (9 chars) + check digit
- Nationality (3 chars)
- Birth date (6 chars, YYMMDD) + check digit
- Sex (1 char): M, F, or <
- Expiration date (6 chars, YYMMDD) + check digit
- Personal number (14 chars, optional) + check digit
- Composite check digit

Check digits use ICAO 9303 algorithm with weights [7, 3, 1].

## Development

```bash
npm install      # Install dependencies
npm run build    # Build TypeScript
npm test         # Run tests
```

## License

MIT

## Credits

Inspired by the excellent [@mrz](https://github.com/ml-lab/mrz) library by Zakodium.