// The two on-device stores can fall out of step. Boot must reconcile them
// without ever losing a day.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
eval(js.slice(js.indexOf('function entryWeight'), js.indexOf('/* ---------- carrying')));

const blank = () => ({practice:'', lengthDays:40, dayStartHour:3, tz:'Europe/London',
  words:['Heavy','Clear'], attempts:[], completed:[], updatedAt:0});

function rec(days, opts){
  const st = Object.assign(blank(), {practice:'Vyana Vayu Kriya', onboarded:true},
                           opts || {});
  st.attempts = [{startYMD:'2026-08-09', entries:[], broken:false, obstacle:null}];
  days.forEach(d => st.attempts[0].entries.push({
    day:d, ymd:'2026-08-' + String(8+d).padStart(2,'0'),
    before:'Restless', after:'Clear', minutes:31, startedAt:1, note:'day ' + d}));
  return st;
}

// mirrors the boot reconcile in index.html
function boot(local, idb){
  let S = local;
  if(!idb || !idb.practice) return {S, toast:null};
  const before = S && S.attempts
    ? S.attempts.reduce((n,a)=>n+((a.entries||[]).length),0) : 0;
  const merged = mergeState(S && S.practice ? S : null, idb);
  const after = merged.attempts.reduce((n,a)=>n+((a.entries||[]).length),0);
  S = Object.assign(blank(), merged);
  return {S, toast: after > before
    ? (before === 0 ? 'recovered' : 'recovered ' + (after-before)) : null};
}

const count = s => s && s.attempts ? s.attempts.reduce((n,a)=>n+((a.entries||[]).length),0) : 0;

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if(cond){ pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail!==undefined?'  '+detail:'')); }
}

console.log('\nBOOT RECONCILIATION — two stores, never lose a day\n');

// the reported bug: local storage lost today, the database still has it
let r = boot(rec([...Array(19)].map((_,i)=>i+1)), rec([...Array(20)].map((_,i)=>i+1)));
ok('local lost today, database had it', count(r.S) === 20, count(r.S));
ok('  and it says so', r.toast === 'recovered 1', r.toast);

// the reverse
r = boot(rec([...Array(20)].map((_,i)=>i+1)), rec([...Array(19)].map((_,i)=>i+1)));
ok('database behind — local wins, silently', count(r.S) === 20 && r.toast === null);

// both in step: nothing happens
r = boot(rec([1,2,3]), rec([1,2,3]));
ok('stores agree — no toast, no change', count(r.S) === 3 && r.toast === null);

// local wiped entirely
r = boot(blank(), rec([1,2,3,4,5]));
ok('local wiped — full recovery', count(r.S) === 5 && r.toast === 'recovered');

// disjoint losses on each side
r = boot(rec([1,2,4,5]), rec([1,3,5]));
ok('different gaps — union of both', count(r.S) === 5, count(r.S));

// database empty
r = boot(rec([1,2,3]), null);
ok('no database — local untouched', count(r.S) === 3 && r.toast === null);

// running boot twice must not change anything
const once = boot(rec([1,2,3]), rec([1,2,3,4])).S;
const twice = boot(once, rec([1,2,3,4])).S;
ok('reconciling twice is stable', JSON.stringify(once) === JSON.stringify(twice));

// a richer version of the same day survives
const thin = rec([1]); thin.attempts[0].entries[0].note = '';
const rich = rec([1]);
ok('the fuller entry wins', boot(thin, rich).S.attempts[0].entries[0].note === 'day 1');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
