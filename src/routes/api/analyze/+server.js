// SecureGaurd — Groq Cloud contextual validation endpoint.
//
// Flow:  Scanner -> Candidate Finding -> TF-IDF/ML Classification (client)
//        -> Groq Context Validation (here) -> Final Verdict
//
// This route is the ONLY place that talks to Groq. It:
//   - never receives or logs GROQ_API_KEY beyond reading it from the private env
//   - sanitizes every value that goes into the prompt (see $lib/server/groq-guard)
//   - requests structured JSON output and validates it before returning
//   - ALWAYS answers HTTP 200 with analysisEngine, so a Groq outage can never
//     fail a project scan: the client falls back to the existing
//     TF-IDF / cosine-similarity result.
//
// Replaces the previous Ollama (localhost:11434) implementation.

import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Groq from 'groq-sdk';
import {
  VERDICT_VALUES,
  assertPromptIsMasked,
  buildContextBlock,
  extractVariableName,
  isMaskedValue,
  maskedValueEntropy
} from '$lib/server/groq-guard.js';
import { maskSensitiveValue } from '$lib/masking.js';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_TOKENS = 400;
const MAX_REASON_LENGTH = 600;
const MAX_RECOMMENDATION_LENGTH = 600;
const CONTEXT_BREAKER_THRESHOLD = 3;
const CONTEXT_BREAKER_COOLDOWN_MS = 30000;

const GROQ_LLM = 'Groq LLM';
const ML_FALLBACK = 'ML Fallback';

const SYSTEM_PROMPT = `You are a code security analyst for a source-code secret-leakage scanner.

You receive ONE candidate finding. The secret value you are shown is ALREADY MASKED
(e.g. "AKIA****3XQ7", "********", "ghp_****a91c"). The mask preserves only the
provider prefix and the last 4 characters. Never attempt to reconstruct, complete
or guess the original value, and never ask for it.

Decide whether the masked value corresponds to a real leaked credential or to
example/mock/placeholder/test data, using only the surrounding code context.

Verdict definitions:
- "Leak Confirmed": an active, real credential hardcoded in production or config code
- "Suspicious": credential-like, but the context is ambiguous and needs human review
- "Test Data": fixtures, tutorials, mocks, sample values, CI/local dummy credentials
- "False Positive": commented-out code, placeholders (xxxx, your-key-here, changeme), or a non-secret string

Weigh these signals: variable naming, file path, test/fixture indicators, comment
context, whether the value is hardcoded or loaded from the environment, and the
entropy/confidence hints supplied with the finding.

Respond with a single JSON object and nothing else:
{
  "verdict": "Leak Confirmed" | "Suspicious" | "Test Data" | "False Positive",
  "confidence": <integer 0-100>,
  "reason": "<1-2 sentences citing the concrete code evidence you used>",
  "recommendation": "<one specific remediation sentence for this finding>"
}`;

const RESPONSE_SCHEMA = {
  name: 'secureguard_finding_verdict',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['verdict', 'confidence', 'reason', 'recommendation'],
    properties: {
      verdict: { type: 'string', enum: VERDICT_VALUES },
      confidence: { type: 'integer', minimum: 0, maximum: 100 },
      reason: { type: 'string' },
      recommendation: { type: 'string' }
    }
  }
};

let cachedClient = null;
// Consecutive-failure circuit breaker: keeps a broken/unreachable Groq endpoint
// from adding its timeout to every remaining finding in a scan.
let consecutiveFailures = 0;
let breakerOpenedAt = 0;

function breakerIsOpen() {
  if (consecutiveFailures < CONTEXT_BREAKER_THRESHOLD) return false;
  if (Date.now() - breakerOpenedAt > CONTEXT_BREAKER_COOLDOWN_MS) {
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordSuccess() {
  consecutiveFailures = 0;
  breakerOpenedAt = 0;
}

function recordFailure() {
  consecutiveFailures += 1;
  breakerOpenedAt = Date.now();
}

function getClient() {
  if (cachedClient) return cachedClient;
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) return null;
  cachedClient = new Groq({ apiKey, maxRetries: 0, timeout: REQUEST_TIMEOUT_MS });
  return cachedClient;
}

function clampConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

// Parse JSON out of a model reply that may be wrapped in prose or a code fence.
function parseModelJson(content) {
  if (typeof content !== 'string') return null;
  const text = content.trim();
  const candidates = [text];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

// Strict shape + range validation. Anything unexpected is treated as malformed.
function validateVerdict(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const verdict = VERDICT_VALUES.find(
    v => v.toLowerCase() === String(raw.verdict == null ? '' : raw.verdict).trim().toLowerCase()
  );
  if (!verdict) return null;

  const confidence = clampConfidence(raw.confidence);
  if (confidence === null) return null;

  const reason = cleanText(raw.reason, MAX_REASON_LENGTH);
  if (reason.length < 8) return null;

  return {
    verdict,
    confidence,
    reason,
    recommendation: cleanText(raw.recommendation, MAX_RECOMMENDATION_LENGTH)
  };
}

// Primary attempt uses a strict JSON schema; the fallback attempt uses plain
// JSON mode for models/deployments that reject the schema. Both are validated.
async function requestVerdict(groq, model, messages) {
  const attempts = [
    {
      messages,
      model,
      temperature: 0.1,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA }
    },
    {
      messages,
      model,
      temperature: 0.1,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' }
    }
  ];

  let lastStatus = null;

  for (let i = 0; i < attempts.length; i++) {
    try {
      const completion = await groq.chat.completions.create(attempts[i]);
      const content = completion?.choices?.[0]?.message?.content;
      const validated = validateVerdict(parseModelJson(content));
      if (validated) {
        return { validated, model: completion?.model || model };
      }
      lastStatus = 'malformed_response';
    } catch (err) {
      const status = err?.status ?? null;
      lastStatus = status ? `groq_http_${status}` : 'groq_unavailable';
      // Auth / permission / model errors will not improve on a retry.
      if (status && status !== 429 && status < 500) break;
    }
  }

  return { validated: null, status: lastStatus || 'groq_unavailable' };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function POST({ request }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ success: false, analysisEngine: ML_FALLBACK, fallbackReason: 'invalid_request' });
  }

  const {
    secretType = '',
    filePath = '',
    maskedValue = '',
    lineContent = '',
    beforeLines = [],
    afterLines = [],
    mlVerdict = '',
    mlConfidence = null,
    mlEngine = '',
    entropy = null
  } = payload || {};

  const safeMaskedValue = maskSensitiveValue(maskedValue, secretType);
  // The client is required to send an ALREADY-masked value. If a raw credential
  // arrives here it means a masking step was bypassed, so the request is
  // rejected outright rather than risk forwarding it to Groq.
  if (String(maskedValue || '') && !isMaskedValue(String(maskedValue))) {
    return json({ success: false, analysisEngine: ML_FALLBACK, fallbackReason: 'unmasked_value_rejected' });
  }
  // If a raw value was embedded in a context line, proving it is ABSENT from
  // the sanitized block is part of the guarantee: the block must carry only the
  // masked form. This closes the loop for residuals the sweep cannot recognise.
  const rawValues = String(maskedValue || '') === safeMaskedValue ? [] : [maskedValue];

  const groq = getClient();
  if (!groq) {
    return json({ success: false, analysisEngine: ML_FALLBACK, fallbackReason: 'groq_not_configured' });
  }
  if (breakerIsOpen()) {
    return json({ success: false, analysisEngine: ML_FALLBACK, fallbackReason: 'groq_breaker_open' });
  }

  const variableName = extractVariableName(lineContent);
  const contextBlock = buildContextBlock({ beforeLines, lineContent, afterLines, secretType });

  const entropyValue = clampNumber(
    entropy ?? maskedValueEntropy(safeMaskedValue),
    0,
    8,
    0
  );
  const mlConfidenceValue = clampNumber(mlConfidence, 0, 100, null);

  const userPrompt = [
    `Secret type: ${secretType || 'Unknown'}`,
    `File path: ${filePath || 'unknown'}`,
    `Variable name: ${variableName || 'not determinable'}`,
    `Masked value: ${safeMaskedValue || 'n/a'}`,
    `Masked value length: ${String(maskedValue || '').length} characters`,
    `Shannon entropy of masked value: ${entropyValue}`,
    `Pre-scan ML classification: ${mlVerdict || 'n/a'}${
      mlConfidenceValue === null ? '' : ` (${mlConfidenceValue}% confidence)`
    }`,
    mlEngine ? `Pre-scan ML engine: ${mlEngine}` : null,
    '',
    'Surrounding source code (all sensitive values already masked):',
    '```',
    contextBlock,
    '```',
    '',
    'Classify this finding. Respond with the JSON object only.'
  ]
    .filter(l => l !== null)
    .join('\n');

  // Nothing leaves the server unless the sanitized payload is provably clean.
  if (!assertPromptIsMasked(contextBlock, { maskedValue: safeMaskedValue, rawValues })) {
    recordFailure();
    return json({ success: false, analysisEngine: ML_FALLBACK, fallbackReason: 'prompt_masking_failed' });
  }

  const model = env.GROQ_MODEL || DEFAULT_MODEL;

  const { validated, model: usedModel, status } = await requestVerdict(groq, model, [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ]);

  if (!validated) {
    recordFailure();
    return json({
      success: false,
      analysisEngine: ML_FALLBACK,
      fallbackReason: status || 'groq_unavailable'
    });
  }

  recordSuccess();

  return json({
    success: true,
    analysisEngine: GROQ_LLM,
    verdict: validated.verdict,
    confidence: validated.confidence,
    reason: validated.reason,
    recommendation: validated.recommendation,
    model: usedModel
  });
}
