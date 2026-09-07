import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRED_DATA_DIR = path.resolve(__dirname, '../CredData');
const META_DIR = path.join(CRED_DATA_DIR, 'meta');
const DATA_DIR = path.join(CRED_DATA_DIR, 'data');
const OUT_FILE = path.resolve(__dirname, '../src/lib/training-data.js');

const LABEL_MAP = {
  T: 'LEAK_CONFIRMED',
  X: 'TEST_DATA',
  F: 'FALSE_POSITIVE'
};

const CONFIDENCE_DEFAULT = {
  LEAK_CONFIRMED: 92,
  TEST_DATA: 40,
  FALSE_POSITIVE: 18
};

const MAX_PER_LABEL = 400;

const csvFiles = fs.readdirSync(META_DIR).filter(f => f.endsWith('.csv'));
console.log(`Reading ${csvFiles.length} metadata CSVs...`);

const seen = new Set();
const samples = [];
let skipped = 0;

function readLinesOnce(fileCache, filePath) {
  if (!fileCache.has(filePath)) {
    const resolved = path.join(CRED_DATA_DIR, filePath);
    if (!fs.existsSync(resolved)) {
      fileCache.set(filePath, null);
      return null;
    }
    try {
      fileCache.set(filePath, fs.readFileSync(resolved, 'utf8').split(/\r?\n/));
    } catch {
      fileCache.set(filePath, null);
    }
  }
  return fileCache.get(filePath);
}

for (const csvFile of csvFiles) {
  const rows = fs.readFileSync(path.join(META_DIR, csvFile), 'utf8')
    .trim()
    .split('\n')
    .slice(1);

  const fileCache = new Map();

  for (const row of rows) {
    const cols = row.split(',');
    const filePath = cols[4];
    const lineStart = parseInt(cols[5], 10);
    const lineEnd = parseInt(cols[6], 10);
    const groundTruth = cols[7];
    const category = cols[12] || '';

    const label = LABEL_MAP[groundTruth];
    if (!label) continue;

    const lines = readLinesOnce(fileCache, filePath);
    if (!lines) {
      skipped++;
      continue;
    }

    const startIdx = lineStart - 1;
    if (startIdx < 0 || startIdx >= lines.length) {
      skipped++;
      continue;
    }

    let lineText = lines[startIdx];
    if (lineEnd > lineStart) {
      const extra = lines.slice(startIdx + 1, lineEnd);
      lineText = [lineText, ...extra].join(' ');
    }

    const text = lineText.trim();
    if (!text || text.length < 3) {
      skipped++;
      continue;
    }

    const key = `${label}:${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    samples.push({
      text,
      label,
      confidence: CONFIDENCE_DEFAULT[label],
      category
    });
  }
}

const byLabel = {};
for (const s of samples) {
  (byLabel[s.label] = byLabel[s.label] || []).push(s);
}

console.log('Extracted per label:');
for (const label of Object.keys(byLabel)) {
  console.log(`  ${label}: ${byLabel[label].length}`);
}

const balanced = [];
for (const label of Object.keys(byLabel)) {
  const pool = byLabel[label];
  const step = Math.max(1, Math.floor(pool.length / MAX_PER_LABEL));
  let picked = 0;
  for (let i = 0; i < pool.length && picked < MAX_PER_LABEL; i += step) {
    balanced.push(pool[i]);
    picked++;
  }
}

console.log(`Balanced total: ${balanced.length} (cap ${MAX_PER_LABEL}/label)`);
console.log(`Skipped (missing files / invalid): ${skipped}`);

const fileContent = `// Auto-generated from CredData dataset (Samsung Credential Dataset).
// Ground truth: T -> LEAK_CONFIRMED, X -> TEST_DATA, F -> FALSE_POSITIVE.
// Source: CredData/meta/*.csv + CredData/data/*.

export const ML_TRAINING_DATA = ${JSON.stringify(balanced, null, 2)};
`;

fs.writeFileSync(OUT_FILE, fileContent, 'utf8');
console.log(`Written: ${OUT_FILE}`);
