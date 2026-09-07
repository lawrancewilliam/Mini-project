// SecurAI secret detection rules — the single source of truth for the regexes
// used by the scanner, the persist layer, the UI masking and the PDF generator.
//
// Each rule exposes:
//   regex       — global regex used for detection (boundary-safe: a match must
//                 be exactly the sensitive value, never surrounding HTML/CSS/JS)
//   valueGroup  — which match() capture group holds the actual sensitive value
//                 (0 = the whole match itself). Key=value rules (Database
//                 Password, JWT Secret) use group 2 so the assignment prefix and
//                 quotes stay readable in the context line while only the value
//                 is redacted.

export const RULES = [
  {
    name: 'AWS Client Access Key',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the AWS Access Key ID via the AWS IAM Console immediately. Migrate the credentials to AWS Secrets Manager or load them dynamically using IAM roles.',
    bestPractice: 'Use IAM instance profiles or container credentials rather than hardcoding long-lived access keys in code configuration properties.'
  },
  {
    name: 'Google API Key',
    regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g,
    valueGroup: 0,
    severity: 'Medium',
    weight: 8,
    fix: 'Configure strict HTTP referrer restrictions and API restrictions on this key in Google Cloud Console. Rotate the API key value.',
    bestPractice: 'Restrict client-side API keys strictly to target hosts and limit their allowed APIs.'
  },
  {
    name: 'OpenAI API Key',
    regex: /\b(sk-[a-zA-Z0-9]{48})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the compromised OpenAI secret key via the OpenAI API dashboard immediately. Rotate to a new organizational key using environment configuration.',
    bestPractice: 'Avoid committing sk- API prefixes. Load dynamic configuration keys through serverless environment storage.'
  },
  {
    name: 'GitHub OAuth Token',
    regex: /\b((?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the GitHub personal access token immediately. Register a new fine-grained token with scoped repository privileges.',
    bestPractice: 'Use GitHub Apps authentication or temporary repository installation tokens instead of dev tokens.'
  },
  {
    name: 'SSH/RSA Private Key',
    regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke and remove the exposed private key file. Generate a new SSH keypair and upload the new public key to target servers.',
    bestPractice: 'Always load certificates/private keys dynamically from secure vault stores or inject them as run-time variables.'
  },
  {
    name: 'PAN Card Number',
    regex: /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 8,
    fix: 'Mask the PAN Card detail from files. Ensure personal taxpayer identification details are never committed to revision systems.',
    bestPractice: 'Store PII dynamically in encrypted customer databases. Sanitise application debugging logs.'
  },
  {
    name: 'Aadhaar Card Number',
    regex: /(?<![\d:.])(\d{4}[ ]\d{4}[ ]\d{4}|\d{12})(?![\d.])/g,
    valueGroup: 0,
    severity: 'High',
    weight: 8,
    fix: 'Remove the hardcoded Aadhaar card number. Standard compliance regulations strictly forbid exposure of citizen identity records.',
    bestPractice: 'Encrypt Aadhaar cards in-transit and at-rest, and mask them inside user interfaces.'
  },
  {
    name: 'Credit Card Number',
    regex: /(?<!\d)((?:\d{4}[ -]?){3}\d{4})(?!\d)/g,
    valueGroup: 0,
    severity: 'High',
    weight: 8,
    fix: 'Mask or remove the card details database records. Store transaction hashes according to PCI-DSS compliance requirements.',
    bestPractice: 'Never Log or store plaintext Primary Account Numbers (PAN). Use Tokenisation gateways.'
  },
  {
    name: 'Database Password',
    regex: /\b(password|pass|passwd|db_password|db_pass)\s*=[ \t]*['"]([^'"]+)['"]/ig,
    valueGroup: 2,
    severity: 'Critical',
    weight: 9,
    fix: 'Replace the hardcoded connection string password with host IAM identity permissions or environment credentials.',
    bestPractice: 'Load passwords dynamically. Ensure MySQL/PostgreSQL endpoints cannot access raw ports on public networks.'
  },
  {
    name: 'JWT Secret Key',
    regex: /\b(jwt_secret|jwt_key|token_secret|session_secret)\s*=[ \t]*['"]([^'"]+)['"]/ig,
    valueGroup: 2,
    severity: 'High',
    weight: 8,
    fix: 'Rotate the signing token context key immediately. Generate a highly cryptographically secure key and save in system configurations.',
    bestPractice: 'Use HS256/RS256 keys of 256 bits or larger loaded at boot-up.'
  },
  {
    name: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.(?:com|invalid)\/services\/[T0-9a-zA-Z_]+\/[B0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke and rotate the exposed Slack webhook URL in your Slack Enterprise App panel immediately.',
    bestPractice: 'Expose webhook integrations through backends, rather than embedding client endpoints.'
  },
  {
    name: 'Stripe API Key',
    regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{16,24})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the leaked Stripe key immediately in the Stripe Dashboard. Regenerate with restricted scopes and store it in a secrets manager.',
    bestPractice: 'Use Stripe CLI or server-side SDKs with short-lived restricted keys loaded from environment variables.'
  },
  {
    name: 'Telegram Bot Token',
    regex: /\b(\d{8,10}:[A-Za-z0-9_-]{35})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Use BotFather to revoke the leaked bot token and generate a new one. Restrict the bot to a private group and audit recent activity.',
    bestPractice: 'Load bot tokens via environment variables and rotate them on a schedule.'
  },
  {
    name: 'Discord Webhook URL',
    regex: /https:\/\/discord(app)?\.com\/api\/webhooks\/\d{16,19}\/[A-Za-z0-9_-]{60,}/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Delete the exposed Discord webhook from the channel settings and recreate it with a new random URL.',
    bestPractice: 'Route Discord notifications through a backend proxy that keeps webhook URLs out of client code.'
  },
  {
    name: 'Slack API Token',
    regex: /\b(xox[baprs]-[0-9A-Za-z-]{10,62})\b/g,
    valueGroup: 0,
    severity: 'Critical',
    weight: 10,
    fix: 'Revoke the leaked Slack token in the Slack App dashboard and reissue scoped tokens via OAuth.',
    bestPractice: 'Use Slack Apps with minimal OAuth scopes and never embed tokens in client bundles.'
  },
  {
    name: 'Twilio API Key',
    regex: /\b(SK[0-9a-fA-F]{32})\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 9,
    fix: 'Delete the Twilio API key in the Twilio Console and rotate credentials immediately.',
    bestPractice: 'Store Twilio credentials server-side and use Twilio Functions or Key Vault lookups.'
  },
  {
    name: 'Azure Storage Account Key',
    regex: /\b(?:AccountKey|SharedAccessKey)=([a-zA-Z0-9+/=]{80,})\b/g,
    valueGroup: 1,
    severity: 'High',
    weight: 9,
    fix: 'Rotate the Azure Storage account key in the Azure Portal and regenerate SAS tokens with minimal permissions.',
    bestPractice: 'Use Azure Managed Identity or short-lived SAS tokens instead of static account keys.'
  },
  {
    name: 'Google OAuth Client Secret',
    regex: /\b(GOCSPX-[A-Za-z0-9_-]{20,})\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 9,
    fix: 'Rotate the Google OAuth client secret in Google Cloud Console and restrict the client to approved redirect URIs.',
    bestPractice: 'Keep OAuth client secrets server-side and never ship them in mobile or web clients.'
  },
  {
    name: 'MongoDB Connection String',
    regex: /\b((?:mongodb(?:\+srv)?:\/\/[^\s"']+:[^\s"']+@[^\s"']+))\b/g,
    valueGroup: 1,
    severity: 'Critical',
    weight: 10,
    fix: 'Rotate the MongoDB user password immediately and restrict network access with IP allowlists.',
    bestPractice: 'Use MongoDB Atlas secrets or IAM authentication and inject the URI from environment variables.'
  },
  {
    name: 'PostgreSQL/MySQL Connection URL',
    regex: /\b((?:postgres|postgresql|mysql):\/\/[^\s"']+:[^\s"']+@[^\s"']+)\b/g,
    valueGroup: 1,
    severity: 'Critical',
    weight: 10,
    fix: 'Rotate the database credentials and add the endpoint to a private subnet with strict firewall rules.',
    bestPractice: 'Prefer IAM-based database authentication and load connection URLs from secrets managers.'
  },
  {
    name: 'GitLab Personal Access Token',
    regex: /\b(glpat-[A-Za-z0-9_-]{20})\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the GitLab personal access token in GitLab User Settings and replace it with a scoped project token.',
    bestPractice: 'Use GitLab CI job tokens or short-lived OAuth tokens instead of personal access tokens.'
  },
  {
    name: 'npm Access Token',
    regex: /\b(npm_[A-Za-z0-9]{36})\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the npm access token at npmjs.com/settings/tokens and reissue with publish-only scope.',
    bestPractice: 'Publish via CI with per-release granular access tokens, never committed to source.'
  },
  {
    name: 'HashiCorp Vault Token',
    regex: /\b(hvs\.[A-Za-z0-9_-]{24,})\b/g,
    valueGroup: 0,
    severity: 'High',
    weight: 9,
    fix: 'Revoke the Vault token using vault token revoke and renew it through a short-lived auth method.',
    bestPractice: 'Use Kubernetes/Vault agent short-lived tokens and never write root tokens to disk.'
  },
  {
    name: 'Email Address PII',
    regex: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    valueGroup: 0,
    severity: 'Low',
    weight: 3,
    fix: 'Sanitise user emails or log profiles from development scripts to prevent harvesting by scraping bots.',
    bestPractice: 'Mask personal details and use system hashes to represent identities in logs.'
  },
  {
    name: 'Phone Number PII',
    regex: /(?<![\w.%])(?:\(\d{2,4}\)\s*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{3}[-.]?\d{3}[-.]?\d{4}|\d{10})(?![\w-])/g,
    valueGroup: 0,
    severity: 'Low',
    weight: 3,
    fix: 'Remove phone structures or utilize dummy mock profiles in sandbox configurations.',
    bestPractice: 'Encrypt citizen contact fields dynamically.'
  }
];