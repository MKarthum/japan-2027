import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const excluded = new Set(['.git', 'node_modules']);
const textExt = new Set(['.md','.html','.css','.js','.mjs','.json','.yml','.yaml','.txt']);
const findings = [];

const patterns = [
  { name: 'mulig e-postadresse', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { name: 'mulig norsk telefonnummer', re: /\+47(?:[ .-]?\d){8}\b/g },
  { name: 'mulig bookingkode', re: /\b(?:PNR|booking(?: reference|referanse)?|reservation code|billettnummer|ticket number|passport number|passnummer)\s*[:=]\s*[A-Z0-9]{5,16}\b/gi }
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExt.has(path.extname(entry.name))) scan(full);
  }
}

function scan(file) {
  const rel = path.relative(root, file);
  if (rel === 'scripts/check-public-content.mjs' || rel === 'PUBLIC_DATA_POLICY.md' || rel === 'AGENTS.md') return;
  const txt = fs.readFileSync(file, 'utf8');
  for (const p of patterns) {
    const matches = [...txt.matchAll(p.re)];
    if (matches.length) findings.push(`${rel}: ${p.name} (${matches.length})`);
  }
}

walk(root);
if (findings.length) {
  console.error('Mulig privat innhold funnet:\n' + findings.map(x=>`- ${x}`).join('\n'));
  console.error('\nVurder treffene manuelt før publisering.');
  process.exit(1);
}
console.log('OK: ingen enkle personvernmønstre funnet. Manuell vurdering er fortsatt påkrevd.');
