import fs from 'node:fs';
import JSZip from 'jszip';
import { analyzeContext } from '../src/lib/ai-engine.js';

// Mirrors src/lib/state.svelte.js isPiiConfigKey (PII rules skipped on obvious config keys)
function isPiiConfigKey(secretType, line) {
  if (secretType !== 'Aadhaar Card Number' && secretType !== 'Phone Number PII') return false;
  return /["']?(project_number|mobilesdk_app_id|client_id)["']?\s*[:=]\s*["']?/i.test(line) ||
    /arn:aws:[^"\s]*\d{12}/.test(line);
}

const RULES = [
  { name: 'AWS Client Access Key', regex: /\b(AKIA[0-9A-Z]{16})\b/g, weight: 10 },
  { name: 'Google API Key', regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g, weight: 8 },
  { name: 'OpenAI API Key', regex: /\b(sk-[a-zA-Z0-9]{48})\b/g, weight: 10 },
  { name: 'GitHub OAuth Token', regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36})\b/g, weight: 10 },
  { name: 'SSH/RSA Private Key', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g, weight: 10 },
  { name: 'PAN Card Number', regex: /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g, weight: 8 },
  { name: 'Aadhaar Card Number', regex: /\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/g, weight: 8 },
  { name: 'Credit Card Number', regex: /\b((?:\d{4}[- ]?){3}\d{4})\b/g, weight: 8 },
  { name: 'Database Password', regex: /\b(password|pass|passwd|db_password|db_pass)\s*=[ \t]*['"]([^'"]+)['"]/ig, weight: 9 },
  { name: 'JWT Secret Key', regex: /\b(jwt_secret|jwt_key|token_secret|session_secret)\s*=[ \t]*['"]([^'"]+)['"]/ig, weight: 8 },
  { name: 'Slack Webhook URL', regex: /https:\/\/hooks\.slack\.(?:com|invalid)\/services\/[T0-9a-zA-Z_]+\/[B0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/g, weight: 10 },
  { name: 'Stripe API Key', regex: /\b((sk|rk)_(live|test)_[0-9a-zA-Z]{16,24})\b/g, weight: 10 },
  { name: 'Telegram Bot Token', regex: /\b(\d{8,10}:[A-Za-z0-9_-]{35})\b/g, weight: 10 },
  { name: 'Discord Webhook URL', regex: /https:\/\/discord(app)?\.com\/api\/webhooks\/\d{16,19}\/[A-Za-z0-9_-]{60,}/g, weight: 10 },
  { name: 'Slack API Token', regex: /\b(xox[baprs]-[0-9A-Za-z-]{10,62})\b/g, weight: 10 },
  { name: 'Twilio API Key', regex: /\b(SK[0-9a-fA-F]{32})\b/g, weight: 9 },
  { name: 'Azure Storage Account Key', regex: /\b(?:AccountKey|SharedAccessKey)=([a-zA-Z0-9+/=]{80,})\b/g, weight: 9 },
  { name: 'Google OAuth Client Secret', regex: /\b(GOCSPX-[A-Za-z0-9_-]{20,})\b/g, weight: 9 },
  { name: 'MongoDB Connection String', regex: /\b(mongodb(\+srv)?:\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g, weight: 10 },
  { name: 'PostgreSQL/MySQL Connection URL', regex: /\b((postgres|postgresql|mysql):\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g, weight: 10 },
  { name: 'GitLab Personal Access Token', regex: /\b(glpat-[A-Za-z0-9_-]{20})\b/g, weight: 9 },
  { name: 'npm Access Token', regex: /\b(npm_[A-Za-z0-9]{36})\b/g, weight: 9 },
  { name: 'HashiCorp Vault Token', regex: /\b(hvs\.[A-Za-z0-9_-]{24,})\b/g, weight: 9 },
  { name: 'Email Address PII', regex: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+)\b/g, weight: 3 },
  { name: 'Phone Number PII', regex: /\b((?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})\b/g, weight: 3 }
];

const zipData = fs.readFileSync('./static/test-data.zip');
const zip = await JSZip.loadAsync(zipData);

const summary = {};
const findings = [];
for (const [rel, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  if (rel.includes('README')) continue;
  const text = await entry.async('string');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      const matches = [...line.matchAll(rule.regex)];
      if (matches.length === 0) continue;
      for (const m of matches) {
        if (isPiiConfigKey(rule.name, line)) continue;
        const matchedValue = m[0].length > 100 ? m[0].substring(0, 100) : m[0];
        const ai = analyzeContext({
          filePath: rel,
          matchedValue,
          lineContent: line,
          allLines: lines,
          lineIndex: i,
          secretType: rule.name
        });
        findings.push({ rule: rule.name, decision: ai.decision, confidence: ai.confidence });
        summary[rule.name] = summary[rule.name] || {};
        summary[rule.name][ai.decision] = (summary[rule.name][ai.decision] || 0) + 1;
      }
    }
  }
}

console.log('Findings:', findings.length);
console.log('\nVerdict distribution by rule:');
for (const rule of Object.keys(summary)) {
  console.log(`  ${rule}:`, JSON.stringify(summary[rule]));
}
const verdicts = {};
for (const f of findings) verdicts[f.decision] = (verdicts[f.decision] || 0) + 1;
console.log('\nTotal verdicts:', JSON.stringify(verdicts));
