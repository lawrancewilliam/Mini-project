import jsPDF from 'jspdf';
import { RULES } from '$lib/detection-rules.js';
import { maskSensitiveValue, redactType, spanForMatch } from '$lib/masking.js';

// jsPDF ships ESM for browsers (default export = class) and CJS for Node
// (default export = namespace object). Normalize so this module works in both.
const JsPDF = typeof jsPDF === 'function' ? jsPDF : jsPDF.default || jsPDF;

// SecureGaurd professional PDF security report generator.
// Rendered with jsPDF vector primitives (no html2canvas): full control over
// A4 layout, dynamic pagination, repeating headers/footers and page numbers.

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_TOP = 22;
const CONTENT_BOTTOM = 275;

const DEFAULT_COLORS = {
  purple: [139, 92, 246],
  purpleDeep: [124, 58, 237],
  bg: [11, 11, 16],
  card: [21, 21, 30],
  cardAlt: [17, 17, 24],
  border: [41, 41, 55],
  borderSoft: [32, 32, 44],
  text: [244, 244, 245],
  muted: [156, 163, 175],
  faint: [113, 113, 122],
  white: [255, 255, 255],
  black: [17, 17, 17]
};

const SEVERITY = {
  Critical: { bg: [220, 38, 38], fg: [255, 255, 255] },
  High: { bg: [217, 82, 15], fg: [255, 255, 255] },
  Medium: { bg: [234, 179, 8], fg: [17, 17, 17] },
  Low: { bg: [34, 197, 94], fg: [17, 17, 17] }
};

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const VERDICT_LABELS = ['Leak Confirmed', 'Suspicious', 'Test Data', 'False Positive'];
const VERDICT_COLORS = {
  'Leak Confirmed': [248, 113, 113],
  Suspicious: [251, 146, 60],
  'Test Data': [148, 163, 184],
  'False Positive': [167, 139, 250]
};

const METER_BANDS = [
  { label: 'LOW', min: 0, max: 20, color: [34, 197, 94] },
  { label: 'MEDIUM', min: 20, max: 50, color: [234, 179, 8] },
  { label: 'HIGH', min: 50, max: 75, color: [251, 146, 60] },
  { label: 'CRITICAL', min: 75, max: 100, color: [220, 38, 38] }
];

const PRIORITY = {
  Critical: { title: 'IMMEDIATE ACTION', sub: 'Resolve within 24 hours' },
  High: { title: 'URGENT', sub: 'Resolve within one week' },
  Medium: { title: 'REVIEW REQUIRED', sub: 'Resolve in the next sprint' },
  Low: { title: 'LOW PRIORITY', sub: 'Resolve during routine hardening' }
};

const METHOD_STEPS = [
  'Archive intake and project metadata registration.',
  'Recursive ZIP extraction and file structure parsing.',
  'Static scanning of supported source and configuration files.',
  'Regex-based secret pattern detection across a prioritized rule set.',
  'Multi-signal AI context heuristics (variable naming, value entropy, assignment pattern, file context).',
  'Optional local LLM cross-validation for high-weight matches.',
  'Severity weighting and overall risk-score aggregation on a 0-100 scale.',
  'Masking of detected values, persistence to the RLS-scoped database, and report generation.'
];

const DETECTION_METHOD = 'Regex + Heuristic + AI Context Analysis';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Helpers (drawing / measuring)
// ---------------------------------------------------------------------------

function setFont(R, { size = 10, style = 'normal', font = 'helvetica', color = DEFAULT_COLORS.text } = {}) {
  R.pdf.setFont(font, style);
  R.pdf.setFontSize(size);
  R.pdf.setTextColor(color[0], color[1], color[2]);
}

function lineH(size) {
  return size * 0.48;
}

function wrap(R, str, width, size = 9, font = 'helvetica', style = 'normal') {
  setFont(R, { size, font, style });
  return R.pdf.splitTextToSize(str || '', width);
}

function wrappedHeight(R, str, width, size = 9, font = 'helvetica', style = 'normal') {
  const lines = wrap(R, str, width, size, font, style);
  return (lines.length || 1) * lineH(size);
}

function drawWrapped(R, str, x, y, width, size = 9, { font = 'helvetica', style = 'normal', color = DEFAULT_COLORS.text } = {}) {
  const lines = wrap(R, str, width, size, font, style);
  setFont(R, { size, font, style, color });
  lines.forEach((line, i) => {
    R.pdf.text(line, x, y + i * lineH(size), { baseline: 'top' });
  });
  return lines.length * lineH(size);
}

function drawRect(R, x, y, w, h, fill, stroke, lineWidth = 0.3) {
  R.pdf.setFillColor(fill[0], fill[1], fill[2]);
  if (stroke) {
    R.pdf.setDrawColor(stroke[0], stroke[1], stroke[2]);
    R.pdf.setLineWidth(lineWidth);
    R.pdf.roundedRect(x, y, w, h, 1.4, 1.4, 'FD');
  } else {
    R.pdf.roundedRect(x, y, w, h, 1.4, 1.4, 'F');
  }
}

function drawPill(R, x, y, w, h, label, bg, fg, size = 6.5) {
  drawRect(R, x, y, w, h, bg);
  setFont(R, { size, style: 'bold', color: fg });
  R.pdf.text(label, x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
}

function pillWidth(R, label, size = 6.5, padding = 5) {
  setFont(R, { size, style: 'bold' });
  return R.pdf.getTextWidth(label) + padding;
}

function newPage(R) {
  R.pdf.addPage();
  R.pdf.setFillColor(DEFAULT_COLORS.bg[0], DEFAULT_COLORS.bg[1], DEFAULT_COLORS.bg[2]);
  R.pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
  R.y = CONTENT_TOP;
  R.page++;
}

function ensure(R, needed) {
  if (R.y + needed > CONTENT_BOTTOM) newPage(R);
}

function sectionHeader(R, num, title, sub) {
  const h = 15;
  ensure(R, h);
  R.pdf.setFillColor(DEFAULT_COLORS.purple[0], DEFAULT_COLORS.purple[1], DEFAULT_COLORS.purple[2]);
  R.pdf.roundedRect(MARGIN, R.y, 1.8, 8.5, 0.8, 0.8, 'F');
  setFont(R, { size: 8.5, style: 'bold', color: DEFAULT_COLORS.purple });
  R.pdf.text(String(num).padStart(2, '0'), MARGIN + 5.5, R.y + 1.1, { baseline: 'top' });
  setFont(R, { size: 13.5, style: 'bold', color: DEFAULT_COLORS.text });
  R.pdf.text(title, MARGIN + 13.5, R.y + 0.9, { baseline: 'top' });
  if (sub) {
    setFont(R, { size: 8, color: DEFAULT_COLORS.muted });
    R.pdf.text(sub, MARGIN + 13.5, R.y + 8.1, { baseline: 'top' });
  }
  R.pdf.setDrawColor(DEFAULT_COLORS.border[0], DEFAULT_COLORS.border[1], DEFAULT_COLORS.border[2]);
  R.pdf.setLineWidth(0.25);
  R.pdf.line(MARGIN, R.y + 12.6, PAGE_W - MARGIN, R.y + 12.6);
  R.y += h;
}

// ---------------------------------------------------------------------------
// Data derivation
// ---------------------------------------------------------------------------

export function reportIdFor(item) {
  const raw = String((item && item.id) || '');
  const clean = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  return `SEC-${clean || 'REPORT'}`;
}

function levelFromScore(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MEDIUM';
  return 'LOW';
}

function securityStatus(data) {
  const { score, findings } = data;
  const critical = findings.filter(f => f.severity === 'Critical').length;
  const significant = findings.filter(f =>
    (f.severity === 'High' || f.severity === 'Medium') &&
    (f.decision === 'Leak Confirmed' || f.decision === 'Suspicious'));
  if (score >= 75 || critical > 0) {
    return { label: 'FAIL', bg: [220, 38, 38], fg: [255, 255, 255],
      text: 'Immediate action required - critical exposure detected.' };
  }
  if (findings.length === 0) {
    return { label: 'PASS', bg: [34, 197, 94], fg: [17, 17, 17],
      text: 'No sensitive data exposure detected in the scanned codebase.' };
  }
  if (significant.length > 0 || score >= 40) {
    return { label: 'REVIEW REQUIRED', bg: [251, 146, 60], fg: [17, 17, 17],
      text: 'Findings were discovered and require review and remediation.' };
  }
  return { label: 'PASS', bg: [34, 197, 94], fg: [17, 17, 17],
    text: 'No significant exposure found. Routine hardening is still recommended.' };
}

function deriveReportData(item) {
  const findings = (item.findings || []).slice().sort((a, b) => {
    const d = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (d !== 0) return d;
    return (Number(b.confidence) || 0) - (Number(a.confidence) || 0);
  });

  const sevCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  findings.forEach(f => {
    if (sevCounts[f.severity] != null) sevCounts[f.severity]++;
  });

  const byVerdict = { 'Leak Confirmed': 0, Suspicious: 0, 'Test Data': 0, 'False Positive': 0 };
  findings.forEach(f => {
    const k = f.decision;
    if (byVerdict[k] != null) byVerdict[k]++;
  });

  const byType = {};
  findings.forEach(f => {
    byType[f.secretType] = (byType[f.secretType] || 0) + 1;
  });
  const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const filesScanned = Number(item.filesScanned) || 0;
  const score = Math.max(0, Math.min(100, Math.round(Number(item.riskScore) || 0)));

  const data = {
    item,
    id: reportIdFor(item),
    date: item.date || '',
    generatedAt: new Date(),
    scanName: item.projectName || 'Untitled Project',
    filesScanned,
    total: findings.length,
    score,
    level: levelFromScore(score),
    storedLevel: item.riskLevel || '',
    findings,
    sevCounts,
    byVerdict,
    sortedTypes,
    confirmed: byVerdict['Leak Confirmed'],
    suspicious: byVerdict.Suspicious,
    testData: byVerdict['Test Data'],
    falsePositive: byVerdict['False Positive']
  };
  data.status = securityStatus(data);
  return data;
}

// ---------------------------------------------------------------------------
// Masked value + context snippet consumption
// ---------------------------------------------------------------------------

// The PDF consumes finding.masked_value / finding.context_snippet as-is; they
// were redacted by the scanner before persistence. These helpers only provide a
// safe fallback for legacy/partial data and never re-mask a whole line again.

function maskedForFinding(f) {
  if (f && f.maskedValue && typeof f.maskedValue === 'string' && f.maskedValue.trim()) {
    return f.maskedValue.trim();
  }
  // Defensive fallback: derive the value from the context and mask just it.
  const secretType = (f && f.secretType) || '';
  const text = (f && f.codeContext) || '';
  const rule = secretType ? RULES.find(r => r.name === secretType) : null;
  const occurrences = [];
  if (rule) {
    rule.regex.lastIndex = 0;
    let m;
    while ((m = rule.regex.exec(String(text))) !== null) {
      const span = spanForMatch(m, rule);
      occurrences.push({ raw: span.raw });
    }
  }
  if (occurrences.length > 0) return maskSensitiveValue(occurrences[0].raw, secretType);
  return `${secretType || 'Sensitive value'} [masked]`;
}

// Context lines are already redacted in the DB. Only scrub residual plaintext
// occurrences (of the finding's own type, plus stray emails) without touching
// the rest of the line.
function safeContext(ctx, type) {
  if (!ctx) return '';
  let out = String(ctx);
  const rule = type ? RULES.find(r => r.name === type) : null;
  if (rule) out = redactType(out, rule);
  // Stray email addresses are a common cross-type leak; mask any survivors.
  const emailRule = RULES.find(r => r.name === 'Email Address PII');
  return redactType(out, emailRule);
}

function fallbackReason(f) {
  switch (f.decision) {
    case 'Suspicious':
      return 'The value matches a secret-like pattern, but the surrounding context is ambiguous, so confidence remains below the confirmed threshold.';
    case 'Test Data':
      return 'The value matches a secret-like pattern, but the surrounding context indicates it is likely test or demonstration data rather than a production credential.';
    case 'False Positive':
      return 'The value matched a secret-like pattern, but the surrounding context indicates it is not a genuine credential.';
    default:
      return 'The value matched a known secret pattern and the surrounding context did not indicate a legitimate, non-secret use case.';
  }
}

function fallbackFix(f) {
  if (f.decision === 'Test Data' || f.decision === 'False Positive') {
    return 'If this value is not required at runtime, replace it with a placeholder. If it is required, move it to an environment variable or a secret manager.';
  }
  return 'If the exposed value is real, rotate or revoke it immediately, remove it from the codebase, and manage it with a secret vault or environment variable.';
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function drawLogo(R, x, y, size) {
  R.pdf.setFillColor(DEFAULT_COLORS.purple[0], DEFAULT_COLORS.purple[1], DEFAULT_COLORS.purple[2]);
  R.pdf.roundedRect(x, y, size, size, size * 0.22, size * 0.22, 'F');
  const s = size / 12;
  R.pdf.setDrawColor(DEFAULT_COLORS.white[0], DEFAULT_COLORS.white[1], DEFAULT_COLORS.white[2]);
  R.pdf.setLineWidth(s * 1.1);
  const ox = x + 2.6 * s;
  const oy = y + 2.6 * s;
  R.pdf.line(ox, oy, ox + 4.8 * s, oy + 7 * s);
  R.pdf.line(ox + 4.8 * s, oy + 7 * s, ox + 9.6 * s, oy);
}

function coverSection(R, data) {
  const P = DEFAULT_COLORS;
  let y = R.y;

  // Top row: logo + wordmark (left), report title/meta (right)
  drawLogo(R, MARGIN, y, 12);
  setFont(R, { size: 21, style: 'bold', color: P.text });
  R.pdf.text('SecureGaurd', MARGIN + 17, y + 0.4, { baseline: 'top' });
  setFont(R, { size: 7.5, style: 'bold', color: P.muted });
  R.pdf.text('AI-ASSISTED SENSITIVE DATA LEAKAGE DETECTION', MARGIN + 17, y + 8.2, { baseline: 'top' });

  setFont(R, { size: 12.5, style: 'bold', color: P.text });
  R.pdf.text('SECURITY ASSESSMENT REPORT', PAGE_W - MARGIN, y, { align: 'right', baseline: 'top' });
  setFont(R, { size: 7.5, color: P.faint });
  R.pdf.text(`Generated: ${fmtDate(data.generatedAt)} at ${fmtTime(data.generatedAt)}`, PAGE_W - MARGIN, y + 7.4, { align: 'right', baseline: 'top' });
  R.pdf.text(`Report ID: ${data.id}`, PAGE_W - MARGIN, y + 11.2, { align: 'right', baseline: 'top' });
  y += 17;

  // Accent divider
  R.pdf.setDrawColor(P.purple[0], P.purple[1], P.purple[2]);
  R.pdf.setLineWidth(0.6);
  R.pdf.line(MARGIN, y, MARGIN + 62, y);
  R.pdf.setDrawColor(P.border[0], P.border[1], P.border[2]);
  R.pdf.setLineWidth(0.2);
  R.pdf.line(MARGIN + 62, y, PAGE_W - MARGIN, y);
  y += 9;

  R.y = y;

  // Executive summary (dynamic)
  sectionHeader(R, 1, 'Executive Summary', 'Overview of the assessment for this project');
  const ex = [
    `SecureGaurd performed an automated sensitive-data leakage assessment against the project "${data.scanName}".`,
    `A total of ${data.filesScanned} key source and configuration files were analyzed, and ${data.total} potential exposure${data.total === 1 ? '' : 's'} were identified (${data.sevCounts.Critical} Critical, ${data.sevCounts.High} High, ${data.sevCounts.Medium} Medium, ${data.sevCounts.Low} Low).`,
    `AI verdict breakdown - ${data.confirmed} Leak Confirmed, ${data.suspicious} Suspicious, ${data.testData} Test Data and ${data.falsePositive} False Positive.`,
    `The overall risk score is ${data.score} / 100 (${data.level}), placing this project at a status of ${data.status.label}.`
  ];
  ex.forEach((line, i) => {
    if (i > 0 && R.y + lineH(9) * 2 > CONTENT_BOTTOM) newPage(R);
    drawWrapped(R, line, MARGIN + 3.5, R.y, CONTENT_W - 7, 9);
    R.y += lineH(9) + 1.1;
  });
  R.y += 4;

  // Security status banner
  ensure(R, 22);
  drawRect(R, MARGIN, R.y, CONTENT_W, 20, P.card, P.border);
  setFont(R, { size: 7, style: 'bold', color: P.faint });
  R.pdf.text('SECURITY STATUS', MARGIN + 8, R.y + 6.2, { baseline: 'top' });
  const badgeW = pillWidth(R, data.status.label, 8.5, 14);
  drawPill(R, PAGE_W - MARGIN - badgeW - 8, R.y + 4.6, badgeW, 8, data.status.label, data.status.bg, data.status.fg, 8.5);
  setFont(R, { size: 8, color: P.muted });
  const statusW = CONTENT_W - badgeW - 26;
  R.pdf.text(data.status.text, MARGIN + 8, R.y + 13.2, { baseline: 'top', maxWidth: statusW });
  R.y += 24;

  // Risk cards
  const cards = [
    { label: 'Files Scanned', value: String(data.filesScanned), color: P.text, sub: 'key files' },
    { label: 'Findings', value: String(data.total), color: P.text, sub: 'detected' },
    { label: 'Critical', value: String(data.sevCounts.Critical), color: [248, 113, 113], sub: 'exposures' },
    { label: 'Risk Score', value: `${data.score}`, color: DEFAULT_COLORS.purple, sub: data.level }
  ];
  const gap = 4;
  const cardW = (CONTENT_W - gap * 3) / 4;
  ensure(R, 26);
  cards.forEach((c, i) => {
    const x = MARGIN + i * (cardW + gap);
    drawRect(R, x, R.y, cardW, 24, P.card, P.border);
    setFont(R, { size: 7, style: 'bold', color: P.faint });
    R.pdf.text(c.label.toUpperCase(), x + cardW / 2, R.y + 5.2, { align: 'center', baseline: 'top' });
    setFont(R, { size: 14, style: 'bold', color: c.color });
    R.pdf.text(c.value, x + cardW / 2, R.y + 11.8, { align: 'center', baseline: 'top' });
    setFont(R, { size: 6.5, color: P.muted });
    R.pdf.text(c.sub, x + cardW / 2, R.y + 19.2, { align: 'center', baseline: 'top' });
  });
  R.y += 28;

  // Risk meter
  ensure(R, 34);
  const meterCardY = R.y;
  drawRect(R, MARGIN, meterCardY, CONTENT_W, 32, P.card, P.border);
  setFont(R, { size: 7, style: 'bold', color: P.faint });
  R.pdf.text('RISK METER', MARGIN + 8, meterCardY + 5.4, { baseline: 'top' });
  setFont(R, { size: 12, style: 'bold', color: P.text });
  R.pdf.text(`${data.score}/100`, PAGE_W - MARGIN - 8, meterCardY + 4.6, { align: 'right', baseline: 'top' });

  const meterX = MARGIN + 8;
  const meterW = CONTENT_W - 16;
  const bandH = 5.6;
  let cx = meterX;
  const scale = meterW / 100;
  METER_BANDS.forEach(b => {
    const w = (b.max - b.min) * scale;
    R.pdf.setFillColor(b.color[0], b.color[1], b.color[2]);
    R.pdf.rect(cx, meterCardY + 11.4, w, bandH, 'FD');
    setFont(R, { size: 6, color: P.muted });
    R.pdf.text(b.label, cx + w / 2, meterCardY + 20.4, { align: 'center', baseline: 'top' });
    cx += w;
  });

  const markerX = meterX + Math.max(0.5, Math.min(100, data.score)) * scale;
  R.pdf.setDrawColor(P.white[0], P.white[1], P.white[2]);
  R.pdf.setLineWidth(1);
  R.pdf.line(markerX, meterCardY + 9.6, markerX, meterCardY + 18.9);
  setFont(R, { size: 7.5, style: 'bold', color: P.text });
  R.pdf.text(String(data.score), markerX, meterCardY + 26, { align: 'center', baseline: 'top' });

  R.y = meterCardY + 36;
  newPage(R);
}

function barRow(R, label, count, total, color, maxW = CONTENT_W - 30) {
  ensure(R, 11);
  setFont(R, { size: 8.5, style: 'bold', color: DEFAULT_COLORS.text });
  R.pdf.text(label, MARGIN, R.y, { baseline: 'top' });
  setFont(R, { size: 8.5, style: 'bold', color: color });
  R.pdf.text(String(count), MARGIN + 90, R.y, { baseline: 'top' });
  R.y += 4.4;
  const barH = 3.4;
  R.pdf.setFillColor(DEFAULT_COLORS.cardAlt[0], DEFAULT_COLORS.cardAlt[1], DEFAULT_COLORS.cardAlt[2]);
  R.pdf.roundedRect(MARGIN, R.y, maxW, barH, 1, 1, 'F');
  if (count > 0 && total > 0) {
    const frac = Math.max(0.02, count / total);
    R.pdf.setFillColor(color[0], color[1], color[2]);
    R.pdf.roundedRect(MARGIN, R.y, maxW * frac, barH, 1, 1, 'F');
  }
  R.y += barH + 3.4;
}

function overviewSection(R, data) {
  const P = DEFAULT_COLORS;
  sectionHeader(R, 2, 'Security Analysis Overview', 'Distribution of findings, verdicts and exposure types');

  drawWrapped(R, 'Severity distribution across all identified findings.', MARGIN, R.y, CONTENT_W, 8.5, { color: P.muted });
  R.y += lineH(8.5) + 3;

  const order = ['Critical', 'High', 'Medium', 'Low'];
  const maxSev = Math.max(1, ...order.map(s => data.sevCounts[s]));
  order.forEach(s => {
    barRow(R, s, data.sevCounts[s], maxSev, SEVERITY[s].bg);
  });
  R.y += 4;

  drawWrapped(R, 'AI verdict distribution computed by the context-aware analysis engine.', MARGIN, R.y, CONTENT_W, 8.5, { color: P.muted });
  R.y += lineH(8.5) + 3;

  VERDICT_LABELS.forEach(v => {
    barRow(R, v, data.byVerdict[v], Math.max(1, ...Object.values(data.byVerdict)), VERDICT_COLORS[v]);
  });
  R.y += 4;

  // Secret type breakdown table
  ensure(R, 16);
  setFont(R, { size: 8.5, style: 'bold', color: P.text });
  R.pdf.text('Secret Type Breakdown', MARGIN, R.y, { baseline: 'top' });
  R.y += 5;
  drawRect(R, MARGIN, R.y, CONTENT_W, 8, P.cardAlt, P.border);
  setFont(R, { size: 6.5, style: 'bold', color: P.faint });
  R.pdf.text('SECRET TYPE', MARGIN + 6, R.y + 2.4, { baseline: 'top' });
  R.pdf.text('COUNT', MARGIN + 96, R.y + 2.4, { baseline: 'top' });
  R.pdf.text('SHARE', PAGE_W - MARGIN - 6, R.y + 2.4, { align: 'right', baseline: 'top' });
  R.y += 8;

  if (data.sortedTypes.length === 0) {
    ensure(R, 10);
    setFont(R, { size: 8.5, color: P.muted });
    R.pdf.text('No secret types detected.', MARGIN + 6, R.y + 2, { baseline: 'top' });
    R.y += 8;
  } else {
    data.sortedTypes.forEach(([type, count]) => {
      ensure(R, 11);
      R.pdf.setFillColor(P.bg[0], P.bg[1], P.bg[2]);
      R.pdf.rect(MARGIN, R.y, CONTENT_W, 9, 'F');
      R.pdf.setDrawColor(P.borderSoft[0], P.borderSoft[1], P.borderSoft[2]);
      R.pdf.setLineWidth(0.15);
      R.pdf.line(MARGIN, R.y + 9, PAGE_W - MARGIN, R.y + 9);
      setFont(R, { size: 8.5, color: P.text });
      R.pdf.text(type, MARGIN + 6, R.y + 3.1, { baseline: 'top' });
      setFont(R, { size: 8.5, style: 'bold', color: P.text });
      R.pdf.text(String(count), MARGIN + 96, R.y + 3.1, { baseline: 'top' });
      setFont(R, { size: 8.5, color: P.muted });
      R.pdf.text(`${Math.round((count / Math.max(1, data.total)) * 100)}%`, PAGE_W - MARGIN - 6, R.y + 3.1, { align: 'right', baseline: 'top' });
      R.y += 10;
    });
  }
  R.y += 4;

  // Risk interpretation
  ensure(R, 24);
  setFont(R, { size: 8.5, style: 'bold', color: P.text });
  R.pdf.text('Risk Interpretation', MARGIN, R.y, { baseline: 'top' });
  R.y += 5;
  const interp = data.score >= 75
    ? `A risk score of ${data.score}/100 indicates a critical exposure posture. Confirmed credentials or personal data in source code should be treated as compromised: rotate affected values, remove them from the repository, and re-scan.`
    : data.score >= 50
      ? `A risk score of ${data.score}/100 indicates a high exposure posture. Prioritize the High and Critical findings in this report, rotate any exposed credentials, and apply the remediation plan in Section 5 before the next release.`
      : data.score >= 25
        ? `A risk score of ${data.score}/100 indicates a moderate exposure posture. The findings are mostly Medium or review-level; validate the suspicious items and harden configuration handling.`
        : data.total > 0
          ? `A risk score of ${data.score}/100 reflects a low exposure posture, however ${data.total} finding${data.total === 1 ? '' : 's'} were still detected. Confirm that masked values are placeholders and keep secrets out of source control.`
          : `A risk score of ${data.score}/100 indicates a clean exposure posture for the scanned files. Continue to keep secrets in environment variables or a secret manager.`;
  const usedH = drawWrapped(R, interp, MARGIN, R.y, CONTENT_W, 9, { color: P.muted });
  R.y += usedH + 2;
}

function findingsSummarySection(R, data) {
  const P = DEFAULT_COLORS;
  sectionHeader(R, 3, 'Findings Summary', 'All detections sorted by severity and confidence');

  setFont(R, { size: 7.5, color: P.muted });
  R.pdf.text('Detected values are masked in this report. Raw secret material is never printed.', MARGIN, R.y, { baseline: 'top' });
  R.y += 5;

  const cols = [
    { w: 9, h: '#' },
    { w: 60, h: 'File' },
    { w: 11, h: 'Line' },
    { w: 27, h: 'Secret Type' },
    { w: 19, h: 'Severity' },
    { w: 36, h: 'AI Verdict' },
    { w: 16, h: 'Conf.' }
  ];

  const headerH = 9;
  drawRect(R, MARGIN, R.y, CONTENT_W, headerH, P.card, P.border);
  setFont(R, { size: 6.5, style: 'bold', color: P.faint });
  let hx = MARGIN;
  cols.forEach((c, i) => {
    const isCenter = i === 2 || i === 4 || i === 6;
    R.pdf.text(c.h, isCenter ? hx + c.w / 2 : hx + 4, R.y + 2.6, { align: isCenter ? 'center' : 'left', baseline: 'top' });
    hx += c.w;
  });
  R.y += headerH;

  function tableHeader() {
    drawRect(R, MARGIN, R.y, CONTENT_W, headerH, P.card, P.border);
    setFont(R, { size: 6.5, style: 'bold', color: P.faint });
    let hx2 = MARGIN;
    cols.forEach((c, i) => {
      const isCenter = i === 2 || i === 4 || i === 6;
      R.pdf.text(c.h, isCenter ? hx2 + c.w / 2 : hx2 + 4, R.y + 2.6, { align: isCenter ? 'center' : 'left', baseline: 'top' });
      hx2 += c.w;
    });
    R.y += headerH;
  }

  if (data.findings.length === 0) {
    ensure(R, 16);
    drawRect(R, MARGIN, R.y, CONTENT_W, 14, P.cardAlt, P.border);
    setFont(R, { size: 9, color: P.muted });
    R.pdf.text('No sensitive data exposures detected in the scanned codebase.', MARGIN + 6, R.y + 4.5, { baseline: 'top' });
    R.y += 18;
    return;
  }

  data.findings.forEach((f, i) => {
    const fileLines = wrap(R, f.file || '?', cols[1].w - 8, 7.5, 'courier', 'normal');
    const lines = Math.max(1, fileLines.length);
    const rowH = lines * lineH(7.5) + 5;

    if (R.y + rowH > CONTENT_BOTTOM) {
      newPage(R);
      tableHeader();
    }

    R.pdf.setFillColor(i % 2 === 0 ? P.cardAlt[0] : P.card[0], i % 2 === 0 ? P.cardAlt[1] : P.card[1], i % 2 === 0 ? P.cardAlt[2] : P.card[2]);
    R.pdf.rect(MARGIN, R.y, CONTENT_W, rowH, 'F');

    let x = MARGIN;
    setFont(R, { size: 7.5, color: P.faint });
    R.pdf.text(String(i + 1), x + 4, R.y + 3, { baseline: 'top' });
    x += cols[0].w;

    setFont(R, { size: 7.5, color: P.muted, font: 'courier' });
    fileLines.forEach((ln, li) => {
      R.pdf.text(ln, x + 4, R.y + 3 + li * lineH(7.5), { baseline: 'top' });
    });
    x += cols[1].w;

    setFont(R, { size: 7.5, color: P.muted, font: 'courier' });
    R.pdf.text(String(f.line ?? ''), x + cols[2].w / 2, R.y + 3, { align: 'center', baseline: 'top' });
    x += cols[2].w;

    setFont(R, { size: 7.5, color: P.text });
    R.pdf.text((f.secretType || 'Unknown').slice(0, 30), x + 4, R.y + 3, { baseline: 'top' });
    x += cols[3].w;

    const sev = SEVERITY[f.severity] || SEVERITY.Low;
    const pw = pillWidth(R, f.severity, 6.5, 6);
    drawPill(R, x + 4, R.y + 1.4, Math.max(pw, 14), 5.4, f.severity, sev.bg, sev.fg, 6.5);
    x += cols[4].w;

    setFont(R, { size: 7.5, style: 'bold', color: VERDICT_COLORS[f.decision] || P.muted });
    R.pdf.text(f.decision || 'Unknown', x + 4, R.y + 3, { baseline: 'top' });
    x += cols[5].w;

    setFont(R, { size: 7.5, style: 'bold', color: P.text });
    R.pdf.text(`${Math.round(Number(f.confidence) || 0)}%`, x + cols[6].w / 2, R.y + 3, { align: 'center', baseline: 'top' });

    R.y += rowH;
  });
  R.y += 2;
}

function ctxWidth(ctx, fullW) {
  if (!ctx) return 0;
  const longest = ctx.split('\n').reduce((m, l) => Math.max(m, l.length), 0);
  return Math.min(fullW, Math.max(90, longest * 1.02));
}

function textValueH(R, value, width, size, font) {
  return 3 + wrappedHeight(R, value, width, size, font || 'helvetica', 'normal');
}

function measureCard(R, f) {
  const pad = 6;
  const colW = (CONTENT_W - pad * 2 - 8) / 2;
  const fullW = CONTENT_W - pad * 2;
  const reason = f.reason || fallbackReason(f);
  const fix = f.fix || fallbackFix(f);
  const ctx = safeContext(f.codeContext || '', f.secretType);

  const locationH = textValueH(R, `${f.file || ''}:${f.line ?? ''}`, colW, 7.5, 'courier');
  const verdictH = textValueH(R, f.decision || 'Unknown', colW, 7.5, 'helvetica');
  const methodH = textValueH(R, DETECTION_METHOD, colW, 7.5, 'helvetica');
  const leftH = textValueH(R, f.secretType || 'Unknown', colW, 7.5, 'helvetica') +
    locationH +
    textValueH(R, `${Math.round(Number(f.confidence) || 0)}%`, colW, 7.5, 'helvetica');
  const rightH = 13.2 + verdictH + methodH;
  const gridH = Math.max(leftH, rightH);

  const maskedH = 3 + 5.5 + 3;

  let ctxH = 0;
  if (ctx) {
    const w = ctxWidth(ctx, fullW);
    const lines = wrap(R, ctx, w, 6.5, 'courier', 'normal');
    const truncated = lines.length > 8;
    ctxH = 3 + Math.min(8, lines.length) * lineH(6.5) + 5 + (truncated ? 3 : 0);
  }

  const aiH = textValueH(R, reason, fullW, 8.5, 'helvetica');
  const fixH = textValueH(R, fix, fullW, 8.5, 'helvetica');

  const headerH = 9.5;
  return pad + headerH + gridH + maskedH + 2 + ctxH + 2 + aiH + 2 + fixH + pad + 2;
}

function drawBlock(R, x, label, value, y, width, opts = {}) {
  const { size = 7.5, font = 'helvetica' } = opts;
  setFont(R, { size: 6.5, style: 'bold', color: DEFAULT_COLORS.purple });
  R.pdf.text(label, x, y, { baseline: 'top' });
  drawWrapped(R, value, x, y + 3, width, size, { font, color: DEFAULT_COLORS.text });
  return y + 3 + wrappedHeight(R, value, width, size, font, 'normal');
}

function drawPillBlock(R, x, label, text, y, sev) {
  setFont(R, { size: 6.5, style: 'bold', color: DEFAULT_COLORS.purple });
  R.pdf.text(label, x, y, { baseline: 'top' });
  const pw = pillWidth(R, text, 7, 9);
  drawPill(R, x, y + 3, Math.max(pw, 18), 7.2, text, sev.bg, sev.fg, 7);
  return y + 3 + 7.2 + 3;
}

function drawFindingCard(R, f, index) {
  const P = DEFAULT_COLORS;
  const pad = 6;
  const colW = (CONTENT_W - pad * 2 - 8) / 2;
  const fullW = CONTENT_W - pad * 2;
  const reason = f.reason || fallbackReason(f);
  const fix = f.fix || fallbackFix(f);
  const ctx = safeContext(f.codeContext || '', f.secretType);
  const masked = maskedForFinding(f);
  const sev = SEVERITY[f.severity] || SEVERITY.Low;

  const cardH = measureCard(R, f);
  ensure(R, cardH);

  const cardY = R.y;
  drawRect(R, MARGIN, cardY, CONTENT_W, cardH, P.card, P.border);
  let y = cardY + pad;
  const xL = MARGIN + pad;
  const xR = xL + colW + 8;

  // Card header
  R.pdf.setFillColor(P.purple[0], P.purple[1], P.purple[2]);
  R.pdf.roundedRect(xL, y, 9, 9, 1.8, 1.8, 'F');
  setFont(R, { size: 7.5, style: 'bold', color: P.white });
  R.pdf.text(`#${index + 1}`, xL + 4.5, y + 4.5, { align: 'center', baseline: 'middle' });

  setFont(R, { size: 10, style: 'bold', color: P.text });
  R.pdf.text(f.secretType || 'Unknown', xL + 14, y + 1, { baseline: 'top' });
  setFont(R, { size: 7, color: P.faint, font: 'courier' });
  R.pdf.text(`${f.file || ''}:${f.line ?? ''}`, xL + 14, y + 5.4, { baseline: 'top' });

  const pw = pillWidth(R, f.severity, 7, 9);
  drawPill(R, PAGE_W - MARGIN - pad - pw, y, pw, 6.2, f.severity, sev.bg, sev.fg, 7);
  y += 9.5;

  // Two-column detail grid
  const startY = y;
  let yL = startY;
  let yR = startY;
  yL = drawBlock(R, xL, 'SECRET TYPE', f.secretType || 'Unknown', yL, colW);
  yR = drawPillBlock(R, xR, 'SEVERITY', f.severity, yR, sev);
  yL = drawBlock(R, xL, 'LOCATION', `${f.file || ''}:${f.line ?? ''}`, yL, colW, { font: 'courier' });
  yR = drawBlock(R, xR, 'AI VERDICT', f.decision || 'Unknown', yR, colW);
  yL = drawBlock(R, xL, 'CONFIDENCE', `${Math.round(Number(f.confidence) || 0)}%`, yL, colW);
  yR = drawBlock(R, xR, 'DETECTION METHOD', DETECTION_METHOD, yR, colW);
  y = Math.max(yL, yR);

  // Masked value (full width)
  setFont(R, { size: 6.5, style: 'bold', color: P.purple });
  R.pdf.text('MASKED VALUE', xL, y, { baseline: 'top' });
  y += 3;
  drawRect(R, xL, y, fullW, 5.5, P.bg, P.borderSoft);
  setFont(R, { size: 7.5, color: [134, 239, 172] });
  R.pdf.text(`> ${masked}`, xL + 3, y + 1.5, { baseline: 'top' });
  y += 8.5;

  // Context snippet
  if (ctx) {
    y += 2;
    setFont(R, { size: 6.5, style: 'bold', color: P.purple });
    R.pdf.text('CONTEXT SNIPPET (MASKED)', xL, y, { baseline: 'top' });
    y += 3;
    const w = ctxWidth(ctx, fullW);
    const lines = wrap(R, ctx, w, 6.5, 'courier', 'normal');
    const shown = lines.slice(0, 8);
    const truncated = lines.length > 8;
    const ctxH = Math.min(8, lines.length) * lineH(6.5) + 5;
    drawRect(R, xL, y, w, ctxH, P.bg, P.borderSoft);
    setFont(R, { size: 6.5, color: P.muted, font: 'courier' });
    shown.forEach((ln, i) => {
      R.pdf.text(ln === '' ? ' ' : ln.substring(0, 160), xL + 3, y + 2 + i * lineH(6.5), { baseline: 'top' });
    });
    y += ctxH;
    if (truncated) {
      y += 3;
      setFont(R, { size: 6.5, color: P.faint });
      R.pdf.text('... context snippet truncated for brevity', xL, y, { baseline: 'top' });
    }
  } else {
    y += 2;
  }

  // AI analysis
  y += 2;
  setFont(R, { size: 6.5, style: 'bold', color: P.purple });
  R.pdf.text('AI ANALYSIS', xL, y, { baseline: 'top' });
  y += 3;
  y += drawWrapped(R, reason, xL, y, fullW, 8.5);

  // Recommended action
  y += 2;
  setFont(R, { size: 6.5, style: 'bold', color: P.purple });
  R.pdf.text('RECOMMENDED ACTION', xL, y, { baseline: 'top' });
  y += 3;
  y += drawWrapped(R, fix, xL, y, fullW, 8.5);

  R.y = cardY + cardH + 4;
}

function detailedSection(R, data) {
  const P = DEFAULT_COLORS;
  sectionHeader(R, 4, 'Detailed Finding Analysis', 'Per-finding AI analysis, context and remediation');

  if (data.findings.length === 0) {
    ensure(R, 18);
    drawRect(R, MARGIN, R.y, CONTENT_W, 16, P.card, P.border);
    setFont(R, { size: 9, color: P.muted });
    R.pdf.text('No detailed findings to display - the scan reported a clean result.', MARGIN + 6, R.y + 5, { baseline: 'top' });
    R.y += 20;
    return;
  }

  data.findings.forEach((f, i) => {
    drawFindingCard(R, f, i);
  });
}

function remediationSection(R, data) {
  const P = DEFAULT_COLORS;
  sectionHeader(R, 5, 'Prioritized Remediation Plan', 'Ordered set of actions grouped by severity');

  const order = ['Critical', 'High', 'Medium', 'Low'];
  order.forEach(sev => {
    const group = data.findings.filter(f => f.severity === sev);
    const pri = PRIORITY[sev];
    ensure(R, 16);
    const sevCol = SEVERITY[sev].bg;
    drawRect(R, MARGIN, R.y, CONTENT_W, 14, P.card, P.border);
    const bw = pillWidth(R, sev, 7, 10);
    drawPill(R, MARGIN + 6, R.y + 3.1, Math.max(bw, 20), 7.4, sev, sevCol, SEVERITY[sev].fg, 7);
    setFont(R, { size: 9.5, style: 'bold', color: P.text });
    R.pdf.text(pri.title, MARGIN + 34, R.y + 2.9, { baseline: 'top' });
    setFont(R, { size: 7, color: P.faint });
    R.pdf.text(`${pri.sub}  |  ${group.length} finding${group.length === 1 ? '' : 's'}`, MARGIN + 34, R.y + 7.6, { baseline: 'top' });
    R.y += 16;

    if (group.length === 0) {
      ensure(R, 9);
      setFont(R, { size: 8.5, style: 'italic', color: P.faint });
      R.pdf.text(`No ${sev === 'Medium' ? 'Medium' : sev} findings in this category.`, MARGIN + 6, R.y + 2, { baseline: 'top' });
      R.y += 7;
      return;
    }

    group.forEach((f, i) => {
      const fix = f.fix || fallbackFix(f);
      const item = `${f.file || '?'}:${f.line ?? '?'}  -  ${f.secretType || 'Unknown'}  -  ${fix}`;
      const itemH = 4 + wrappedHeight(R, `-  ${item}`, CONTENT_W - 12, 8);
      ensure(R, itemH + 2);
      setFont(R, { size: 8, color: P.text });
      const lines = wrap(R, `-  ${item}`, CONTENT_W - 12, 8);
      setFont(R, { size: 8, color: P.text });
      let ly = R.y;
      lines.forEach((ln, li) => {
        R.pdf.text(ln, MARGIN + 6, ly + li * lineH(8), { baseline: 'top' });
      });
      R.y += itemH;
    });
    R.y += 2;
  });

  // Security checklist
  ensure(R, 20);
  setFont(R, { size: 9, style: 'bold', color: P.text });
  R.pdf.text('Security Hardening Checklist', MARGIN, R.y, { baseline: 'top' });
  R.y += 5;
  const checklist = [
    ...(data.confirmed > 0 ? ['Rotate and revoke all credentials classified as confirmed leaks.'] : []),
    ...(data.suspicious > 0 ? ['Manually validate and remediate suspicious findings before release.'] : []),
    ...(data.total > 0 ? ['Remove hardcoded secrets from source; load them from environment variables or a secret manager.'] : []),
    ...(data.byVerdict['Test Data'] > 0 ? ['Replace production-like test credentials with sanitized fixtures.'] : []),
    ...(data.byVerdict['False Positive'] > 0 ? ['Tune detection rules to reduce false positives on non-credential matches.'] : []),
    'Purge previously committed secrets from version-control history.',
    'Re-run a SecureGaurd scan after remediation to confirm the exposure is resolved.'
  ];
  checklist.forEach(item => {
    ensure(R, 9);
    const boxSize = 3.6;
    R.pdf.setDrawColor(P.muted[0], P.muted[1], P.muted[2]);
    R.pdf.setLineWidth(0.3);
    R.pdf.rect(MARGIN + 1, R.y + 0.6, boxSize, boxSize, 'S');
    drawWrapped(R, item, MARGIN + 8, R.y, CONTENT_W - 12, 8.5);
    R.y += wrappedHeight(R, item, CONTENT_W - 12, 8.5) + 2.4;
  });
}

function conclusionSection(R, data) {
  const P = DEFAULT_COLORS;
  sectionHeader(R, 6, 'Conclusion & Methodology', 'Assessment outcome and the scanning approach used');

  setFont(R, { size: 8.5, style: 'bold', color: P.text });
  R.pdf.text('Assessment Conclusion', MARGIN, R.y, { baseline: 'top' });
  R.y += 4.6;
  const conclusion = data.total === 0
    ? `The automated scan of "${data.scanName}" did not identify any sensitive data exposures in the analyzed files, with an overall risk score of ${data.score}/100. Continue to keep credentials out of source control and re-run scans on every change.`
    : `The automated scan of "${data.scanName}" identified ${data.total} potential sensitive data exposure${data.total === 1 ? '' : 's'} (${data.confirmed} confirmed, ${data.suspicious} suspicious), with an overall risk score of ${data.score}/100. Treat confirmed credentials as compromised, apply the remediation plan in Section 5, and re-scan to verify resolution.`;
  R.y += drawWrapped(R, conclusion, MARGIN, R.y, CONTENT_W, 9, { color: P.muted });
  R.y += 6;

  setFont(R, { size: 8.5, style: 'bold', color: P.text });
  R.pdf.text('Scan Methodology', MARGIN, R.y, { baseline: 'top' });
  R.y += 4.6;
  METHOD_STEPS.forEach((step, i) => {
    const itemH = wrappedHeight(R, step, CONTENT_W - 12, 8.5);
    ensure(R, itemH + 2);
    R.pdf.setFillColor(P.purple[0], P.purple[1], P.purple[2]);
    R.pdf.circle(MARGIN + 2.6, R.y + 2, 1.3, 'F');
    drawWrapped(R, step, MARGIN + 7.5, R.y, CONTENT_W - 12, 8.5, { color: P.muted });
    R.y += itemH + 2.6;
  });
  R.y += 4;

  setFont(R, { size: 8.5, style: 'bold', color: P.text });
  R.pdf.text('Disclaimer', MARGIN, R.y, { baseline: 'top' });
  R.y += 4.6;
  R.y += drawWrapped(R, `This report is generated automatically by SecureGaurd from the results stored for scan ${data.id}. It reflects the state of the analyzed files at the time of the scan and does not constitute a full penetration test. Reported values are masked and must never be reconstructed from this document.`, MARGIN, R.y, CONTENT_W, 8.5, { color: P.faint });
}

// ---------------------------------------------------------------------------
// Header / footer stamping
// ---------------------------------------------------------------------------

function stampHeaderFooter(pdf, data, page, total) {
  const P = DEFAULT_COLORS;

  // Header
  setFont({ pdf }, { size: 7.5, style: 'bold', color: P.text });
  pdf.text('SecureGaurd', MARGIN, 6.4, { baseline: 'top' });
  setFont({ pdf }, { size: 7.5, color: P.faint });
  pdf.text('  |  AI-Assisted Sensitive Data Leakage Detection', MARGIN + 12.5, 6.4, { baseline: 'top' });
  setFont({ pdf }, { size: 7.5, color: P.faint });
  pdf.text('Security Assessment Report', PAGE_W - MARGIN, 6.4, { align: 'right', baseline: 'top' });
  pdf.setDrawColor(P.purple[0], P.purple[1], P.purple[2]);
  pdf.setLineWidth(0.7);
  pdf.line(MARGIN, 13.2, MARGIN + 34, 13.2);
  pdf.setDrawColor(P.border[0], P.border[1], P.border[2]);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN + 34, 13.2, PAGE_W - MARGIN, 13.2);

  // Footer
  pdf.setDrawColor(P.border[0], P.border[1], P.border[2]);
  pdf.setLineWidth(0.2);
  pdf.line(MARGIN, 280.2, PAGE_W - MARGIN, 280.2);
  setFont({ pdf }, { size: 7, color: P.faint });
  const footerLeft = `SecureGaurd Security Assessment - ${data.scanName}`.slice(0, 46);
  const footerMid = `Report ID: ${data.id}`;
  const footerRight = `Page ${page} of ${total}`;
  pdf.text(footerLeft, MARGIN, 284, { baseline: 'top' });
  pdf.text(footerMid, MARGIN + 62, 284, { baseline: 'top' });
  pdf.text(footerRight, PAGE_W - MARGIN, 284, { align: 'right', baseline: 'top' });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateReportPdf(item) {
  const pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  const R = { pdf, y: CONTENT_TOP, page: 1 };
  const data = deriveReportData(item);

  setFont(R, { size: 9, color: DEFAULT_COLORS.text });
  pdf.setFillColor(DEFAULT_COLORS.bg[0], DEFAULT_COLORS.bg[1], DEFAULT_COLORS.bg[2]);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  coverSection(R, data);
  overviewSection(R, data);
  findingsSummarySection(R, data);
  detailedSection(R, data);
  remediationSection(R, data);
  conclusionSection(R, data);

  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    stampHeaderFooter(pdf, data, p, total);
  }

  return pdf;
}

export function reportFileName(item) {
  const name = String(item.projectName || 'Project')
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'Project';
  return `SecureGaurd_Report_${name}.pdf`;
}
