import { browser } from '$app/environment';

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
        secretType: 'AWS Client Secret',
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
        secretType: 'Stripe API Secret Key',
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
        secretType: 'SSH Private Key',
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
        secretType: 'JWT Secret',
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
        secretType: 'Internal URL',
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
    secretsFound: 4,
    riskScore: 95,
    criticalCount: 3,
    highCount: 1,
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
        secretType: 'WordPress Auth Salt',
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
    secretsFound: 2,
    riskScore: 48,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    findings: [
      {
        id: 'f-401',
        file: 'app.json',
        line: 18,
        secretType: 'Expo Access Token',
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

    let currentStepIndex = 0;
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
    // Generate some mock findings based on selected options
    const findings = [];
    let secretsFound = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    if (options.regex) {
      findings.push({
        id: 'f-new-1',
        file: 'src/config/db.js',
        line: 12,
        secretType: 'PostgreSQL URI',
        severity: 'Critical',
        status: 'Active',
        codeContext: 'const DATABASE_URL = "postgresql://db_user:pwd_secure_99@prod-db.quantum.io:5432/main";',
        decision: 'Leak Confirmed',
        confidence: 98,
        reason: 'Hardcoded connection string matching database URI patterns discovered in database configuration source.',
        fix: 'Inject connection strings dynamically using process.env.DATABASE_URL.',
        bestPractice: 'Manage sensitive credentials using service binds or secret managers.'
      });
      criticalCount++;
      secretsFound++;
    }

    if (options.aiAnalysis) {
      findings.push({
        id: 'f-new-2',
        file: 'services/auth.ts',
        line: 5,
        secretType: 'GitHub OAuth Client Secret',
        severity: 'High',
        status: 'Active',
        codeContext: 'const GITHUB_CLIENT_SECRET = "ghs_89d381ad7f23cba922384a8d023bd7";',
        decision: 'Leak Confirmed',
        confidence: 94,
        reason: 'OAuth client credentials detected inside user identity verification middleware.',
        fix: 'Configure environment secret keys or fetch from a secure vault.',
        bestPractice: 'Rotate client IDs and client secrets periodically.'
      });
      highCount++;
      secretsFound++;

      findings.push({
        id: 'f-new-3',
        file: 'routes/analytics.js',
        line: 18,
        secretType: 'Mixpanel Token',
        severity: 'Medium',
        status: 'Active',
        codeContext: 'mixpanel.init("mp_token_49d27a1928bc3aef902b");',
        decision: 'Leak Confirmed',
        confidence: 88,
        reason: 'Public analytics initiation key committed in plain view.',
        fix: 'Apply IP limitations at Mixpanel Console and load keys dynamically.',
        bestPractice: 'Sanitize tracking initialization tokens.'
      });
      mediumCount++;
      secretsFound++;
    }

    const score = secretsFound > 0 ? (criticalCount * 25 + highCount * 15 + mediumCount * 8) : 0;
    const finalRiskScore = Math.min(Math.max(score, 0), 100);

    const newScan = {
      id: 'scan-' + Date.now(),
      projectName,
      projectDescription: projectDescription || 'No description provided.',
      date: new Date().toISOString().split('T')[0],
      filesScanned: Math.floor(Math.random() * 80) + 40,
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
