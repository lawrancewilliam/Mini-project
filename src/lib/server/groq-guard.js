// SecureGaurd — Groq prompt guard (SERVER ONLY).
//
// SvelteKit forbids client-side imports from $lib/server, so this module can
// never end up in a client bundle. It guarantees that no detected credential
// (API key, password, token, private key, PII value, ...) is ever written into
// a Groq prompt.
//
// Layered defence, applied in order:
//   1. privateKeyBlock   — whole PEM blocks collapse to one placeholder
//   2. urlUserInfo       — scheme://user:pass@host credentials are stripped
//   3. ruleRedaction     — every RULES regex hit on a line is masked with the
//                          shared maskSensitiveValue() (same masks the UI uses)
//   4. literalSweep      — residual high-entropy quoted literals / bare tokens
//                          that no rule matched are masked too (over-redaction
//                          is safe; under-redaction is not)
//   5. assertNoRawLeak   — last line of defence: if the caller-supplied raw
//                          value still survives anywhere in the prompt, the
//                          Groq call is aborted and the caller falls back to ML
//
// Pure JS — no Supabase, no Svelte, no network. Safe to import from +server.js.

import { RULES } from '$lib/detection-rules.js';
import {
  PRIVATE_KEY_PLACEHOLDER,
  maskSensitiveValue,
  redactMatches,
  spanForMatch
} from '$lib/masking.js';

export const VERDICT_VALUES = ['Leak Confirmed', 'Suspicious', 'Test Data', 'False Positive'];

// Longest source context window ever handed to the LLM (per side).
export const CONTEXT_LINES = 10;
// Hard cap on a single context line, so a minified bundle cannot flood the prompt.
const MAX_LINE_LENGTH = 400;

// ---------------------------------------------------------------------------
// 1-2. Structural redaction
// ---------------------------------------------------------------------------

function privateKeyBlock(text) {
  return text.replace(
    /-{2,}\s*BEGIN[^-]*PRIVATE KEY[^-]*-{2,}[\s\S]*?-{2,}\s*END[^-]*PRIVATE KEY[^-]*-{2,}/gi,
    PRIVATE_KEY_PLACEHOLDER
  );
}

function urlUserInfo(text) {
  return text.replace(
    /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]{1,64}:[^\s/@]{1,128})@/gi,
    (m, scheme) => `${scheme}****:****@`
  );
}

// ---------------------------------------------------------------------------
// 3. Rule-driven redaction (reuses the production detection rules)
// ---------------------------------------------------------------------------

function ruleRedaction(line, secretType) {
  const text = String(line);
  const occurrences = [];

  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(text)) !== null) {
      const span = spanForMatch(m, rule);
      if (span.length <= 0) continue;
      // The finding's own type wins, so its mask shape stays consistent.
      const type = rule.name === secretType ? secretType : rule.name;
      occurrences.push({
        index: span.index,
        length: span.length,
        maskedValue: maskSensitiveValue(span.raw, type)
      });
    }
  }

  return redactMatches(text, occurrences);
}

// ---------------------------------------------------------------------------
// 4. Residual sweep for secrets no rule matched
// ---------------------------------------------------------------------------

function shannonEntropy(str) {
  if (!str) return 0;
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) || 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// A value that already carries redaction markers is safe to send. Every mask
// shape emitted by masking.js qualifies: maskPassword/maskGeneric/maskToken/
// maskJwt emit '*', maskCreditCard/maskAadhaar emit 'X' runs, and the private
// key path emits the dedicated placeholder.
export function isMaskedValue(value) {
  const v = String(value == null ? '' : value);
  if (!v) return true;
  if (v.includes(PRIVATE_KEY_PLACEHOLDER)) return true;
  return /[*xX]{3,}/.test(v);
}

function looksSecretLiteral(literal) {
  if (literal.length < 16) return false;
  if (PRIVATE_KEY_PLACEHOLDER.includes(literal)) return false;
  // Already-masked output must survive the sweep untouched.
  if (isMaskedValue(literal)) return false;

  const classes =
    (/[a-z]/.test(literal) ? 1 : 0) +
    (/[A-Z]/.test(literal) ? 1 : 0) +
    (/[0-9]/.test(literal) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(literal) ? 1 : 0);
  return classes >= 2 && shannonEntropy(literal) >= 2.5;
}

// A bare token (unquoted) is treated as identifier/prose unless it carries
// BOTH a digit and a letter. Redacting AWS_ACCESS_KEY_ID or getAccessKey would
// destroy the variable-naming signal the LLM is explicitly asked to weigh.
function looksSecretBareToken(token) {
  if (!/[0-9]/.test(token) || !/[A-Za-z]/.test(token)) return false;
  return looksSecretLiteral(token);
}

const QUOTED_LITERAL = /(['"`])([^'"`\n]{1,400})\1/g;
const BARE_TOKEN = /[^\s'"`,;()[\]{}<>]{16,400}/g;

function literalSweep(text, secretType) {
  let out = String(text);

  // Quoted string literals: keep the quotes, mask the body. Secrets live here
  // (assignments, headers, env dumps), so this pass is deliberately aggressive.
  // The finding's own secretType drives the mask shape, so the masked form is
  // identical to the one produced for maskedValue in the route.
  out = out.replace(QUOTED_LITERAL, (m, quote, body) => {
    if (!looksSecretLiteral(body)) return m;
    return `${quote}${maskSensitiveValue(body, secretType)}${quote}`;
  });

  out = out.replace(BARE_TOKEN, token => {
    if (!looksSecretBareToken(token)) return token;
    return maskSensitiveValue(token, secretType);
  });

  return out;
}

// High-entropy literals the sweep should have masked but did not. Shared
// predicates with literalSweep so the two can never drift apart.
function residualSecrets(text) {
  const found = [];
  const haystack = String(text);
  for (const m of haystack.matchAll(QUOTED_LITERAL)) {
    if (looksSecretLiteral(m[2]) && !isMaskedValue(m[2])) found.push(m[2]);
  }
  for (const m of haystack.matchAll(BARE_TOKEN)) {
    const t = m[0];
    if (looksSecretBareToken(t) && !isMaskedValue(t)) found.push(t);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Make any single source line safe to send to the LLM.
export function sanitizeLine(line, secretType) {
  if (line == null) return '';
  const clipped = String(line).slice(0, MAX_LINE_LENGTH);
  return literalSweep(ruleRedaction(privateKeyBlock(urlUserInfo(clipped)), secretType), secretType);
}

// Shannon entropy of the already-masked value. A scalar only — never the value.
export function maskedValueEntropy(maskedValue) {
  return Math.round(shannonEntropy(String(maskedValue || '')) * 100) / 100;
}

// Best-effort variable name for the finding, read from the (redacted) line.
export function extractVariableName(line) {
  const text = String(line || '');
  const patterns = [
    /(?:const|let|var|final|static|public|private|protected)\s+([A-Za-z_$][\w$]*)\s*[:=]/,
    /["']([A-Za-z_$][\w$.\-]*)["']\s*:\s*["']/,
    /([A-Za-z_$][\w$]*)\s*[:=]\s*["'`]/
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] && m[1].length <= 64) return m[1];
  }
  return null;
}

// Assemble the fully sanitized context block sent to Groq.
export function buildContextBlock({ beforeLines, lineContent, afterLines, secretType }) {
  const before = (beforeLines || []).slice(-CONTEXT_LINES).map(l => `  ${sanitizeLine(l, secretType)}`);
  const after = (afterLines || []).slice(0, CONTEXT_LINES).map(l => `  ${sanitizeLine(l, secretType)}`);
  const target = `>> ${sanitizeLine(lineContent, secretType)}`;
  return [...before, target, ...after].join('\n');
}

// Final safety net. Returns true when the prompt is safe to send.
//
// NOTE: this deliberately does NOT assert "no detection rule matches the
// prompt". Key=value rules (Database Password, JWT Secret Key) match on
// STRUCTURE - `password = "..."` - and the key, '=' and quotes all survive
// masking by design, so an already fully-masked line still matches them.
// Rejecting on rule matches blocked every legitimate sanitized prompt.
//
// It asserts what actually matters: no unmasked VALUE survives.
//
//   1. the declared masked value must be present (proves masking was applied)
//   2. no caller-supplied raw value may appear
//   3. every detection-rule match in the prompt must already be masked
//   4. no high-entropy residual may remain that the sweep failed to mask
export function assertPromptIsMasked(prompt, { maskedValue, rawValues = [] } = {}) {
  const haystack = String(prompt || '');

  // (1)
  if (maskedValue && !haystack.includes(String(maskedValue))) return false;

  // (2)
  for (const raw of rawValues) {
    const value = String(raw == null ? '' : raw).trim();
    if (value.length < 6) continue;
    if (haystack.includes(value)) return false;
  }

  // (3) the rule may still match, but its sensitive VALUE must be redacted.
  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(haystack)) !== null) {
      const span = spanForMatch(m, rule);
      if (!isMaskedValue(span.raw)) return false;
    }
  }

  // (4)
  if (residualSecrets(haystack).length > 0) return false;

  return true;
}
