import { parse } from './src/index.js';

const mrz: [string, string] = [
  'P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<',
  'C01X0006H1D<<6408125F1710319<<<<<<<<<<<<<<<0',
];

console.log('Line 1:', mrz[0]);
console.log('Line 2:', mrz[1]);
console.log('Line 2 length:', mrz[1].length);

const result = parse(mrz, { errorCorrection: true });

console.log('\nResult:');
console.log('Valid:', result.valid);
console.log('Corrected:', result.corrected);
console.log('Correction Metrics:', result.correctionMetrics);

// Count ambiguous chars manually
const AMBIGUOUS_CHARS = [
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

let count = 0;
const line2 = mrz[1];
for (let i = 0; i < line2.length; i++) {
  const char = line2[i];
  for (const [from, toList] of AMBIGUOUS_CHARS) {
    if (char === from) {
      count++;
      console.log(`Ambiguous char at ${i}: '${char}' -> [${toList.join(', ')}]`);
      break;
    }
  }
}

console.log(`\nTotal ambiguous chars: ${count}`);
console.log(`Expected combinations: ${Math.pow(2, count)}`);

