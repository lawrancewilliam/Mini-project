import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Builds src/lib/reference-data.js — a catalog of exact leaked VALUES extracted from
// the CredData dataset's T-labeled (real leak) lines, using the ValueStart/ValueEnd
// spans recorded in each meta CSV row. Used at scan time to cross-reference findings.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const META_DIR = path.resolve(__dirname, '../CredData/meta');
const DATA_DIR = path.resolve(__dirname, '../CredData/data');
const OUT_FILE = path.resolve(__dirname, '../src/lib/reference-data.js');

const MAX_VALUES = 12000;

const PLACEHOLDER_VALUE = /^(secret|pass|password|passw0rd|sa|changeme|change_me|test|example|your[_-]?(key|token|secret|password)|my_password|dummy|dummy_password|to_be_filled|123456|qwerty|admin|x{3,}|\*{3,}|null|undefined|true|false)$/i;

function normalize(value) {
  let v = value.trim();
  v = v.replace(/^(['"])(.*)\1$/, '$2');
  v = v.replace(/\s+/g, ' ');
  return v;
}

const fileCache = new Map();
function readLines(filePath) {
  if (!fileCache.has(filePath)) {
    const resolved = path.join(DATA_DIR, filePath.replace(/\\/g, '/'));
    try {
      fileCache.set(filePath, fs.readFileSync(resolved, 'utf8').split(/\r?\n/));
    } catch {
      fileCache.set(filePath, null);
    }
  }
  return fileCache.get(filePath);
}

const exact = new Set();
const headTail = new Set();
let totalRows = 0;
let skipped = 0;

for (const metaFile of fs.readdirSync(META_DIR).filter(f => f.endsWith('.csv'))) {
  const rows = fs.readFileSync(path.join(META_DIR, metaFile), 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const cols = row.split(',');
    const groundTruth = cols[7];
    if (groundTruth !== 'T') continue;
    totalRows++;

    const filePath = cols[4].replace(/^data\//, '');
    const lineStart = parseInt(cols[5], 10);
    const lineEnd = parseInt(cols[6], 10);
    const valueStart = cols[8];
    const valueEnd = cols[9];
    if (lineStart !== lineEnd || !valueStart || !valueEnd) {
      skipped++;
      continue;
    }

    const lines = readLines(filePath);
    if (!lines) {
      skipped++;
      continue;
    }
    const idx = lineStart - 1;
    if (idx < 0 || idx >= lines.length) {
      skipped++;
      continue;
    }
    const line = lines[idx];
    const vs = parseInt(valueStart, 10);
    const ve = parseInt(valueEnd, 10);
    if (vs < 0 || ve <= vs || vs > line.length) {
      skipped++;
      continue;
    }

    let value = line.substring(vs, Math.min(ve, line.length));
    value = normalize(value);
    if (value.length < 4 || value.length > 80) {
      skipped++;
      continue;
    }
    if (PLACEHOLDER_VALUE.test(value)) {
      skipped++;
      continue;
    }

    exact.add(value);
  }
}

const exactArr = [...exact];
// Deterministic cap: keep a stable spread rather than arbitrary first-N
let picked;
if (exactArr.length <= MAX_VALUES) {
  picked = exactArr;
} else {
  const step = exactArr.length / MAX_VALUES;
  picked = [];
  for (let i = 0; i < exactArr.length && picked.length < MAX_VALUES; i += step) {
    picked.push(exactArr[Math.floor(i)]);
  }
}
const pickedSet = new Set(picked);
for (const v of picked) {
  if (v.length >= 24) {
    headTail.add(`${v.slice(0, 12)}|${v.slice(-12)}`);
  }
}
const headTailArr = [...headTail];

console.log(`T rows scanned: ${totalRows}, skipped: ${skipped}`);
console.log(`Distinct values: ${exactArr.length}, head/tail fingerprints: ${headTailArr.length}`);
console.log(`Bundled values: ${picked.length}`);

const fileContent = `// Auto-generated from CredData dataset (Samsung Credential Dataset).
// Exact leaked VALUES from T-labeled (real leak) lines. Regenerate with:
//   node scripts/build-reference-data.js
// Used by the AI engine as a dataset reference-match signal during scans.

export const REFERENCE_DATA = {
  exact: ${JSON.stringify(picked)},
  headTail: ${JSON.stringify(headTailArr)}
};
`;

fs.writeFileSync(OUT_FILE, fileContent, 'utf8');
console.log(`Written: ${OUT_FILE} (${(Buffer.byteLength(fileContent) / 1024).toFixed(0)} KB)`);
