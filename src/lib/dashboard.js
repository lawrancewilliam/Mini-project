import { supabase } from '$lib/supabase.js';
import { RULES } from '$lib/detection-rules.js';
import { maskSensitiveValue, redactMatches, spanForMatch, defaultCandidate } from '$lib/masking.js';

// Supabase is the source of truth for projects, scans, findings, scan_files and
// reports. RLS scopes every query to the authenticated user's own records.

// Map a findings DB row into the shape the existing UI pages consume.
function normalizeFinding(row) {
  const verdict = row.ai_verdict || 'Leak Confirmed';
  return {
    id: row.id,
    file: row.file_path,
    line: row.line_number,
    secretType: row.secret_type,
    severity: row.severity,
    status: verdict === 'Suspicious' || verdict === 'Leak Confirmed' ? 'Active' : 'False Positive',
    codeContext: row.context_snippet || '',
    decision: verdict,
    confidence: row.confidence_score != null ? Number(row.confidence_score) : 0,
    reason: row.detection_method || '',
    signalDetails: [],
    fix: row.recommendation || '',
    bestPractice: '',
    maskedValue: row.masked_value,
    severityScore: row.severity_score
  };
}

// Aggregate findings per severity for a scan.
function severityCounts(findings) {
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  findings.forEach(f => {
    if (counts[f.severity] != null) counts[f.severity]++;
  });
  return counts;
}

// Normalize a projects+scans join into the UI "scan record" shape.
function normalizeScanRecord(project, scan, findings) {
  const sev = severityCounts(findings);
  return {
    id: scan?.id || project.id,
    projectId: project.id,
    projectName: project.project_name,
    projectDescription: '',
    date: scan?.created_at ? scan.created_at.split('T')[0] : (project.created_at ? project.created_at.split('T')[0] : ''),
    scannedBy: '',
    filesScanned: (scan ? scan.total_files : project.total_files) || 0,
    secretsFound: scan ? scan.secrets_found : findings.length,
    riskScore: scan ? (Number(scan.risk_score) || 0) : 0,
    riskLevel: scan?.risk_level || '',
    criticalCount: scan ? scan.critical_findings : sev.Critical,
    highCount: sev.High,
    mediumCount: sev.Medium,
    lowCount: sev.Low,
    status: scan?.status || project.status,
    findings
  };
}

// Load all of the authenticated user's projects with their scans and findings.
// Returns an array of normalized scan records (one per scan, plus a placeholder
// per uploaded-but-unscanned project).
export async function loadDashboardData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (projectsError) throw projectsError;
  if (!projects || projects.length === 0) return [];

  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false });
  if (scansError) throw scansError;

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const scanIds = [];
  const records = [];

  (scans || []).forEach(scan => {
    const project = projectMap.get(scan.project_id);
    if (!project) return;
    scanIds.push(scan.id);
    records.push({ scan, project });
  });

  // Surface uploaded-but-unscanned projects as placeholders.
  const scannedProjectIds = new Set((scans || []).map(s => s.project_id));
  projects.forEach(p => {
    if (!scannedProjectIds.has(p.id)) {
      records.push({ scan: null, project: p });
    }
  });

  // Fetch findings for all of the user's scans (RLS-scoped via scan ownership).
  let findingsByScan = new Map();
  if (scanIds.length > 0) {
    const { data: findings, error: findingsError } = await supabase
      .from('findings')
      .select('*')
      .in('scan_id', scanIds);
    if (findingsError) throw findingsError;

    (findings || []).forEach(f => {
      const list = findingsByScan.get(f.scan_id) || [];
      list.push(f);
      findingsByScan.set(f.scan_id, list);
    });
  }

  const result = [];
  records.forEach(({ scan, project }) => {
    const findings = scan ? (findingsByScan.get(scan.id) || []).map(normalizeFinding) : [];
    result.push(normalizeScanRecord(project, scan, findings));
  });

  // Mark the most recently completed scan as the default target.
  result.forEach(r => (r.default = false));
  const newestCompleted = result
    .filter(r => r.status === 'completed')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (newestCompleted[0]) newestCompleted[0].default = true;

  return result;
}

// Persist a finished scan (from the in-browser scanner) to Supabase so the
// dashboard reads it as the source of truth.
export async function persistScanResult({ projectName, findings = [], filesScanned = 0, riskScore = 0, riskLevel = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let project;
  // Reuse an existing project with the same name if present, else create one.
  const { data: existing, error: existingError } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('user_id', user.id)
    .eq('project_name', projectName)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    project = existing;
  } else {
    const { data: created, error: createError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        project_name: projectName,
        original_file_name: projectName + '.zip',
        status: 'completed',
        total_files: filesScanned,
        scanned_files: filesScanned
      })
      .select('*')
      .single();
    if (createError) throw createError;
    project = created;
  }

  const sev = severityCounts(findings);
  const now = new Date().toISOString();
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      project_id: project.id,
      user_id: user.id,
      status: 'completed',
      total_files: filesScanned,
      sensitive_files: findings.length > 0 ? 1 : 0,
      secrets_found: findings.length,
      critical_findings: sev.Critical,
      risk_score: riskScore,
      risk_level: riskLevel,
      started_at: now,
      completed_at: now
    })
    .select('*')
    .single();
  if (scanError) throw scanError;

  if (findings.length > 0) {
    const findingsRows = findings.map(f => {
      const secretType = f.secretType || 'Unknown';
      const contextSource = f.codeContext || '';
      const rule = RULES.find(r => r.name === secretType);

      // Defensive redaction: the scanner already stores a redacted
      // context_snippet, but re-scan the line and mask any residual plaintext
      // occurrences of this type so raw values are NEVER persisted.
      const occurrences = [];
      if (rule) {
        rule.regex.lastIndex = 0;
        let m;
        const text = String(contextSource);
        while ((m = rule.regex.exec(text)) !== null) {
          const span = spanForMatch(m, rule);
          occurrences.push({
            index: span.index,
            length: span.length,
            maskedValue: maskSensitiveValue(span.raw, secretType)
          });
        }
      }
      if (occurrences.length === 0) {
        // No rule match in the context (e.g. simulated findings that never set
        // an explicit match): fall back to masking a quoted candidate value.
        const candidate = defaultCandidate(contextSource);
        if (candidate) {
          occurrences.push({
            index: candidate.index,
            length: candidate.length,
            maskedValue: maskSensitiveValue(candidate.raw, secretType)
          });
        }
      }

      const contextSnippet = occurrences.length > 0
        ? redactMatches(String(contextSource), occurrences)
        : String(contextSource);

      const maskedValue = f.maskedValue
        || (occurrences[0] && occurrences[0].maskedValue)
        || `${secretType} [masked]`;

      return {
        scan_id: scan.id,
        project_id: project.id,
        file_path: f.file || '',
        line_number: f.line || null,
        secret_type: secretType,
        masked_value: maskedValue,
        severity: f.severity || 'Low',
        severity_score: severityWeight(f.severity),
        confidence_score: f.confidence != null ? Number(f.confidence) : null,
        ai_verdict: normalizeVerdict(f.decision),
        detection_method: f.reason ? f.reason.slice(0, 500) : null,
        context_snippet: contextSnippet,
        recommendation: f.fix || null
      };
    });

    const { error: findingsError } = await supabase.from('findings').insert(findingsRows);
    if (findingsError) throw findingsError;
  }

  return { projectId: project.id, scanId: scan.id };
}

function severityWeight(severity) {
  switch (severity) {
    case 'Critical': return 25;
    case 'High': return 15;
    case 'Medium': return 8;
    case 'Low': return 2;
    default: return 0;
  }
}

function normalizeVerdict(decision) {
  if (decision === 'False Positive') return 'False Positive';
  if (decision === 'Test Data') return 'Test Data';
  if (decision === 'Suspicious') return 'Suspicious';
  return 'Leak Confirmed';
}

// Delete a scan (and dependent findings/scan_files via cascade) for the user.
export async function deleteScanFromSupabase(scanId) {
  const { error } = await supabase.from('scans').delete().eq('id', scanId);
  if (error) throw error;
}

// Delete a project (and dependent scans/findings via cascade) for the user.
export async function deleteProjectFromSupabase(projectId) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}