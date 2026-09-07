// SecurAI value-level masking (single source of truth).
//
// Principles:
//  - maskSensitiveValue() masks ONLY a detected sensitive value, never a code line.
//  - redactMatches() replaces exact match spans inside a code line so the line
//    stays readable and only the sensitive substring is redacted.
//  - spanForMatch() computes the exact span of the sensitive value inside a
//    rule match (for key=value rules this is the quoted value only, so the
//    assignment text stays intact).
//
// Pure JS — no Svelte/Supabase imports, safe to run in Node test harnesses.

export const PRIVATE_KEY_PLACEHOLDER = '[REDACTED PRIVATE KEY]';

// ---------------------------------------------------------------------------
// Exact-match span helpers
// ---------------------------------------------------------------------------

// Given a match()/matchAll() result and the rule it came from, return the span
// (index + length within the original line) and raw value of the *sensitive
// value*, honoring the rule's valueGroup.
export function spanForMatch(matchArray, rule) {
  const start = matchArray.index;
  if (!rule || rule.valueGroup == null || rule.valueGroup === 0) {
    return { index: start, length: matchArray[0].length, raw: matchArray[0] };
  }
  const raw = matchArray[rule.valueGroup] != null ? String(matchArray[rule.valueGroup]) : '';
  const idx = matchArray[0] ? matchArray[0].indexOf(raw) : -1;
  if (!raw || idx < 0) {
    return { index: start, length: matchArray[0].length, raw: matchArray[0] };
  }
  return { index: start + idx, length: raw.length, raw };
}

// Replace a list of { index, length, maskedValue } spans inside a line.
// Spans may come from different rules; right-to-left replacement keeps offsets
// valid even when spans overlap.
export function redactMatches(line, occurrences) {
  if (!line || !occurrences || occurrences.length === 0) return line;
  const sorted = occurrences
    .filter(o => o && o.index != null && o.length > 0 && o.maskedValue != null)
    .sort((a, b) => b.index - a.index);
  if (sorted.length === 0) return line;
  let out = String(line);
  for (const o of sorted) {
    const end = o.index + o.length;
    if (o.index < 0 || end > out.length) continue;
    out = out.slice(0, o.index) + o.maskedValue + out.slice(end);
  }
  return out;
}

// Scan a code line with a single rule and replace every occurrence of that
// rule's sensitive value with its masked form. Lines with no (residual) match
// are returned unchanged so already-redacted snippets pass through untouched.
export function redactType(line, rule) {
  if (!line || !rule) return line;
  const text = String(line);
  const occurrences = [];
  rule.regex.lastIndex = 0;
  let m;
  while ((m = rule.regex.exec(text)) !== null) {
    const span = spanForMatch(m, rule);
    occurrences.push({
      index: span.index,
      length: span.length,
      maskedValue: maskSensitiveValue(span.raw, rule.name)
    });
  }
  if (occurrences.length === 0) return line;
  return redactMatches(text, occurrences);
}

// ---------------------------------------------------------------------------
// maskSensitiveValue — type-specific masking of a single detected value
// ---------------------------------------------------------------------------

export function maskSensitiveValue(value, secretType) {
  const v = value == null ? '' : String(value);
  if (!v) return v;
  const type = (secretType || '').trim().toLowerCase();
  const low = v.toLowerCase();

  if (low.includes('private key') || type.includes('private key')) return PRIVATE_KEY_PLACEHOLDER;
  if (low.includes('@') && (type.includes('email') || /^[^@]+@[^@]+\.[^@]{2,}$/.test(v))) return maskEmail(v);
  if (type.includes('phone')) return maskPhone(v);
  if (low.includes('://')) return maskUrl(v);
  if (type.includes('password') || type.includes('pass')) return maskPassword(v);
  if (type.includes('jwt') || type.includes('session_secret') || type.includes('token_secret')) return maskJwt(v);
  if (type.includes('aadhaar')) return maskAadhaar(v);
  if (type.includes('pan') || type === 'pan card number') return maskPan(v);
  if (type.includes('credit card') || type.includes('card number')) return maskCreditCard(v);
  if (type.includes('api key') || type.includes('access key') || type.includes('token') ||
      type.includes('secret') || type.includes('webhook') || type.includes('bot token') ||
      type.includes('client secret') || type.includes('oauth')) {
    return maskToken(v);
  }
  return maskGeneric(v);
}

function maskEmail(value) {
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return maskGeneric(value);
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length <= 2) return '***@' + domain;
  return local.charAt(0) + '*'.repeat(local.length - 1) + '@' + domain;
}

function maskPhone(value) {
  // Keep a leading country code (+XX/++XXX) and the last 4 subscriber digits
  // visible; mask every other digit while preserving separators/parens.
  const lead = value.match(/^(\+\d{1,3}[-. ]?)/);
  const head = lead ? lead[1] : '';
  const body = lead ? value.slice(head.length) : value;
  const digits = body.replace(/\D/g, '');
  if (!digits) return maskGeneric(value);
  let remaining = digits.length;
  const masked = body.replace(/\d/g, ch => {
    remaining -= 1;
    return remaining < 4 ? ch : '*';
  });
  return head + masked;
}

function maskPassword(value) {
  return '*'.repeat(Math.max(4, value.length));
}

function maskJwt(value) {
  const s = value.trim();
  if (s.length <= 8) return '*'.repeat(Math.max(4, s.length));
  return s.slice(0, 4) + '****' + s.slice(-4);
}

function maskAadhaar(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 12) return 'XXXX XXXX ' + digits.slice(-4);
  return maskGeneric(value);
}

function maskPan(value) {
  const s = value.trim();
  if (s.length >= 10) return s.slice(0, 2) + '***' + s.slice(5, 9) + '*';
  return maskGeneric(s);
}

function maskCreditCard(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 16) return maskGeneric(value);
  let remaining = digits.length;
  // Keep the last 4 digit characters, mask the earlier ones as X (default card
  // convention), preserving separators.
  return value.replace(/\d/g, ch => {
    remaining -= 1;
    return remaining < 4 ? ch : 'X';
  });
}

function maskToken(value) {
  const s = value.trim();
  const marker = s.match(/^([A-Za-z0-9]+[-_])/);
  const prefix = marker ? marker[1] : s.slice(0, 4);
  const body = s.slice(prefix.length);
  if (!body) return '****';
  if (body.length <= 4) return prefix + '****';
  return prefix + '****' + body.slice(-4);
}

function maskUrl(value) {
  const m = value.match(/^([a-z][a-z0-9+.-]*:\/\/)([^/]*)(.*)$/i);
  if (!m) return maskGeneric(value);
  const scheme = m[1];
  let authority = m[2];
  const rest = m[3];

  // Mask credentials embedded in the authority (user:pass@host).
  const at = authority.lastIndexOf('@');
  if (at !== -1) {
    authority = '****' + authority.slice(at);
  }
  const suffix = rest ? '/[REDACTED]' : '';
  return scheme + authority + suffix;
}

function maskGeneric(value) {
  const s = value.trim();
  if (s.length <= 8) return '*'.repeat(Math.max(4, s.length));
  return s.slice(0, 2) + '****' + s.slice(-4);
}

// ---------------------------------------------------------------------------
// Legacy/plain helper used by the persist layer when a finding carries neither
// an explicit maskedValue nor a rule match (e.g. demo/simulated findings):
// extract a quoted candidate value from a line and mask it.
// ---------------------------------------------------------------------------

export function defaultCandidate(line) {
  if (!line) return null;
  const m = String(line).match(/['"]([^'"]{6,})['"]/);
  if (!m) return null;
  const idx = String(line).indexOf(m[1]);
  if (idx < 0) return null;
  return { index: idx, length: m[1].length, raw: m[1] };
}