import { analyzeContext } from '../src/lib/ai-engine.js';

const cases = [
  ['real prod AWS leak', {
    filePath: 'config/prod/aws.js',
    matchedValue: 'AKIAZQ5X4Y2N7Q9P8R3W',
    lineContent: 'AWS_ACCESS_KEY = "AKIAZQ5X4Y2N7Q9P8R3W"',
    allLines: ['const AWS_ACCESS_KEY = "AKIAZQ5X4Y2N7Q9P8R3W";'],
    lineIndex: 0,
    secretType: 'AWS Client Access Key'
  }],
  ['placeholder fake', {
    filePath: 'examples/sample.js',
    matchedValue: 'your_api_key_here',
    lineContent: 'const API_KEY = "your_api_key_here";',
    allLines: ['// TODO example', 'const API_KEY = "your_api_key_here";'],
    lineIndex: 1,
    secretType: 'Google API Key'
  }],
  ['db password hardcoded', {
    filePath: 'src/database/conn.js',
    matchedValue: 'p@ssw0rd_XyZ!2024',
    lineContent: 'db_password = "p@ssw0rd_XyZ!2024"',
    allLines: ['db_password = "p@ssw0rd_XyZ!2024"'],
    lineIndex: 0,
    secretType: 'Database Password'
  }],
  ['test mock key', {
    filePath: 'tests/api.test.js',
    matchedValue: 'sk_test_1234567890abcdef',
    lineContent: 'const KEY = "sk_test_1234567890abcdef";',
    allLines: ['describe("api", () => {', 'const KEY = "sk_test_1234567890abcdef";', '});'],
    lineIndex: 1,
    secretType: 'OpenAI API Key'
  }],
  ['env-loaded secure', {
    filePath: 'src/server.js',
    matchedValue: 'process.env.DB_PASS',
    lineContent: 'const DB_PASS = process.env.DB_PASS;',
    allLines: ['const DB_PASS = process.env.DB_PASS;'],
    lineIndex: 0,
    secretType: 'Database Password'
  }],
  ['commented-out real key', {
    filePath: 'src/util.js',
    matchedValue: 'ghp_89d381ad7f23cba922384a8d023bd7',
    lineContent: '// const GH_TOKEN = "ghp_89d381ad7f23cba922384a8d023bd7";',
    allLines: ['// const GH_TOKEN = "ghp_89d381ad7f23cba922384a8d023bd7";'],
    lineIndex: 0,
    secretType: 'GitHub OAuth Token'
  }],
  ['real github token hardcoded', {
    filePath: 'src/github/client.js',
    matchedValue: 'ghp_89d381ad7f23cba922384a8d023bd7',
    lineContent: 'const TOKEN = "ghp_89d381ad7f23cba922384a8d023bd7";',
    allLines: ['const TOKEN = "ghp_89d381ad7f23cba922384a8d023bd7";'],
    lineIndex: 0,
    secretType: 'GitHub OAuth Token'
  }],
  ['placeholder xxxx', {
    filePath: 'config/settings.js',
    matchedValue: 'xxxx-xxxx-xxxx',
    lineContent: 'const API_KEY = "xxxx-xxxx-xxxx";',
    allLines: ['// TODO fill', 'const API_KEY = "xxxx-xxxx-xxxx";'],
    lineIndex: 1,
    secretType: 'Google API Key'
  }]
];

for (const [name, ctx] of cases) {
  const r = analyzeContext(ctx);
  console.log('---', name, '---');
  console.log('  =>', r.decision, r.confidence + '%', '|', r.engine);
}
