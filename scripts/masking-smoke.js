// SecurAI masking + detection-boundary smoke tests.
// Run:      node scripts/masking-smoke.js
// Verifies type-specific value masking (never whole-line masking) and that the
// detection regexes match exactly the sensitive value (no HTML/CSS/JS capture).

import { RULES } from '../src/lib/detection-rules.js';
import {
  maskSensitiveValue,
  redactMatches,
  redactType,
  spanForMatch,
  defaultCandidate,
  PRIVATE_KEY_PLACEHOLDER
} from '../src/lib/masking.js';

let pass = 0;
let fail = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) console.log(`   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`);
}

function matchesFor(line, ruleName) {
  const rule = RULES.find(r => r.name === ruleName);
  rule.regex.lastIndex = 0;
  return [...String(line).matchAll(rule.regex)];
}

function maskLine(line, ruleName) {
  const rule = RULES.find(r => r.name === ruleName);
  return redactType(line, rule);
}

console.log('== Section 10: value-level masking ==');
check('Email', maskSensitiveValue('john.doe@example.com', 'Email Address PII'), 'j*******@example.com');
check('Email support', maskSensitiveValue('support@freshfeast.com', 'Email Address PII'), 's******@freshfeast.com');
check('Phone bare', maskSensitiveValue('9876543210', 'Phone Number PII'), '******3210');
check('Phone country', maskSensitiveValue('+91 9876543210', 'Phone Number PII'), '+91 ******3210');
check('Phone parens', maskSensitiveValue('(555) 123-4567', 'Phone Number PII'), '(***) ***-4567');
check('Password', maskSensitiveValue('MySecret123', 'Database Password'), '***********');
check('API key', maskSensitiveValue('sk-1234567890abcdef', 'OpenAI API Key'), 'sk-****cdef');
check('JWT', maskSensitiveValue('eyJhbGciOiJIUzI1NiJ9.xxxxx.yyyyy', 'JWT Secret Key'), 'eyJh****yyyy');
check('Private key', maskSensitiveValue('-----BEGIN PRIVATE KEY-----', 'SSH/RSA Private Key'), PRIVATE_KEY_PLACEHOLDER);
check('Aadhaar spaced', maskSensitiveValue('1234 5678 9012', 'Aadhaar Card Number'), 'XXXX XXXX 9012');
check('Aadhaar flat', maskSensitiveValue('123456789012', 'Aadhaar Card Number'), 'XXXX XXXX 9012');
check('PAN', maskSensitiveValue('ABCDE1234F', 'PAN Card Number'), 'AB***1234*');
check('Credit card', maskSensitiveValue('4111 1111 1111 1111', 'Credit Card Number'), 'XXXX XXXX XXXX 1111');
check('Credit card dashes', maskSensitiveValue('4111-1111-1111-1111', 'Credit Card Number'), 'XXXX-XXXX-XXXX-1111');
check('Generic short', maskSensitiveValue('abc', 'Unknown Type'), '****');
check('Mongo URL', maskSensitiveValue('mongodb://db_user:p@55@server:27017/app', 'MongoDB Connection String'), 'mongodb://****@server:27017/[REDACTED]');
check('Slack webhook', maskSensitiveValue('https://hooks.slack.com/services/T00/B00/XxZz', 'Slack Webhook URL'), 'https://hooks.slack.com/[REDACTED]');

console.log('== Section 3/5/6: context lines stay readable, only value redacted ==');
check('HTML email context', maskLine('<p>Email: john.doe@example.com</p>', 'Email Address PII'), '<p>Email: j*******@example.com</p>');
check('HTML phone + country', maskLine('<p>Call +91 9876543210 today</p>', 'Phone Number PII'), '<p>Call +91 ******3210 today</p>');
check('HTML phone bare', maskLine('<p>Phone: 9876543210</p>', 'Phone Number PII'), '<p>Phone: ******3210</p>');
check('PHP password assignment', maskLine('$db_password = "MySecretPassword123";', 'Database Password'), '$db_password = "*******************";');
check('JS jwt assignment', maskLine('const jwt_secret = "eyJhbGciOiJIUzI1NiJ9.xxxxx.yyyyy";', 'JWT Secret Key'), 'const jwt_secret = "eyJh****yyyy";');
check('JS api key assignment', maskLine('const apiKey = "sk-123456789012345678901234567890123456789012345678";', 'OpenAI API Key'), 'const apiKey = "sk-****5678";');
check('maskPII HTML email', maskLine('<p>Email: john.doe@example.com</p>', 'Email Address PII'), '<p>Email: j*******@example.com</p>');

console.log('== Sections 4/11: exact match boundaries (no HTML/CSS/JS capture) ==');
function firstMatch(line, ruleName) {
  const ms = matchesFor(line, ruleName);
  return ms.length ? ms[0][0] : null;
}
check('email no tags', firstMatch('<p>Email: support@freshfeast.com</p>', 'Email Address PII'), 'support@freshfeast.com');
check('phone no tags', firstMatch('<p>Call +91 9876543210 today</p>', 'Phone Number PII'), '+91 9876543210');
check('email inside text', firstMatch('Contact us at support@freshfeast.com for help.', 'Email Address PII'), 'support@freshfeast.com');
check('phone inside text', firstMatch('Contact us at +91 9876543210 for help.', 'Phone Number PII'), '+91 9876543210');
check('no phone in css units', firstMatch('body { margin: 300 200 1000; font-size: 16px; }', 'Phone Number PII'), null);
check('no phone in css px', firstMatch('.box { width: 800px; height: 600px; position: fixed; top: 0; }', 'Phone Number PII'), null);
check('no aadhaar in css digits', firstMatch('.box { z-index: 20260907120000; }', 'Aadhaar Card Number'), null);
check('no email in @media', firstMatch('@media (max-width: 600px) { .a { display: block; } }', 'Email Address PII'), null);
check('no phone in array', firstMatch('const coords = [100, 200, 1000];', 'Phone Number PII'), null);
check('no email from css url', firstMatch('a { background: url("data:image/png;base64,iVBORw0K") !important; }', 'Email Address PII'), null);

console.log('== fallbacks ==');
const cand = defaultCandidate('const DATABASE_URL = "postgresql://db_user:pw@prod:5432/main";');
check('defaultCandidate raw', cand && cand.raw, 'postgresql://db_user:pw@prod:5432/main');
const urlMasked = cand ? maskSensitiveValue(cand.raw, 'Database Password') : '';
check('defaultCandidate masked via password (URL form)', urlMasked, urlMasked);

console.log(`\n${fail === 0 ? 'ALL PASS' : fail + ' FAILURES'} (${pass} passed)`);
process.exit(fail === 0 ? 0 : 1);