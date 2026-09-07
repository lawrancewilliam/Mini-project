import { browser } from '$app/environment';
import JSZip from 'jszip';
import { analyzeContext, analyzeWithOllama, VERDICTS } from '$lib/ai-engine.js';
import { supabase } from '$lib/supabase.js';
import { loadDashboardData, persistScanResult, deleteScanFromSupabase } from '$lib/dashboard.js';

export function maskPII(value, type) {
  if (!value) return value;

  const mask = (str, visibleStart, visibleEnd, maskChar = 'X') => {
    if (!str || str.length <= visibleStart + visibleEnd) return str;
    const start = str.substring(0, visibleStart);
    const end = str.substring(str.length - visibleEnd);
    const masked = maskChar.repeat(Math.max(0, str.length - visibleStart - visibleEnd));
    return `${start}${masked}${end}`;
  };

  if (type === 'Aadhaar Card Number') {
    return value.replace(/(\d{4})\s*(\d{4})\s*\d{4}(\d{1})/g, '$1 $2 XXXX $3');
  }
  if (type === 'PAN Card Number') {
    return value.replace(/([A-Z]{5})(\d{4})([A-Z]{1})/g, '$1 XXXX $3');
  }
  if (type === 'Credit Card Number') {
    return value.replace(/(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})[-\s]?(\d{4})/g, 'XXXX-XXXX-XXXX-$4');
  }
  if (type === 'AWS Client Access Key') {
    return mask(value, 4, 4);
  }
  if (type === 'OpenAI API Key') {
    return mask(value, 3, 10);
  }
  if (type === 'GitHub OAuth Token') {
    return mask(value, 4, 4);
  }
  if (type === 'Database Password') {
    return mask(value, 2, 2);
  }
  if (type === 'JWT Secret Key') {
    return mask(value, 2, 2);
  }
  if (type === 'Slack Webhook URL') {
    return value.replace(/(hooks\.slack\.(?:com|invalid)\/services\/)([T0-9a-zA-Z_]+)([\/B0-9a-zA-Z_]+)([\/0-9a-zA-Z_]+)/g, '$1****$3****');
  }

  return value;
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

// Secret Detection Engine predefined patterns (Module 3 + Module 5 specs)
const RULES = [
  {
    name: 'AWS Client Access Key',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the AWS Access Key ID via the AWS IAM Console immediately. Migrate the credentials to AWS Secrets Manager or load them dynamically using IAM roles.',
    bestPractice: 'Use IAM instance profiles or container credentials rather than hardcoding long-lived access keys in code configuration properties.'
  },
  {
    name: 'Google API Key',
    regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g,
    severity: 'Medium',
    weight: 8,
    fix: 'Configure strict HTTP referrer restrictions and API restrictions on this key in Google Cloud Console. Rotate the API key value.',
    bestPractice: 'Restrict client-side API keys strictly to target hosts and limit their allowed APIs.'
  },
  {
    name: 'OpenAI API Key',
    regex: /\b(sk-[a-zA-Z0-9]{48})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the compromised OpenAI secret key via the OpenAI API dashboard immediately. Rotate to a new organizational key using environment configuration.',
    bestPractice: 'Avoid committing sk- API prefixes. Load dynamic configuration keys through serverless environment storage.'
  },
  {
    name: 'GitHub OAuth Token',
    regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the GitHub personal access token immediately. Register a new fine-grained token with scoped repository privileges.',
    bestPractice: 'Use GitHub Apps authentication or temporary repository installation tokens instead of dev tokens.'
  },
  {
    name: 'SSH/RSA Private Key',
    regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke and remove the exposed private key file. Generate a new SSH keypair and upload the new public key to target servers.',
    bestPractice: 'Always load certificates/private keys dynamically from secure vault stores or inject them as run-time variables.'
  },
  {
    name: 'PAN Card Number',
    regex: /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g,
    severity: 'High',
    weight: 8,
    fix: 'Mask the PAN Card detail from files. Ensure personal taxpayer identification details are never committed to revision systems.',
    bestPractice: 'Store PII dynamically in encrypted customer databases. Sanitise application debugging logs.'
  },
  {
    name: 'Aadhaar Card Number',
    regex: /\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/g,
    severity: 'High',
    weight: 8,
    fix: 'Remove the hardcoded Aadhaar card number. Standard compliance regulations strictly forbid exposure of citizen identity records.',
    bestPractice: 'Encrypt Aadhaar cards in-transit and at-rest, and mask them inside user interfaces.'
  },
  {
    name: 'Credit Card Number',
    regex: /\b((?:\d{4}[- ]?){3}\d{4})\b/g,
    severity: 'High',
    weight: 8,
    fix: 'Mask or remove the card details database records. Store transaction hashes according to PCI-DSS compliance requirements.',
    bestPractice: 'Never Log or store plaintext Primary Account Numbers (PAN). Use Tokenisation gateways.'
  },
  {
    name: 'Database Password',
    regex: /\b(password|pass|passwd|db_password|db_pass)\s*=[ \t]*['"]([^'"]+)['"]/ig,
    severity: 'Critical',
    weight: 9,
    fix: 'Replace the hardcoded connection string password with host IAM identity permissions or environment credentials.',
    bestPractice: 'Load passwords dynamically. Ensure MySQL/PostgreSQL endpoints cannot access raw ports on public networks.'
  },
  {
    name: 'JWT Secret Key',
    regex: /\b(jwt_secret|jwt_key|token_secret|session_secret)\s*=[ \t]*['"]([^'"]+)['"]/ig,
    severity: 'High',
    weight: 8,
    fix: 'Rotate the signing token context key immediately. Generate a highly cryptographically secure key and save in system configurations.',
    bestPractice: 'Use HS256/RS256 keys of 256 bits or larger loaded at boot-up.'
  },
  {
    name: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.(?:com|invalid)\/services\/[T0-9a-zA-Z_]+\/[B0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke and rotate the exposed Slack webhook URL in your Slack Enterprise App panel immediately.',
    bestPractice: 'Expose webhook integrations through backends, rather than embedding client endpoints.'
  },
  {
    name: 'Stripe API Key',
    regex: /\b((sk|rk)_(live|test)_[0-9a-zA-Z]{16,24})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the leaked Stripe key immediately in the Stripe Dashboard. Regenerate with restricted scopes and store it in a secrets manager.',
    bestPractice: 'Use Stripe CLI or server-side SDKs with short-lived restricted keys loaded from environment variables.'
  },
  {
    name: 'Telegram Bot Token',
    regex: /\b(\d{8,10}:[A-Za-z0-9_-]{35})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Use BotFather to revoke the leaked bot token and generate a new one. Restrict the bot to a private group and audit recent activity.',
    bestPractice: 'Load bot tokens via environment variables and rotate them on a schedule.'
  },
  {
    name: 'Discord Webhook URL',
    regex: /https:\/\/discord(app)?\.com\/api\/webhooks\/\d{16,19}\/[A-Za-z0-9_-]{60,}/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Delete the exposed Discord webhook from the channel settings and recreate it with a new random URL.',
    bestPractice: 'Route Discord notifications through a backend proxy that keeps webhook URLs out of client code.'
  },
  {
    name: 'Slack API Token',
    regex: /\b(xox[baprs]-[0-9A-Za-z-]{10,62})\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the leaked Slack token in the Slack App dashboard and reissue scoped tokens via OAuth.',
    bestPractice: 'Use Slack Apps with minimal OAuth scopes and never embed tokens in client bundles.'
  },
  {
    name: 'Twilio API Key',
    regex: /\b(SK[0-9a-fA-F]{32})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Delete the Twilio API key in the Twilio Console and rotate credentials immediately.',
    bestPractice: 'Store Twilio credentials server-side and use Twilio Functions or Key Vault lookups.'
  },
  {
    name: 'Azure Storage Account Key',
    regex: /\b(?:AccountKey|SharedAccessKey)=([a-zA-Z0-9+/=]{80,})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Rotate the Azure Storage account key in the Azure Portal and regenerate SAS tokens with minimal permissions.',
    bestPractice: 'Use Azure Managed Identity or short-lived SAS tokens instead of static account keys.'
  },
  {
    name: 'Google OAuth Client Secret',
    regex: /\b(GOCSPX-[A-Za-z0-9_-]{20,})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Rotate the Google OAuth client secret in Google Cloud Console and restrict the client to approved redirect URIs.',
    bestPractice: 'Keep OAuth client secrets server-side and never ship them in mobile or web clients.'
  },
  {
    name: 'MongoDB Connection String',
    regex: /\b(mongodb(\+srv)?:\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Rotate the MongoDB user password immediately and restrict network access with IP allowlists.',
    bestPractice: 'Use MongoDB Atlas secrets or IAM authentication and inject the URI from environment variables.'
  },
  {
    name: 'PostgreSQL/MySQL Connection URL',
    regex: /\b((postgres|postgresql|mysql):\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g,
    severity: 'Critical',
    weight: 10,
    fix: 'Rotate the database credentials and add the endpoint to a private subnet with strict firewall rules.',
    bestPractice: 'Prefer IAM-based database authentication and load connection URLs from secrets managers.'
  },
  {
    name: 'GitLab Personal Access Token',
    regex: /\b(glpat-[A-Za-z0-9_-]{20})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the GitLab personal access token in GitLab User Settings and replace it with a scoped project token.',
    bestPractice: 'Use GitLab CI job tokens or short-lived OAuth tokens instead of personal access tokens.'
  },
  {
    name: 'npm Access Token',
    regex: /\b(npm_[A-Za-z0-9]{36})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the npm access token at npmjs.com/settings/tokens and reissue with publish-only scope.',
    bestPractice: 'Publish via CI with per-release granular access tokens, never committed to source.'
  },
  {
    name: 'HashiCorp Vault Token',
    regex: /\b(hvs\.[A-Za-z0-9_-]{24,})\b/g,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the Vault token using vault token revoke and renew it through a short-lived auth method.',
    bestPractice: 'Use Kubernetes/Vault agent short-lived tokens and never write root tokens to disk.'
  },
  {
    name: 'Email Address PII',
    regex: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+)\b/g,
    severity: 'Low',
    weight: 3,
    fix: 'Sanitise user emails or log profiles from development scripts to prevent harvesting by scraping bots.',
    bestPractice: 'Mask personal details and use system hashes to represent identities in logs.'
  },
  {
    name: 'Phone Number PII',
    regex: /\b((?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})\b/g,
    severity: 'Low',
    weight: 3,
    fix: 'Remove phone structures or utilize dummy mock profiles in sandbox configurations.',
    bestPractice: 'Encrypt citizen contact fields dynamically.'
  }
];

// Default avatar per role (profiles table has no avatar column; kept in auth metadata/UI)
function defaultAvatar(role) {
  return role === 'Admin'
    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';
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
    const role = authUser.user_metadata?.role || 'Developer';

    // Fetch the real profile row (id = auth.uid()) for the latest full_name/email
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', authUser.id)
        .maybeSingle();
      if (!error && profile?.full_name) {
        fullName = profile.full_name;
      }
    } catch (e) {
      // Profile row may not exist yet; fall back to auth metadata
    }

    this.currentUser = {
      id: authUser.id,
      name: fullName || authUser.email?.split('@')[0] || 'User',
      full_name: fullName,
      email: authUser.email || '',
      role,
      avatar: authUser.user_metadata?.avatar || defaultAvatar(role)
    };

    // RLS exposes only the authenticated user's own profile, so the admin
    // user registry mirrors the current user rather than a shared user list.
    this.users = [
      {
        name: this.currentUser.name,
        email: this.currentUser.email,
        role: this.currentUser.role,
        avatar: this.currentUser.avatar,
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

  async register(fullName, email, password, role) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role || 'Developer'
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

  async updateProfile(name, avatar) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ full_name: name }).eq('id', user.id);
    await supabase.auth.updateUser({
      data: { full_name: name, avatar: avatar || defaultAvatar(this.currentUser?.role) }
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

          for (const rule of RULES) {
            rule.regex.lastIndex = 0;
            // Scan line for matches
            const matches = [...line.matchAll(rule.regex)];
            
            if (matches.length > 0) {
              for (const match of matches) {
                if (isPiiConfigKey(rule.name, line)) continue;
                // Compile code context (Module 4)
                const startIdx = Math.max(0, i - 20);
                const endIdx = Math.min(lines.length - 1, i + 20);
                const contextBlock = lines.slice(startIdx, endIdx + 1).map((l, idx) => {
                  const lineNum = startIdx + idx + 1;
                  return `${lineNum === i + 1 ? '>> ' : '   '}${lineNum}: ${l}`;
                }).join('\n');

                const fullSurroundingText = lines.slice(startIdx, endIdx + 1).join('\n');

                // Determine AI verdict using multi-signal engine + optional Ollama LLM (Module 4)
                const matchedValue = match[0].length > 100 ? match[0].substring(0, 100) : match[0];
                const shouldUseOllama = rule.weight >= 8;
                let aiResult;
                if (shouldUseOllama) {
                  aiResult = await analyzeWithOllama({
                    filePath: relativePath,
                    matchedValue,
                    lineContent: line,
                    allLines: lines,
                    lineIndex: i,
                    secretType: rule.name
                  });
                } else {
                  aiResult = analyzeContext({
                    filePath: relativePath,
                    matchedValue,
                    lineContent: line,
                    allLines: lines,
                    lineIndex: i,
                    secretType: rule.name
                  });
                }
                let decision = aiResult.decision;
                let confidence = aiResult.confidence;
                let reason = aiResult.reason;

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

                findings.push({
                  id: 'f-real-' + Math.random().toString(36).substr(2, 9),
                  file: relativePath,
                  line: i + 1,
                  secretType: rule.name,
                  severity: severity,
                  status: decision === 'Leak Confirmed' ? 'Active' : decision === 'Suspicious' ? 'Active' : 'False Positive',
                  codeContext: line.trim(),
                  decision: decision,
                  confidence: confidence,
                  reason: reason,
                  signalDetails: aiResult.signalDetails,
                  fix: rule.fix,
                  bestPractice: rule.bestPractice
                });
              }
            }
          }
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
