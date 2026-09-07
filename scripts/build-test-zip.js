import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRED_DATA_DIR = path.resolve(__dirname, '../CredData');
const META_DIR = path.join(CRED_DATA_DIR, 'meta');
const DATA_DIR = path.join(CRED_DATA_DIR, 'data');
const OUT_FILE = path.resolve(__dirname, '../static/test-data.zip');

// Mirror of the 25 detection rules in src/lib/state.svelte.js
const RULES = [
  { name: 'AWS Client Access Key', regex: /\b(AKIA[0-9A-Z]{16})\b/g },
  { name: 'Google API Key', regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g },
  { name: 'OpenAI API Key', regex: /\b(sk-[a-zA-Z0-9]{48})\b/g },
  { name: 'GitHub OAuth Token', regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36})\b/g },
  { name: 'SSH/RSA Private Key', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g },
  { name: 'PAN Card Number', regex: /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g },
  { name: 'Aadhaar Card Number', regex: /\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/g },
  { name: 'Credit Card Number', regex: /\b((?:\d{4}[- ]?){3}\d{4})\b/g },
  { name: 'Database Password', regex: /\b(password|pass|passwd|db_password|db_pass)\s*=[ \t]*['"]([^'"]+)['"]/ig },
  { name: 'JWT Secret Key', regex: /\b(jwt_secret|jwt_key|token_secret|session_secret)\s*=[ \t]*['"]([^'"]+)['"]/ig },
  { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.(?:com|invalid)\/services\/[T0-9a-zA-Z_]+\/[B0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/g },
  { name: 'Stripe API Key', regex: /\b((sk|rk)_(live|test)_[0-9a-zA-Z]{16,24})\b/g },
  { name: 'Telegram Bot Token', regex: /\b(\d{8,10}:[A-Za-z0-9_-]{35})\b/g },
  { name: 'Discord Webhook URL', regex: /https:\/\/discord(app)?\.com\/api\/webhooks\/\d{16,19}\/[A-Za-z0-9_-]{60,}/g },
  { name: 'Slack API Token', regex: /\b(xox[baprs]-[0-9A-Za-z-]{10,62})\b/g },
  { name: 'Twilio API Key', regex: /\b(SK[0-9a-fA-F]{32})\b/g },
  { name: 'Azure Storage Account Key', regex: /\b(?:AccountKey|SharedAccessKey)=([a-zA-Z0-9+/=]{80,})\b/g },
  { name: 'Google OAuth Client Secret', regex: /\b(GOCSPX-[A-Za-z0-9_-]{20,})\b/g },
  { name: 'MongoDB Connection String', regex: /\b(mongodb(\+srv)?:\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g },
  { name: 'PostgreSQL/MySQL Connection URL', regex: /\b((postgres|postgresql|mysql):\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g },
  { name: 'GitLab Personal Access Token', regex: /\b(glpat-[A-Za-z0-9_-]{20})\b/g },
  { name: 'npm Access Token', regex: /\b(npm_[A-Za-z0-9]{36})\b/g },
  { name: 'HashiCorp Vault Token', regex: /\b(hvs\.[A-Za-z0-9_-]{24,})\b/g },
  { name: 'Email Address PII', regex: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+)\b/g },
  { name: 'Phone Number PII', regex: /\b((?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})\b/g }
];

// Build a map: dataDir-relative path -> Set of line numbers labeled in meta
console.log('Loading ground-truth labels from meta...');
const linesByFile = new Map(); // path -> Map(gt -> Set of line numbers)
const metaFiles = fs.readdirSync(META_DIR).filter(f => f.endsWith('.csv'));
for (const metaFile of metaFiles) {
  const rows = fs.readFileSync(path.join(META_DIR, metaFile), 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const cols = row.split(',');
    const filePath = cols[4].replace(/^data\//, '');
    const lineStart = parseInt(cols[5], 10);
    const gt = cols[7];
    if (!linesByFile.has(filePath)) linesByFile.set(filePath, new Map());
    const gtSet = linesByFile.get(filePath).get(gt) || new Set();
    gtSet.add(lineStart);
    linesByFile.get(filePath).set(gt, gtSet);
  }
}
console.log(`Files with labeled lines: ${linesByFile.size}`);

const supportedExt = ['.py', '.java', '.js', '.ts', '.php', '.cs', '.html', '.css', '.json', '.xml', '.env', '.ini', '.properties'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const allFiles = fs.readdirSync(DATA_DIR, { recursive: true }).filter(p => {
  const ext = path.extname(p).toLowerCase();
  if (!supportedExt.includes(ext)) return false;
  const full = path.join(DATA_DIR, p);
  const stat = fs.statSync(full);
  return stat.size <= MAX_FILE_BYTES;
});

function entropy(str) {
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let e = 0;
  for (const ch in freq) {
    const p = freq[ch] / str.length;
    e -= p * Math.log2(p);
  }
  return e;
}

// PII rules are noisy on obvious config keys (Google services JSON, AWS ARN account IDs).
// Mirrors src/lib/state.svelte.js so scoring matches the real scan.
function isPiiConfigKey(secretType, line) {
  if (secretType !== 'Aadhaar Card Number' && secretType !== 'Phone Number PII') return false;
  return /["']?(project_number|mobilesdk_app_id|client_id)["']?\s*[:=]\s*["']?/i.test(line) ||
    /arn:aws:[^"\s]*\d{12}/.test(line);
}

const PLACEHOLDER_VALUE = /^(secret|pass|password|passw0rd|sa|changeme|change_me|test|example|your[_-]?(key|token|secret|password)|my_password|dummy|dummy_password|to_be_filled|123456|qwerty|admin|x{3,}|\*{3,})$/i;
const WEAK_VALUE = /^(password|pass|sa|secret|123456|qwerty|admin|test|changeme|to_be_filled)$/i;

// Aadhaar intentionally excluded: the 12-digit rule is notoriously noisy (matches project numbers etc.)
const NOISE_RULES = new Set(['Phone Number PII', 'Email Address PII', 'Credit Card Number', 'PAN Card Number']);
console.log(`Scanning ${allFiles.length} candidate files against 13 rules...`);
const candidates = { T: [], X: [], F: [] };
const noiseByFile = new Map(); // path -> count of PII rule matches
const aadhaarByFile = new Map(); // path -> count of Aadhaar rule matches
const ruleCountByFile = new Map(); // path -> { ruleName: count }
for (const rel of allFiles) {
  const full = path.join(DATA_DIR, rel);
  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  const labeled = linesByFile.get(rel.replace(/\\/g, '/'));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      const matches = [...line.matchAll(rule.regex)];
      if (matches.length > 0) {
        if (isPiiConfigKey(rule.name, line)) continue;
        const matchedValue = matches[0][1] || matches[0][0];
        const key = rel.replace(/\\/g, '/');
        if (rule.name === 'Aadhaar Card Number') {
          aadhaarByFile.set(key, (aadhaarByFile.get(key) || 0) + matches.length);
        } else if (NOISE_RULES.has(rule.name)) {
          noiseByFile.set(key, (noiseByFile.get(key) || 0) + matches.length);
        }
        const counts = ruleCountByFile.get(key) || {};
        counts[rule.name] = (counts[rule.name] || 0) + matches.length;
        ruleCountByFile.set(key, counts);
        const gt = labeled ? (labeled.get('T')?.has(i + 1) ? 'T' : labeled.get('X')?.has(i + 1) ? 'X' : labeled.get('F')?.has(i + 1) ? 'F' : null) : null;
        if (gt) {
          candidates[gt].push({
            rel: rel.replace(/\\/g, '/'),
            ruleName: rule.name,
            lineNum: i + 1,
            value: matchedValue,
            entropy: entropy(matchedValue)
          });
        }
        break;
      }
    }
  }
}

for (const gt of ['T', 'X', 'F']) {
  console.log(`${gt}-labeled matches: ${candidates[gt].length}`);
}

const ruleCoverage = {};
for (const c of candidates.T) {
  ruleCoverage[c.ruleName] = (ruleCoverage[c.ruleName] || 0) + 1;
}
console.log('T-labeled match coverage per rule:');
console.log(ruleCoverage);

// Pick files per ground-truth class with an eye to demo clarity
function pickFiles(list, maxPerRule, maxTotal, scoreFn) {
  const scored = list
    .map(c => ({ ...c, score: scoreFn(c) }))
    .sort((a, b) => b.score - a.score);

  const chosenByRule = new Map(); // ruleName -> files
  const chosenFiles = [];
  for (const c of scored) {
    const noise = noiseByFile.get(c.rel) || 0;
    if (noise > 4) continue;
    const aadhaar = aadhaarByFile.get(c.rel) || 0;
    if (aadhaar > 10) continue;
    const counts = ruleCountByFile.get(c.rel) || {};
    if ((counts[c.ruleName] || 0) > 12) continue; // avoid single-file floods
    const arr = chosenByRule.get(c.ruleName) || [];
    if (arr.length < maxPerRule && !arr.includes(c.rel)) {
      arr.push(c.rel);
      chosenByRule.set(c.ruleName, arr);
      chosenFiles.push(c);
    }
    if (chosenFiles.length >= maxTotal) break;
  }
  return [...new Set(chosenFiles.map(c => c.rel))];
}

// T: prefer high-entropy credential values (AWS/Google/GitHub/JWT/SSH/long keys) in source dirs;
//    PII-rule matches only included as flavor once credential rules are covered
const PII_RULES = ['Phone Number PII', 'Email Address PII', 'Aadhaar Card Number', 'Credit Card Number', 'PAN Card Number'];
const chosenT = pickFiles(candidates.T, 5, 20, c => {
  const strongRule = ['AWS Client Access Key', 'Google API Key', 'OpenAI API Key', 'GitHub OAuth Token', 'Slack Webhook URL', 'Stripe API Key', 'Telegram Bot Token', 'Discord Webhook URL', 'Slack API Token', 'Twilio API Key', 'Azure Storage Account Key', 'Google OAuth Client Secret', 'MongoDB Connection String', 'PostgreSQL/MySQL Connection URL', 'GitLab Personal Access Token', 'npm Access Token', 'HashiCorp Vault Token'].includes(c.ruleName);
  const ssh = c.ruleName === 'SSH/RSA Private Key';
  const inSrc = /\/src\/|\/app\//.test(c.rel);
  const pii = PII_RULES.includes(c.ruleName);
  return (pii ? -10 : 0) + (strongRule ? 3 : 0) + (ssh ? 2 : 0) + (inSrc ? 1 : 0) + (c.entropy > 3.5 ? 2 : 0) + (c.value.length >= 16 ? 1 : 0);
});

// X: prefer placeholder/low-entropy test values
const chosenX = pickFiles(candidates.X, 2, 3, c => {
  const placeholder = PLACEHOLDER_VALUE.test(c.value) ? 4 : 0;
  const inTest = /\/test\/|\/example\/|\/_\/|\/fixtures?\//.test(c.rel) ? 2 : 0;
  return placeholder + inTest + (c.entropy < 3 ? 1 : 0);
});

// F: prefer obvious weak-default / false-positive values
const chosenF = pickFiles(candidates.F, 2, 3, c => {
  const weak = WEAK_VALUE.test(c.value) ? 4 : 0;
  const inTest = /\/test\/|\/example\/|\/_\/|\/fixtures?\//.test(c.rel) ? 2 : 0;
  return weak + inTest + (c.entropy < 3 ? 1 : 0);
});

// Hand-picked curated files that tell a clear demo story (all real CredData files)
const CURATED = [
  '5f62aae4/example/app/2b8eecd7.py',      // commented test_user password -> False Positive
  'ffea718f/test/example/96e5e346.cs',     // commented "Password = Pass" -> False Positive
  '110f8d35/test/src/fbceb746.java'        // password="test" (X) + commented real pwd (T)
];

const curatedFiles = CURATED.filter(rel => {
  const noise = noiseByFile.get(rel) || 0;
  if (noise > 6) {
    console.log(`Skipping curated ${rel}: too much PII noise (${noise})`);
    return false;
  }
  return fs.existsSync(path.join(DATA_DIR, rel));
});

const chosenFiles = new Set([...chosenT, ...chosenX, ...chosenF, ...curatedFiles]);

console.log(`Chosen files: ${chosenFiles.size}`);
console.log([...chosenFiles].join('\n'));

// Build the ZIP
const zip = new JSZip();
const README = `SecurAI Demo Test Codebase
=============================
This ZIP is a curated sample extracted from the CredData credential-leakage dataset
(Samsung CredData - https://github.com/Samsung/CredData).

It contains real-world source files labeled by the dataset authors:
  - True (T): lines contain real leaked credentials
  - Unknown (X): test values / placeholders / example data
  - False (F): false-positive style cases (defaults, weak passwords, no real secret)

Files are organized under src/, config/, tests/, scripts/ and examples/ directories.
Provided for local testing and demonstration of SecurAI's detection engine only.
`;

zip.file('README.txt', README);

let included = 0;
let totalMatchLines = 0;
for (const rel of chosenFiles) {
  const full = path.join(DATA_DIR, rel);
  let text = fs.readFileSync(full, 'utf8');
  if (text.length > 50000) text = text.slice(0, 50000) + '\n// [truncated for demo]\n';

  // Organize into a realistic layout
  const dir = path.dirname(rel);
  const base = path.basename(rel);
  const targetDir = dir.split('/').slice(1).filter(s => s !== '_').join('/'); // strip repo id, hide '_' root marker
  const target = targetDir ? `${targetDir}/${base}` : base;

  zip.file(`demo/${target}`, text);
  included++;

  const matchLines = ['T', 'X', 'F'].reduce((n, gt) => n + candidates[gt].filter(c => c.rel === rel).length, 0);
  totalMatchLines += matchLines;
}

// Add a few clean files with no secrets
const clean = `export const config = {
  api: process.env.API_URL,
  port: process.env.PORT || 3000
};
`;
zip.file('demo/src/config/env-based.js', clean);

const clean2 = `import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///local.db")
SECRET_KEY = os.environ.get("SECRET_KEY")
print("configured from environment variables")
`;
zip.file('demo/src/config/env-based.py', clean2);

zip.file('demo/src/config/package.json', JSON.stringify({ name: 'demo-codebase', version: '1.0.0', private: true }, null, 2));

const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
fs.writeFileSync(OUT_FILE, out);
console.log(`\nWrote ${OUT_FILE} (${(out.length / 1024).toFixed(0)} KB)`);
console.log(`Included files: ${included}, T-labeled match lines: ${totalMatchLines}`);
