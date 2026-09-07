import { analyzeContext } from '../src/lib/ai-engine.js';

const ctx = {
  filePath: 'config/prod/aws.js',
  matchedValue: 'AKIAZQ5X4Y2N7Q9P8R3W',
  lineContent: 'AWS_ACCESS_KEY = "AKIAZQ5X4Y2N7Q9P8R3W"',
  allLines: ['const AWS_ACCESS_KEY = "AKIAZQ5X4Y2N7Q9P8R3W";'],
  lineIndex: 0,
  secretType: 'AWS Client Access Key'
};

const r = analyzeContext(ctx);
console.log('FINAL:', r.decision, r.confidence + '%');
console.log('engine:', r.engine);
console.log('reason:', r.reason);
for (const s of r.signalDetails) {
  console.log('  ', s.name, '=>', s.score, '|', s.evidence);
}
