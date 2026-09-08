// CLI mirror of the SecureGaurd detection rules. Kept as a re-export of the app's
// single source of truth (src/lib/detection-rules.js) so CLI/dev tools always
// run the same boundary-safe regexes and value groups as the production scanner.
export { RULES } from '../src/lib/detection-rules.js';
