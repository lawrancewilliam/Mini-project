import { browser } from '$app/environment';
import JSZip from 'jszip';
import { analyzeContext, analyzeWithOllama, VERDICTS } from '$lib/ai-engine.js';

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

// Default mock data for high-fidelity demonstration
const DEFAULT_SCANS = [
  {
    id: 'scan-1',
    projectName: 'quantum-payment-gateway',
    projectDescription: 'Core payment processing backend with microservices, AWS integrations, and Stripe webhooks.',
    date: '2026-07-17',
    filesScanned: 142,
    secretsFound: 8,
    riskScore: 84,
    criticalCount: 3,
    highCount: 2,
    mediumCount: 2,
    lowCount: 1,
    findings: [
      {
        id: 'f-1',
        file: 'config/aws.js',
        line: 14,
        secretType: 'AWS Client Access Key',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'const AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";',
        decision: 'Leak Confirmed',
        confidence: 99,
        reason: 'Matches standard AWS Client Secret patterns. Exposed in plaintext inside the configuration file rather than being loaded from secure environment variables or vault.',
        fix: 'Move AWS_SECRET_ACCESS_KEY to secure environment variables or use AWS Secrets Manager. Revoke and rotate the exposed credentials immediately.',
        bestPractice: 'Never commit raw secrets. Use a secrets manager and run git-secrets or similar pre-commit hooks to scan files before staging.'
      },
      {
        id: 'f-2',
        file: 'utils/notifications.js',
        line: 38,
        secretType: 'Slack Webhook URL',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'const SLACK_WEBHOOK = "https://hooks.slack.invalid/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";',
        decision: 'Leak Confirmed',
        confidence: 96,
        reason: 'Contains an active Slack webhook URL that could allow unauthorized actors to post spam or intercept logging messages in internal channels.',
        fix: 'Rotate the Slack webhook URL immediately and load it from environment variables or secure storage.',
        bestPractice: 'Restrict webhook URLs at the provider level and encrypt any integration links.'
      },
      {
        id: 'f-3',
        file: 'database/connection.py',
        line: 9,
        secretType: 'Database Password',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'db_conn = mysql.connect(host="prod-db.quantum.internal", user="admin", password="SuperSecurePassword123!")',
        decision: 'Leak Confirmed',
        confidence: 94,
        reason: 'Plaintext database connection string containing administration credentials pointing to an internal production endpoint.',
        fix: 'Replace the hardcoded password with an IAM database authentication plugin or load via configuration properties.',
        bestPractice: 'Employ temporary credentials or zero-trust network credentials rather than hardcoded usernames and passwords.'
      },
      {
        id: 'f-4',
        file: 'routes/billing.js',
        line: 22,
        secretType: 'Credit Card Number',
        severity: 'High',
        status: 'Active',
        codeContext: 'const stripe = require(\'stripe\')(\'sk_test_51Nx...8z9L\');',
        decision: 'Test Key Leaked',
        confidence: 92,
        reason: 'Although the key is for a test environment (sk_test_), committing credentials to code repositories violates policies and exposes testing setups.',
        fix: 'Replace the secret key with process.env.STRIPE_SECRET_KEY and rotate the Stripe test environment keys.',
        bestPractice: 'Test API keys must be isolated and loaded similarly to production secrets.'
      },
      {
        id: 'f-5',
        file: 'scripts/deploy.sh',
        line: 15,
        secretType: 'SSH/RSA Private Key',
        severity: 'High',
        status: 'Active',
        codeContext: 'echo "-----BEGIN RSA PRIVATE KEY-----"\necho "MIIEowIBAAKCAQEA0yG9..."\necho "-----END RSA PRIVATE KEY-----" > /tmp/id_rsa;',
        decision: 'Leak Confirmed',
        confidence: 98,
        reason: 'Hardcoded SSH private key block utilized in deployment routine. Anyone with repository read access can obtain ssh access to the host.',
        fix: 'Use runner-level SSH credentials (e.g. GitHub secrets) and inject them securely into the ssh-agent at runtime.',
        bestPractice: 'Never store raw keys or certificates in script files.'
      },
      {
        id: 'f-6',
        file: 'public/index.html',
        line: 45,
        secretType: 'Google API Key',
        severity: 'Medium',
        status: 'Active',
        codeContext: '<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyA1...&callback=initMap" async defer></script>',
        decision: 'Exposed API Key',
        confidence: 82,
        reason: 'Google Maps API key is hardcoded directly in a public HTML template. Low danger of privilege escalation, but can lead to quota theft.',
        fix: 'Go to Google Cloud Console and configure strict HTTP referrer restrictions and API restrictions on this key.',
        bestPractice: 'Restrict client-side API keys strictly to target hosts and domain endpoints.'
      },
      {
        id: 'f-7',
        file: 'middleware/auth.js',
        line: 12,
        secretType: 'JWT Secret Key',
        severity: 'Medium',
        status: 'Active',
        codeContext: 'const token = jwt.sign({ id: user.id }, "temp_secret_key_123");',
        decision: 'Weak Secret Key',
        confidence: 91,
        reason: 'Weak hardcoded secret key used for signing web tokens. Can allow offline brute-force attacks to forge administrator tokens.',
        fix: 'Load a strong, cryptographically secure signing secret from environment variables.',
        bestPractice: 'Use signing secrets that are rotated periodically and have a high entropy.'
      },
      {
        id: 'f-8',
        file: 'tests/api.test.js',
        line: 5,
        secretType: 'Email Address PII',
        severity: 'Low',
        status: 'Active',
        codeContext: 'const TARGET_URL = "http://dev-sandbox-3.internal.quantum-pay.io:8080/v1";',
        decision: 'Information Exposure',
        confidence: 75,
        reason: 'Hardcoded internal staging URL. Exposes internal DNS structures and development ports.',
        fix: 'Set test targets dynamically using test configuration files or environment variables.',
        bestPractice: 'Abstract environment-specific endpoints from static testing code.'
      }
    ]
  },
  {
    id: 'scan-2',
    projectName: 'microservice-auth-helper',
    projectDescription: 'Authentication helper for microservice token exchange. Written in Go.',
    date: '2026-07-15',
    filesScanned: 34,
    secretsFound: 0,
    riskScore: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    findings: []
  },
  {
    id: 'scan-3',
    projectName: 'legacy-php-frontend',
    projectDescription: 'Legacy customer billing portal and admin backend dashboard.',
    date: '2026-06-10',
    filesScanned: 94,
    secretsFound: 2,
    riskScore: 95,
    criticalCount: 2,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    findings: [
      {
        id: 'f-301',
        file: 'db.php',
        line: 4,
        secretType: 'Database Password',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'define("DB_PASSWORD", "mysql_prod_root_pass_9981");',
        decision: 'Leak Confirmed',
        confidence: 98,
        reason: 'Hardcoded MySQL production database connection credentials.',
        fix: 'Load credential constants from an environment configuration helper.',
        bestPractice: 'Use vault storage for database keys.'
      },
      {
        id: 'f-302',
        file: 'wp-config.php',
        line: 25,
        secretType: 'JWT Secret Key',
        severity: 'High',
        status: 'Active',
        codeContext: 'define(\'AUTH_KEY\',         \' d-f09s8f09safs8df7sdf723rn23r...\');',
        decision: 'Leak Confirmed',
        confidence: 90,
        reason: 'Standard WordPress security key/salt exposed in main web config.',
        fix: 'Rotate standard WordPress keys and load using server environment variables.',
        bestPractice: 'Always inject CMS credentials outside of tracked codebase files.'
      }
    ]
  },
  {
    id: 'scan-4',
    projectName: 'react-native-app',
    projectDescription: 'Mobile companion app with push notifications and maps.',
    date: '2026-07-02',
    filesScanned: 88,
    secretsFound: 1,
    riskScore: 48,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 0,
    lowCount: 0,
    findings: [
      {
        id: 'f-401',
        file: 'app.json',
        line: 18,
        secretType: 'JWT Secret Key',
        severity: 'High',
        status: 'Active',
        codeContext: '"expoToken": "exp_token_abcf9192451bcad12920239129"',
        decision: 'Leak Confirmed',
        confidence: 95,
        reason: 'Expo authentication token included directly inside application manifest config.',
        fix: 'Inject Expo credentials during build/publish using environment variables or EAS secrets.',
        bestPractice: 'Configure CI variables for mobile deployment keys.'
      }
    ]
  }
];

class AppState {
  currentUser = $state(null);
  scans = $state([]);
  activeScan = $state({
    status: 'idle', // idle, scanning, done
    progress: 0,
    currentStep: '',
    project: null
  });
  selectedScanId = $state('scan-1');

  constructor() {
    this.loadState();
  }

  loadState() {
    if (!browser) return;

    // Load active user
    const savedUser = localStorage.getItem('leak_detection_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }

    // Load scans
    const savedScans = localStorage.getItem('leak_detection_scans');
    if (savedScans) {
      try {
        this.scans = JSON.parse(savedScans);
      } catch (e) {
        this.scans = [...DEFAULT_SCANS];
      }
    } else {
      this.scans = [...DEFAULT_SCANS];
      this.saveScans();
    }

    // Load selected scan ID
    const savedSelected = localStorage.getItem('leak_detection_selected_scan');
    if (savedSelected) {
      this.selectedScanId = savedSelected;
    }
  }

  saveUser() {
    if (!browser) return;
    if (this.currentUser) {
      localStorage.setItem('leak_detection_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('leak_detection_user');
    }
  }

  saveScans() {
    if (!browser) return;
    localStorage.setItem('leak_detection_scans', JSON.stringify(this.scans));
  }

  setSelectedScan(id) {
    this.selectedScanId = id;
    if (browser) {
      localStorage.setItem('leak_detection_selected_scan', id);
    }
  }

  get selectedScan() {
    return this.scans.find(s => s.id === this.selectedScanId) || this.scans[0] || null;
  }

  login(email, password) {
    let user = null;
    if (email === 'admin@gmail.com' && password === 'Admin@123') {
      user = {
        name: 'Alex Mercer',
        email: 'admin@gmail.com',
        role: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };
    } else if (email === 'developer@gmail.com' && password === 'Developer@123') {
      user = {
        name: 'Sarah Connor',
        email: 'developer@gmail.com',
        role: 'Developer',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
      };
    }

    if (user) {
      this.currentUser = user;
      this.saveUser();
      return true;
    }
    return false;
  }

  register(name, email, role) {
    const avatar = role === 'Admin'
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';
    
    const user = {
      name,
      email,
      role,
      avatar
    };

    this.currentUser = user;
    this.saveUser();
    return true;
  }

  logout() {
    this.currentUser = null;
    this.saveUser();
  }

  updateProfile(name, avatar) {
    if (this.currentUser) {
      this.currentUser.name = name;
      this.currentUser.avatar = avatar;
      this.saveUser();
    }
  }

  deleteScan(scanId) {
    this.scans = this.scans.filter(s => s.id !== scanId);
    this.saveScans();
    if (this.selectedScanId === scanId) {
      if (this.scans.length > 0) {
        this.setSelectedScan(this.scans[0].id);
      } else {
        this.selectedScanId = null;
      }
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

  completeSimulatedScan(projectName, projectDescription, options) {
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

    const newScan = {
      id: 'scan-' + Date.now(),
      projectName,
      projectDescription: projectDescription || 'No description provided.',
      date: new Date().toISOString().split('T')[0],
      filesScanned: 45,
      secretsFound,
      riskScore: finalRiskScore,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      findings
    };

    this.scans = [newScan, ...this.scans];
    this.saveScans();
    this.setSelectedScan(newScan.id);

    this.activeScan.progress = 100;
    this.activeScan.status = 'done';
  }

  // Active Real ZIP Scanner (Module 1 to 6)
  async triggerScan(projectName, projectDescription, file, options) {
    if (!file || file.name === 'payment-microservice-node.zip') {
      // Fall back to simulation if no file or preview sandbox zip is selected
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

      const newScan = {
        id: 'scan-' + Date.now(),
        projectName,
        projectDescription: projectDescription || 'No description provided.',
        date: new Date().toISOString().split('T')[0],
        filesScanned: totalFiles,
        secretsFound: findings.length,
        riskScore: finalRiskScore,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        findings
      };

      this.scans = [newScan, ...this.scans];
      this.saveScans();
      this.setSelectedScan(newScan.id);

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
