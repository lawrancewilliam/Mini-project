export const VERDICTS = {
  LEAK_CONFIRMED: 'Leak Confirmed',
  SUSPICIOUS: 'Suspicious',
  TEST_DATA: 'Test Data',
  FALSE_POSITIVE: 'False Positive'
};

function calculateEntropy(str) {
  const freq = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function analyzeVariableNaming(line, lines, idx) {
  const namePatterns = {
    real: [
      { pattern: /\b(password|passwd|secret|api[_-]?key|token|access[_-]?key|secret[_-]?key|auth[_-]?token|db[_-]?(pass|password|url)|connection[_-]?string)\s*[:=]/i, weight: 0.9 },
      { pattern: /\b(AWS_|AZURE_|GCP_|GOOGLE_|STRIPE_|TWILIO_|SENDGRID_|DIGITALOCEAN_)/, weight: 0.85 },
      { pattern: /\b(prod|production|live|real|actual)\s*[_.]/i, weight: 0.7 },
      { pattern: /\b(DB_|DATABASE_|REDIS_|MONGODB_|POSTGRES_)/, weight: 0.8 },
      { pattern: /\b(JWT[_-]?SECRET|SESSION[_-]?SECRET|ENCRYPTION[_-]?KEY)/i, weight: 0.85 }
    ],
    mock: [
      { pattern: /\b(example|sample|dummy|mock|test|fake|placeholder|demo)[_.-]/i, weight: 0.8 },
      { pattern: /\b(YOUR[_-]?|CHANGE[_-]?ME|FIX[_-]?ME|TODO)/i, weight: 0.9 },
      { pattern: /\b(MY[_-]?|TEST[_-]?|LOCAL[_-]?|DEV[_-]?)/i, weight: 0.5 }
    ]
  };

  let score = 0.5;
  let maxWeight = 0;
  const evidence = [];

  const checkLine = line + ' ' + (lines[idx - 1] || '') + ' ' + (lines[idx + 1] || '');

  for (const { pattern, weight } of namePatterns.real) {
    if (pattern.test(checkLine)) {
      if (weight > maxWeight) {
        score = weight;
        maxWeight = weight;
      }
      evidence.push(`Variable naming pattern suggests real credential usage`);
      break;
    }
  }

  for (const { pattern, weight } of namePatterns.mock) {
    if (pattern.test(checkLine)) {
      if (weight * 0.3 > maxWeight) {
        score = 1 - weight * 0.7;
      }
      evidence.push(`Variable naming contains mock/test indicator`);
      break;
    }
  }

  return { score: Math.round(score * 100) / 100, evidence: evidence.length > 0 ? evidence.join(', ') : 'No naming pattern detected' };
}

function analyzeValueEntropy(matchedValue) {
  if (!matchedValue || matchedValue.length < 4) {
    return { score: 0.3, evidence: 'Value too short for entropy analysis' };
  }

  const entropy = calculateEntropy(matchedValue);
  const lengthScore = Math.min(matchedValue.length / 64, 1);
  const hasNumbers = /\d/.test(matchedValue);
  const hasUpper = /[A-Z]/.test(matchedValue);
  const hasSpecial = /[^a-zA-Z0-9]/.test(matchedValue);
  const complexity = (hasNumbers + hasUpper + hasSpecial) / 3;

  const placeholderPatterns = [
    /^x{4,}$/i, /^[*]{4,}$/, /^[-]{4,}$/, /your[-_]?(key|token|secret|password|api)/i,
    /change[_ ]?me/i, /example/i, /test[-_]?key/i, /sk_test/, /pk_test/,
    /AKIAIOSFODNN7EXAMPLE/, /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCYEXAMPLEKEY/
  ];

  let isPlaceholder = false;
  for (const p of placeholderPatterns) {
    if (p.test(matchedValue)) {
      isPlaceholder = true;
      break;
    }
  }

  let score;
  if (isPlaceholder) {
    score = 0.15;
  } else if (entropy > 4 && lengthScore > 0.3 && complexity > 0.5) {
    score = 0.85 + (entropy / 8) * 0.15;
  } else if (entropy > 3 && lengthScore > 0.2) {
    score = 0.6;
  } else {
    score = 0.3;
  }

  score = Math.min(score, 1);

  const evidenceParts = [];
  if (isPlaceholder) evidenceParts.push('Value matches known placeholder pattern');
  if (entropy > 4) evidenceParts.push(`High entropy (${entropy.toFixed(1)}) suggests real credential`);
  else if (entropy < 2.5) evidenceParts.push(`Low entropy (${entropy.toFixed(1)}) suggests placeholder`);
  if (matchedValue.length > 20) evidenceParts.push(`Value length (${matchedValue.length} chars) consistent with credentials`);
  if (complexity > 0.6) evidenceParts.push('Mixed character types increase credential likelihood');

  return {
    score: Math.round(score * 100) / 100,
    evidence: evidenceParts.join(', ') || 'Standard entropy pattern'
  };
}

function analyzeCommentContext(lines, idx) {
  const beforeLines = lines.slice(Math.max(0, idx - 5), idx);
  const afterLines = lines.slice(idx + 1, idx + 6);

  const mockIndicators = [
    { pattern: /\b(todo|fixme|hack|temp|temporary)\b/i, weight: 0.2 },
    { pattern: /\b(example|sample|demo|mock|dummy|placeholder|template)\b/i, weight: 0.35 },
    { pattern: /\b(test only|for testing|development only|local only)\b/i, weight: 0.4 },
    { pattern: /\b(Caution:|Warning:|NOTE:|TODO:|FIXME:|HACK:)/i, weight: 0.15 },
    { pattern: /\b(remove before|do not commit|sanitize|rotate before)\b/i, weight: 0.5 }
  ];

  const realIndicators = [
    { pattern: /\b(production|prod live|production only|critical)\b/i, weight: 0.3 },
    { pattern: /\b(warning|security|sensitive|confidential|secret)\b/i, weight: 0.4 }
  ];

  let score = 0.5;
  const evidence = [];

  for (const line of [...beforeLines, ...afterLines]) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) continue;

    for (const { pattern, weight } of mockIndicators) {
      if (pattern.test(trimmed)) {
        score -= weight * 0.5;
        evidence.push(`Nearby comment contains mock/placeholder keyword`);
        break;
      }
    }
    for (const { pattern, weight } of realIndicators) {
      if (pattern.test(trimmed)) {
        score += weight * 0.3;
        evidence.push(`Nearby comment warns about sensitive content`);
        break;
      }
    }
  }

  score = Math.max(0, Math.min(1, score));

  return { score: Math.round(score * 100) / 100, evidence: evidence.length > 0 ? evidence.join(', ') : 'No relevant comments nearby' };
}

function analyzeFileContext(filePath) {
  const lowerPath = filePath.toLowerCase();

  const testIndicators = [
    { pattern: /\/test(s)?\//, weight: 0.6 },
    { pattern: /\/spec(s)?\//, weight: 0.6 },
    { pattern: /\/__tests__\//, weight: 0.6 },
    { pattern: /\.test\./, weight: 0.5 },
    { pattern: /\.spec\./, weight: 0.5 },
    { pattern: /\/example(s)?\//, weight: 0.7 },
    { pattern: /\/sample(s)?\//, weight: 0.7 },
    { pattern: /\/mock(s)?\//, weight: 0.6 },
    { pattern: /\/fixtures?\//, weight: 0.5 },
    { pattern: /\/stubs?\//, weight: 0.5 }
  ];

  const configIndicators = [
    { pattern: /\/config\//, weight: 0.2 },
    { pattern: /\.env/, weight: 0.3 },
    { pattern: /\/deploy\//, weight: 0.3 },
    { pattern: /\/secrets?\//, weight: 0.1 },
    { pattern: /credentials/, weight: 0.1 }
  ];

  const realIndicators = [
    { pattern: /\/src\//, weight: 0.2 },
    { pattern: /\/app\//, weight: 0.2 },
    { pattern: /\/lib\//, weight: 0.15 },
    { pattern: /\/middleware\//, weight: 0.3 },
    { pattern: /\/services?\//, weight: 0.25 },
    { pattern: /\/controllers?\//, weight: 0.25 },
    { pattern: /\/api\//, weight: 0.25 },
    { pattern: /\/database\//, weight: 0.3 }
  ];

  let score = 0.5;
  const evidence = [];

  for (const { pattern, weight } of testIndicators) {
    if (pattern.test(lowerPath)) {
      score -= weight * 0.5;
      evidence.push(`File is in test/example directory`);
      return { score: Math.max(0.2, Math.round(score * 100) / 100), evidence: evidence.join(', ') };
    }
  }

  for (const { pattern, weight } of configIndicators) {
    if (pattern.test(lowerPath)) {
      score += weight * 0.2;
      evidence.push(`File is in configuration directory`);
      break;
    }
  }

  for (const { pattern, weight } of realIndicators) {
    if (pattern.test(lowerPath)) {
      score += weight * 0.3;
      evidence.push(`File is in production source directory`);
      break;
    }
  }

  score = Math.max(0, Math.min(1, score));

  return { score: Math.round(score * 100) / 100, evidence: evidence.length > 0 ? evidence.join(', ') : 'File in general code area' };
}

function analyzeSurroundingCode(lines, idx) {
  const beforeLines = lines.slice(Math.max(0, idx - 10), idx);
  const afterLines = lines.slice(idx + 1, idx + 6);

  let score = 0.5;
  const evidence = [];

  const isInTestBlock = beforeLines.some(l => /^\s*(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\s*[\(]/.test(l.trim()));
  if (isInTestBlock) {
    score -= 0.4;
    evidence.push('Finding is inside a test block');
  }

  const isInFunction = beforeLines.some(l => /^\s*(function|def|const\s+\w+\s*=\s*(\([^)]*\)|async\s*\([^)]*\))\s*=>)/.test(l.trim()));
  if (isInFunction) evidence.push('Finding is inside a function body');

  const hasConsoleLog = afterLines.some(l => /\bconsole\.(log|debug|info|warn)\b/.test(l.trim()));
  if (hasConsoleLog) {
    score -= 0.2;
    evidence.push('Value appears to be logged for debugging');
  }

  const hasEnvVarRef = beforeLines.slice(-3).some(l => /\bprocess\.env\b|os\.environ|getenv|env\(/i.test(l.trim()));
  if (hasEnvVarRef) {
    score -= 0.3;
    evidence.push('Code references environment variable pattern nearby');
  }

  const hasExport = beforeLines.slice(-2).some(l => /^\s*(export|module\.exports|export default)/.test(l.trim()));
  if (hasExport) {
    score += 0.15;
    evidence.push('Value is in an exported configuration');
  }

  score = Math.max(0, Math.min(1, score));

  return { score: Math.round(score * 100) / 100, evidence: evidence.length > 0 ? evidence.join(', ') : 'Standard code context' };
}

function analyzeAssignmentPattern(line, lines, idx) {
  const trimmed = line.trim();

  const envVarAssignment = /\bprocess\.env\.\w+|process\.env\[\s*['"]\w+['"]\s*\]/i.test(trimmed);
  if (envVarAssignment) {
    return { score: 0.1, evidence: 'Value is loaded from environment variable (secure pattern)' };
  }

  const hardcodedAssignment = /=\s*['"][^'"]+['"]\s*;?\s*$/.test(trimmed) && !trimmed.includes('process.env');
  if (hardcodedAssignment) {
    return { score: 0.8, evidence: 'Value is hardcoded directly in source (insecure pattern)' };
  }

  const ternaryOrFallback = /\s*\|\|\s*['"]/.test(trimmed) || /\s*\?\s*['"]/.test(trimmed);
  if (ternaryOrFallback) {
    return { score: 0.4, evidence: 'Value appears to be a fallback default' };
  }

  const concatenation = /['"]\s*\+/.test(trimmed);
  if (concatenation) {
    return { score: 0.6, evidence: 'Value is constructed via string concatenation' };
  }

  return { score: 0.5, evidence: 'Standard value assignment pattern' };
}

export function analyzeContext({ filePath, matchedValue, lineContent, allLines, lineIndex, secretType }) {
  const lines = allLines;

  const signals = [
    { name: 'Variable Naming', result: analyzeVariableNaming(lineContent, lines, lineIndex), weight: 1.0 },
    { name: 'Value Entropy', result: analyzeValueEntropy(matchedValue), weight: 1.0 },
    { name: 'Comment Context', result: analyzeCommentContext(lines, lineIndex), weight: 0.8 },
    { name: 'File Context', result: analyzeFileContext(filePath), weight: 0.7 },
    { name: 'Code Structure', result: analyzeSurroundingCode(lines, lineIndex), weight: 0.6 },
    { name: 'Assignment Pattern', result: analyzeAssignmentPattern(lineContent, lines, lineIndex), weight: 0.5 }
  ];

  let totalScore = 0;
  let totalWeight = 0;
  const signalDetails = [];

  for (const signal of signals) {
    totalScore += signal.result.score * signal.weight;
    totalWeight += signal.weight;
    signalDetails.push({
      name: signal.name,
      score: signal.result.score,
      evidence: signal.result.evidence
    });
  }

  const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 50;
  const clampedScore = Math.max(5, Math.min(99, finalScore));

  let decision;
  if (clampedScore >= 80) decision = VERDICTS.LEAK_CONFIRMED;
  else if (clampedScore >= 55) decision = VERDICTS.SUSPICIOUS;
  else if (clampedScore >= 30) decision = VERDICTS.TEST_DATA;
  else decision = VERDICTS.FALSE_POSITIVE;

  const highSignals = signalDetails.filter(s => s.score >= 0.7).map(s => s.name.toLowerCase());
  const lowSignals = signalDetails.filter(s => s.score < 0.4).map(s => s.name.toLowerCase());

  let reason;
  if (decision === VERDICTS.LEAK_CONFIRMED) {
    reason = `High-confidence detection: ${highSignals.join(', ')} signals strongly indicate this is a real, active credential exposed in source code. `;
    if (lowSignals.length > 0) reason += `Despite ${lowSignals.join(', ')} showing minor mitigating factors, the overall assessment confirms a genuine leak.`;
  } else if (decision === VERDICTS.SUSPICIOUS) {
    reason = `Moderate confidence: ${highSignals.join(', ') || 'some'} signals suggest this may be sensitive, but ${lowSignals.join(', ') || 'other signals'} indicate uncertainty. Manual review recommended.`;
  } else if (decision === VERDICTS.TEST_DATA) {
    reason = `Low confidence: ${lowSignals.join(', ') || 'Multiple'} signals indicate this is test or example data rather than a production credential. `;
    if (highSignals.length > 0) reason += `However, ${highSignals.join(', ')} still shows some credential-like characteristics.`;
  } else {
    reason = `Very low confidence: ${lowSignals.join(', ') || 'All'} signals indicate this is not a real credential. `;
    reason += `The matched pattern likely represents example code, commented-out data, or placeholder values.`;
  }

  return {
    decision,
    confidence: clampedScore,
    reason: reason.trim(),
    signalDetails,
    engine: 'rule-based'
  };
}

export async function analyzeWithOllama({ filePath, matchedValue, lineContent, allLines, lineIndex, secretType }) {
  const lines = allLines;
  const beforeLines = lines.slice(Math.max(0, lineIndex - 10), lineIndex);
  const afterLines = lines.slice(lineIndex + 1, lineIndex + 11);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        lineContent,
        beforeLines,
        afterLines,
        secretType,
        matchedValue
      })
    });

    const result = await response.json();

    if (!result.success) {
      const fallback = analyzeContext({ filePath, matchedValue, lineContent, allLines, lineIndex, secretType });
      return { ...fallback, engine: `ollama-unavailable (fallback: ${fallback.engine})` };
    }

    const signalDetails = [
      { name: 'LLM Analysis', score: result.confidence / 100, evidence: result.reason }
    ];

    const fallback = analyzeContext({ filePath, matchedValue, lineContent, allLines, lineIndex, secretType });
    for (const s of fallback.signalDetails) {
      if (s.name !== 'LLM Analysis') signalDetails.push(s);
    }

    return {
      decision: result.decision,
      confidence: result.confidence,
      reason: result.reason,
      signalDetails,
      engine: `ollama (${result.model || 'llama3.2'})`
    };
  } catch (err) {
    const fallback = analyzeContext({ filePath, matchedValue, lineContent, allLines, lineIndex, secretType });
    return { ...fallback, engine: `ollama-error (fallback: ${fallback.engine})` };
  }
}
