import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const sitePath='docs/data/site.json';
const site=JSON.parse(fs.readFileSync(sitePath,'utf8'));
const errors=[];

function git(args) {
  return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
function semver(value) {
  const m=/^(\d+)\.(\d+)\.(\d+)$/.exec(value||'');
  return m ? m.slice(1).map(Number) : null;
}
function greater(a,b) {
  for (let i=0;i<3;i++) {
    if (a[i]!==b[i]) return a[i]>b[i];
  }
  return false;
}

let baseline='HEAD';
if (process.env.GITHUB_ACTIONS) {
  baseline=process.env.GITHUB_REF_NAME==='main' ? 'HEAD^' : 'origin/main';
}

let changed=[];
try {
  const output=git(['diff','--name-only',baseline,'--']);
  changed=output ? output.split('\n').filter(Boolean) : [];
} catch {
  changed=[];
}
if (!changed.length) {
  console.log(`OK: ingen endringer mot ${baseline}; versjonssjekk ikke nødvendig.`);
  process.exit(0);
}

let previous;
try {
  previous=JSON.parse(git(['show',`${baseline}:${sitePath}`]));
} catch {
  console.error(`Kunne ikke lese forrige ${sitePath} fra ${baseline}.`);
  process.exit(1);
}

const currentSemver=semver(site.version);
const previousSemver=semver(previous.version);
if (!currentSemver) errors.push(`site.json: ugyldig semver ${site.version}`);
if (!previousSemver) errors.push(`forrige site.json: ugyldig semver ${previous.version}`);
if (site.version===previous.version) errors.push(`site.json: versjonen må bumpes ved hver publisert endring (fortsatt ${site.version})`);
if (currentSemver && previousSemver && !greater(currentSemver,previousSemver)) {
  errors.push(`site.json: versjonen må øke (${previous.version} → ${site.version})`);
}
if (!site.released) errors.push('site.json: released mangler');

if (errors.length) {
  console.error('Release-disiplinfeil:\n' + errors.map(x=>`- ${x}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${previous.version} → ${site.version}; ${changed.length} endrede filer omfattes av samme release.`);
