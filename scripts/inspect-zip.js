import fs from 'node:fs';
import JSZip from 'jszip';

const zip = await JSZip.loadAsync(fs.readFileSync('./static/test-data.zip'));

const RULES = [
  { name: 'AWS', regex: /\b(AKIA[0-9A-Z]{16})\b/g },
  { name: 'Aadhaar', regex: /\b(\d{4}\s\d{4}\s\d{4}|\d{12})\b/g },
  { name: 'DB Pass', regex: /\b(password|pass|passwd|db_password|db_pass)\s*=[ \t]*['"]([^'"]+)['"]/ig },
  { name: 'Phone', regex: /\b((?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4})\b/g }
];

let shown = 0;
for (const [rel, entry] of Object.entries(zip.files)) {
  if (entry.dir || rel.includes('README')) continue;
  const text = await entry.async('string');
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length && shown < 25; i++) {
    for (const r of RULES) {
      r.regex.lastIndex = 0;
      if (r.regex.test(lines[i])) {
        console.log(rel, '|', lines[i].trim().slice(0, 90));
        shown++;
        break;
      }
    }
  }
}
