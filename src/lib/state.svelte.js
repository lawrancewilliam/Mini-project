import { browser } from '$app/environment';
import JSZip from 'jszip';
import { analyzeContext, analyzeWithOllama, VERDICTS } from '$lib/ai-engine.js';
import { supabase } from '$lib/supabase.js';
import { loadDashboardData, persistScanResult, deleteScanFromSupabase } from '$lib/dashboard.js';
import { RULES } from '$lib/detection-rules.js';
import { maskSensitiveValue, redactMatches, redactType, spanForMatch } from '$lib/masking.js';

// Display-time safety net. Source lines stored in the DB (context_snippet) are
// already redacted by the scanner, so this only masks any residual occurrences
// of the given type that are still in plaintext — it never masks the whole line.
export function maskPII(value, type) {
  if (!value) return value;
  const rule = RULES.find(r => r.name === type);
  if (!rule) return value;
  return redactType(value, rule);
}

export function getMaskedCodeContext(codeContext, secretType) {
  if (!codeContext) return codeContext;
  return maskPII(codeContext, secretType);
}

// PII rules are noisy on obvious config keys (Google services JSON, AWS ARN account IDs).
// Real secret scanners allowlist these; skipping them keeps the report focused on real hits.
export function isPiiConfigKey(secretType, line) {
  if (secretType !== 'Aadhaar Card Number' && secretType !== 'Phone Number PII') return false;
  return /["']?(project_number|mobilesdk_app_id|client_id)["']?\s*[:=]\s*["']?/i.test(line) ||
    /arn:aws:[^"\s]*\d{12}/.test(line);
}


export function authErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';
  const message = (error.message || '').toLowerCase();
  const status = error.status;

  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('failed to fetch') || message.includes('load failed') || message.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (message.includes('auth session missing') || message.includes('session expired') || message.includes('jwt expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 429 || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return error.message || 'Something went wrong. Please try again.';
}



class AppState {
  currentUser = $state(null);
  authLoading = $state(true);
  theme = $state('dark');
  scans = $state([]);
  projects = $state([]);
  selectedProjectId = $state(null);
  dashboardLoading = $state(true);
  dashboardError = $state('');
  activeScan = $state({
    status: 'idle', // idle, scanning, done
    progress: 0,
    currentStep: '',
    project: null
  });
  selectedScanId = $state(null);
  users = $state([]);

  constructor() {
    this.loadState();
    if (browser) {
      this.initAuth();
    }
  }

  loadState() {
    if (!browser) return;

    // Remove legacy localStorage auth + scan artifacts from the previous demo
    // build. Supabase (public.projects / scans / findings) is now the source of
    // truth for all dashboard data.
    localStorage.removeItem('leak_detection_user');
    localStorage.removeItem('leak_detection_users');
    localStorage.removeItem('leak_detection_scans');
    localStorage.removeItem('leak_detection_selected_scan');

    this.selectedScanId = null;
    this.selectedProjectId = null;

    const savedTheme = localStorage.getItem('secureguard_theme') || 'dark';
    this.theme = savedTheme;
    this.applyTheme(savedTheme);
  }

  toggleTheme() {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.theme = next;
    if (browser) {
      localStorage.setItem('secureguard_theme', next);
      this.applyTheme(next);
    }
  }

  applyTheme(themeName) {
    if (!browser) return;
    const t = themeName || this.theme || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }

  async refreshDashboard() {
    if (!browser) return;
    if (!this.currentUser) return;
    this.dashboardLoading = true;
    this.dashboardError = '';
    try {
      const records = await loadDashboardData();
      records.forEach(r => {
        r.scannedBy = (this.currentUser && this.currentUser.email) || '';
      });
      this.scans = records;
      this.projects = records
        .map(r => ({ id: r.projectId, project_name: r.projectName, status: r.status }))
        .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

      // Keep a valid default selection: most recent completed scan, else latest.
      if (!this.selectedScanId || !this.scans.some(s => s.id === this.selectedScanId)) {
        const fallback = this.scans.find(s => s.default) || this.scans[0] || null;
        this.selectedScanId = fallback ? fallback.id : null;
        this.selectedProjectId = fallback ? fallback.projectId : null;
      } else {
        const current = this.scans.find(s => s.id === this.selectedScanId);
        this.selectedProjectId = current ? current.projectId : null;
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      this.dashboardError = 'Unable to load your scanning data. Please try again.';
      this.scans = [];
      this.projects = [];
      this.selectedScanId = null;
      this.selectedProjectId = null;
    } finally {
      this.dashboardLoading = false;
    }
  }

  async initAuth() {
    // Restore a persisted session so refreshes keep the user logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await this.setCurrentUser(session.user);
      await this.refreshDashboard();
    } else {
      this.currentUser = null;
      this.users = [];
    }
    this.authLoading = false;

    // Keep session/profile reactive across sign-in, sign-out and token refresh
    supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
        this.setCurrentUser(session.user).then(() => this.refreshDashboard());
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.users = [];
        this.scans = [];
        this.projects = [];
        this.selectedScanId = null;
        this.selectedProjectId = null;
      }
    });
  }

  async setCurrentUser(authUser) {
    let fullName = authUser.user_metadata?.full_name || '';

    // Role MUST come from public.profiles.role (database-backed source of
    // truth), never from signup metadata or any client-supplied value.
    let role = 'Developer';
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', authUser.id)
        .maybeSingle();
      if (!error && profile?.full_name) {
        fullName = profile.full_name;
      }
      if (!error && profile?.role) {
        role = profile.role;
      }
    } catch (e) {
      // Profile row may not exist yet; fall back to the safe Developer role
    }

    this.currentUser = {
      id: authUser.id,
      name: fullName || authUser.email?.split('@')[0] || 'User',
      full_name: fullName,
      email: authUser.email || '',
      role,
      avatar: ''
    };

    // RLS exposes only the authenticated user's own profile, so the admin
    // user registry mirrors the current user rather than a shared user list.
    this.users = [
      {
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
        avatar: '',
        registeredAt: authUser.created_at ? authUser.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
      }
    ];
  }

  async refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await this.setCurrentUser(user);
    }
  }

  setSelectedScan(id) {
    this.selectedScanId = id;
    const record = this.scans.find(s => s.id === id);
    if (record) {
      this.selectedProjectId = record.projectId;
    }
  }

  get selectedScan() {
    return this.scans.find(s => s.id === this.selectedScanId) || this.scans[0] || null;
  }

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.setCurrentUser(data.session.user);
    return this.currentUser;
  }

  async register(fullName, email, password) {
    // The role is NEVER accepted from the registration form. Every new signup
    // is a Developer; the DB column default + guard trigger enforce 'Developer'
    // server-side, so a crafted payload cannot self-promote to Admin.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
    // The DB trigger on auth.users creates the profiles row automatically;
    // we must NOT create it manually here.
    if (data.session) {
      await this.setCurrentUser(data.session.user);
    }
    return data;
  }

  async deleteUser(email) {
    // Deleting Supabase auth users requires the service_role/admin API, which is
    // intentionally never exposed in the frontend. Kept as a guarded no-op.
    return false;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.users = [];
  }

  async updateProfile(name) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
    await supabase.auth.updateUser({
      data: { full_name: name }
    });
    await this.setCurrentUser(user);
  }

  async deleteScan(scanId) {
    try {
      await deleteScanFromSupabase(scanId);
    } catch (err) {
      console.error('Failed to delete scan:', err);
    }
    await this.refreshDashboard();
    if (this.scans.length > 0) {
      this.setSelectedScan(this.scans[0].id);
    } else {
      this.selectedScanId = null;
      this.selectedProjectId = null;
    }
  }

  triggerSimulatedScan(projectName, projectDescription, options) {
    this.activeScan = {
      status: 'scanning',
      progress: 0,
      currentStep: 'Extracting ZIP contents...',
      project: {
        projectName,
        projectDescription,
        options
      }
    };

    const steps = [
      { text: 'Extracting ZIP contents...', duration: 1500 },
      { text: 'Parsing AST and files structure...', duration: 2000 },
      { text: 'Running Regex Secret Scanner...', duration: 2500 },
      { text: 'Performing Deep AI Security Analysis...', duration: 3000 },
      { text: 'Calculating Risk Assessment scores...', duration: 1500 },
      { text: 'Compiling findings and PDF Report...', duration: 1500 }
    ];

    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const intervalTime = 100;
    const timer = setInterval(() => {
      elapsed += intervalTime;
      this.activeScan.progress = Math.min(Math.round((elapsed / totalDuration) * 100), 99);

      // Find current step
      let accumulated = 0;
      for (let i = 0; i < steps.length; i++) {
        accumulated += steps[i].duration;
        if (elapsed <= accumulated) {
          this.activeScan.currentStep = steps[i].text;
          break;
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        this.completeSimulatedScan(projectName, projectDescription, options);
      }
    }, intervalTime);
  }

  async completeSimulatedScan(projectName, projectDescription, options) {
    const findings = [
      {
        id: 'f-new-1',
        file: 'src/config/db.js',
        line: 12,
        secretType: 'Database Password',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'const DATABASE_URL = "postgresql://db_user:password_99@prod-db.quantum.io:5432/main";',
        decision: 'Leak Confirmed',
        confidence: 94,
        reason: 'High-confidence detection: variable naming, value entropy signals strongly indicate this is a real, active credential exposed in source code.',
        signalDetails: [
          { name: 'Variable Naming', score: 0.9, evidence: 'Variable naming pattern suggests real credential usage' },
          { name: 'Value Entropy', score: 0.82, evidence: 'High entropy (4.7) suggests real credential' },
          { name: 'Comment Context', score: 0.5, evidence: 'No relevant comments nearby' },
          { name: 'File Context', score: 0.55, evidence: 'File is in configuration directory' },
          { name: 'Code Structure', score: 0.65, evidence: 'Finding is inside a function body' },
          { name: 'Assignment Pattern', score: 0.85, evidence: 'Value is hardcoded directly in source (insecure pattern)' }
        ],
        fix: 'Inject connection strings dynamically using process.env.DATABASE_URL.',
        bestPractice: 'Manage sensitive credentials using service binds or secret managers.'
      }
    ];

    let secretsFound = 1;
    let criticalCount = 1;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    if (options.aiAnalysis) {
      findings.push({
        id: 'f-new-2',
        file: 'services/auth.ts',
        line: 5,
        secretType: 'JWT Secret Key',
        severity: 'High',
        status: 'Active',
        codeContext: 'const GITHUB_CLIENT_SECRET = "ghs_89d381ad7f23cba922384a8d023bd7";',
        decision: 'Leak Confirmed',
        confidence: 91,
        reason: 'High-confidence detection: variable naming, file context signals strongly indicate this is a real, active credential exposed in source code.',
        signalDetails: [
          { name: 'Variable Naming', score: 0.95, evidence: 'Variable naming pattern suggests real credential usage' },
          { name: 'Value Entropy', score: 0.75, evidence: 'Mixed character types increase credential likelihood' },
          { name: 'Comment Context', score: 0.5, evidence: 'No relevant comments nearby' },
          { name: 'File Context', score: 0.75, evidence: 'File is in production source directory' },
          { name: 'Code Structure', score: 0.6, evidence: 'Finding is inside a function body' },
          { name: 'Assignment Pattern', score: 0.8, evidence: 'Value is hardcoded directly in source (insecure pattern)' }
        ],
        fix: 'Configure environment secret keys or fetch from a secure vault.',
        bestPractice: 'Rotate client IDs and client secrets periodically.'
      });
      highCount++;
      secretsFound++;
    }

    const score = criticalCount * 25 + highCount * 15;
    const finalRiskScore = Math.min(score, 100);

    const riskLevel = finalRiskScore >= 75 ? 'Critical' : finalRiskScore >= 50 ? 'High' : finalRiskScore >= 25 ? 'Medium' : 'Low';

    try {
      const { scanId } = await persistScanResult({
        projectName,
        findings,
        filesScanned: 45,
        riskScore: finalRiskScore,
        riskLevel
      });
      await this.refreshDashboard();
      this.setSelectedScan(scanId);
    } catch (err) {
      console.error('Failed to persist scan result:', err);
      this.dashboardError = 'Scan completed, but saving the results to the database failed.';
    }

    this.activeScan.progress = 100;
    this.activeScan.status = 'done';
  }

  // Active Real ZIP Scanner (Module 1 to 6)
  async triggerScan(projectName, projectDescription, file, options) {
    if (!file) {
      // Fall back to simulation when no archive was selected
      this.triggerSimulatedScan(projectName, projectDescription, options);
      return;
    }

    this.activeScan = {
      status: 'scanning',
      progress: 0,
      currentStep: 'Extracting ZIP contents...',
      project: {
        projectName,
        projectDescription,
        options
      }
    };

    try {
      this.activeScan.progress = 5;
      this.activeScan.currentStep = 'Opening ZIP compression...';
      const zip = await JSZip.loadAsync(file);
      
      this.activeScan.progress = 15;
      this.activeScan.currentStep = 'Parsing file structures (Module 2)...';
      
      const fileObjects = [];
      const ignoredFolders = ['node_modules', '.git', 'dist', 'build', 'target', 'venv', '.svelte-kit', '.vscode'];
      const allowedExtensions = ['.py', '.java', '.js', '.ts', '.php', '.cs', '.html', '.css', '.json', '.xml', '.env', '.ini', '.properties', 'Dockerfile'];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        
        const parts = relativePath.split('/');
        const isIgnored = parts.some(part => ignoredFolders.includes(part));
        if (isIgnored) return;

        const isSupported = allowedExtensions.some(ext => relativePath.toLowerCase().endsWith(ext)) || 
                            parts[parts.length - 1] === 'Dockerfile' || 
                            parts[parts.length - 1] === 'wp-config.php';
        if (isSupported) {
          fileObjects.push({ relativePath, zipEntry });
        }
      });

      this.activeScan.progress = 30;
      this.activeScan.currentStep = 'Running Secret Pattern Detection rules (Module 3)...';

      const findings = [];
      let totalRatingWeight = 0;
      
      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      const totalFiles = fileObjects.length;
      let filesProcessed = 0;

      for (const { relativePath, zipEntry } of fileObjects) {
        const textContent = await zipEntry.async('string');
        const lines = textContent.split(/\r?\n/);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          // Detect every rule match on this line first, extracting the exact
          // sensitive value span (never the whole line), so the context snippet
          // can redact only those substrings while staying readable.
          const hitRecords = [];
          for (const rule of RULES) {
            rule.regex.lastIndex = 0;
            const matches = [...line.matchAll(rule.regex)];
            for (const match of matches) {
              if (isPiiConfigKey(rule.name, line)) continue;
              const span = spanForMatch(match, rule);
              hitRecords.push({
                rule,
                span,
                matchedValue: span.raw.length > 100 ? span.raw.substring(0, 100) : span.raw,
                maskedValue: maskSensitiveValue(span.raw, rule.name)
              });
            }
          }
          if (hitRecords.length === 0) continue;

          // One readable, fully redacted line per source line: only the detected
          // values are replaced; labels, quotes, HTML/CSS/JS syntax stay intact.
          const redactedLine = redactMatches(
            line,
            hitRecords.map(h => ({ index: h.span.index, length: h.span.length, maskedValue: h.maskedValue }))
          ).trim();

          const lineFindings = [];
          for (const hit of hitRecords) {
            const rule = hit.rule;
            const shouldUseOllama = rule.weight >= 8;
            let aiResult;
            if (shouldUseOllama) {
              aiResult = await analyzeWithOllama({
                filePath: relativePath,
                matchedValue: hit.matchedValue,
                lineContent: line,
                allLines: lines,
                lineIndex: i,
                secretType: rule.name
              });
            } else {
              aiResult = analyzeContext({
                filePath: relativePath,
                matchedValue: hit.matchedValue,
                lineContent: line,
                allLines: lines,
                lineIndex: i,
                secretType: rule.name
              });
            }
            const decision = aiResult.decision;
            const confidence = aiResult.confidence;
            const reason = aiResult.reason;

            let severity = rule.severity;
            let activeWeight = rule.weight;

            if (decision === VERDICTS.FALSE_POSITIVE) {
              activeWeight = 0;
              severity = 'Low';
            } else if (decision === VERDICTS.TEST_DATA) {
              activeWeight = Math.round(rule.weight * 0.2);
              severity = 'Low';
            } else if (decision === VERDICTS.SUSPICIOUS) {
              activeWeight = Math.round(rule.weight * 0.6);
              severity = severity === 'Critical' ? 'High' : severity;
            }

            if (decision === VERDICTS.LEAK_CONFIRMED || decision === VERDICTS.SUSPICIOUS) {
              totalRatingWeight += activeWeight;
              if (severity === 'Critical') criticalCount++;
              else if (severity === 'High') highCount++;
              else if (severity === 'Medium') mediumCount++;
              else if (severity === 'Low') lowCount++;
            } else {
              lowCount++;
            }

            lineFindings.push({
              id: 'f-real-' + Math.random().toString(36).substr(2, 9),
              file: relativePath,
              line: i + 1,
              secretType: rule.name,
              severity: severity,
              status: decision === 'Leak Confirmed' ? 'Active' : decision === 'Suspicious' ? 'Active' : 'False Positive',
              // Pre-redacted line: only the detected values are replaced.
              codeContext: redactedLine,
              // The masked representation of JUST the detected value.
              maskedValue: hit.maskedValue,
              decision: decision,
              confidence: confidence,
              reason: reason,
              signalDetails: aiResult.signalDetails,
              fix: rule.fix,
              bestPractice: rule.bestPractice
            });
          }
          findings.push(...lineFindings);
        }
        
        filesProcessed++;
        const percent = Math.min(Math.round(30 + (filesProcessed / totalFiles) * 55), 85);
        this.activeScan.progress = percent;
        this.activeScan.currentStep = `Scanning files structure (Module 3): ${filesProcessed}/${totalFiles}...`;
      }

      this.activeScan.progress = 90;
      this.activeScan.currentStep = 'Performing AI Context Heuristics analysis (Module 4)...';
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.activeScan.progress = 95;
      this.activeScan.currentStep = 'Calculating final Risk Assessment Score (Module 5)...';
      
      const finalRiskScore = Math.min(totalRatingWeight, 100);

      const riskLevel = finalRiskScore >= 75 ? 'Critical' : finalRiskScore >= 50 ? 'High' : finalRiskScore >= 25 ? 'Medium' : 'Low';

      try {
        const { scanId } = await persistScanResult({
          projectName,
          findings,
          filesScanned: totalFiles,
          riskScore: finalRiskScore,
          riskLevel
        });
        await this.refreshDashboard();
        this.setSelectedScan(scanId);
      } catch (err) {
        console.error('Failed to persist scan result:', err);
        this.dashboardError = 'Scan completed, but saving the results to the database failed.';
      }

      this.activeScan.progress = 100;
      this.activeScan.status = 'done';

    } catch (err) {
      console.error(err);
      this.activeScan.status = 'done';
      alert('Codebase Scanner failed: ' + err.message);
    }
  }

  resetActiveScan() {
    this.activeScan = {
      status: 'idle',
      progress: 0,
      currentStep: '',
      project: null
    };
  }
}

export const appState = new AppState();
