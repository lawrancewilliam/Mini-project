import { json } from '@sveltejs/kit';

const OLLAMA_BASE = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';

const SYSTEM_PROMPT = `You are a code security analyst. Your job is to analyze whether a detected string in source code is a real leaked credential or a false positive (example, mock, placeholder, test data).

Analyze the surrounding code context and respond with ONLY valid JSON in this exact format:
{
  "decision": "Leak Confirmed" or "Suspicious" or "Test Data" or "False Positive",
  "confidence": <number between 0-99>,
  "reason": "<1-2 sentence explanation of your analysis>"
}

Rules:
- "Leak Confirmed": The value is a real, active credential exposed in production/config code
- "Suspicious": Looks credential-like but context is unclear
- "Test Data": Example code, tutorial, mock data, test fixtures
- "False Positive": Commented-out code, placeholder values (xxxx, your-key-here), sample patterns

Consider: variable naming, comments, file path, test indicators, value entropy, hardcoded vs env-loaded.`;

export async function POST({ request }) {
  try {
    const { filePath, lineContent, beforeLines, afterLines, secretType, matchedValue } = await request.json();

    const surroundingLines = [
      ...(beforeLines || []).map(l => `  ${l}`),
      `>> ${lineContent}`,
      ...(afterLines || []).map(l => `  ${l}`)
    ].join('\n');

    const userPrompt = `File: ${filePath}
Secret Type Detected: ${secretType}
Matched Value: ${matchedValue}

Surrounding Code Context:
\`\`\`
${surroundingLines}
\`\`\`

Analyze this finding and respond with JSON.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1,
          num_predict: 256
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.response);

    return json({
      success: true,
      decision: parsed.decision || 'Suspicious',
      confidence: parsed.confidence || 50,
      reason: parsed.reason || 'Ollama analysis completed.',
      model: data.model || DEFAULT_MODEL
    });

  } catch (err) {
    return json({
      success: false,
      error: err.message,
      ollamaAvailable: false
    }, { status: 200 });
  }
}
