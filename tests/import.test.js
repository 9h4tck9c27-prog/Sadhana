// Export must be readable back in, and import must refuse anything it cannot
// trust. Uses the real functions lifted from index.html.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

// minimal browser shims
global.btoa = s => Buffer.from(s, 'binary').toString('base64');
global.atob = s => Buffer.from(s, 'base64').toString('binary');

let S;
const nowYMD = () => '2026-08-24';
const highestMarked = a => (a && a.entries.length) ? Math.max(...a.entries.map(e => e.day)) : 0;
const currentAttempt = () => S.attempts[S.attempts.length - 1] || null;
const toast = () => {};
let written = '';
global.Blob = function(parts){ written = parts.join(''); };
global.URL = {createObjectURL: () => 'blob:x', revokeObjectURL(){}};
global.document = {createElement: () => ({click(){}, set href(v){}, set download(v){}})};
global.setTimeout = (f) => f && 0;

eval(js.slice(js.indexOf('function entryTime'), js.indexOf('function stampEntryZones')));
eval(js.slice(js.indexOf('function entryWeight'), js.indexOf('/* ---------- carrying')));
// the slice runs from exportAll through the parser, and declares SAVE_MARK itself
eval(js.slice(js.indexOf('function exportAll'), js.indexOf('const IMPORT ='))
     .replace(/^const SAVE_MARK/m, 'var SAVE_MARK') + '\nvar IMPORT={};');

function makeState(practice, days, attempts){
  const st = {practice, lengthDays:40, dayStartHour:3, tz:'Europe/London',
              startDate:'2026-08-09', words:['Heavy','Clear'], attempts:[], completed:[],
              onboarded:true, installShown:true, updatedAt:1000};
  for(let a = 0; a < (attempts || 1); a++){
    const entries = [];
    const n = (a === (attempts || 1) - 1) ? days : 3;
    for(let d = 1; d <= n; d++){
      entries.push({day:d, ymd:'2026-08-' + String(8+d).padStart(2,'0'),
        before:'Restless', after:'Clear', minutes:31, startedAt:1786000000000,
        tz:'Europe/London', loggedLate: d === 2,
        note:'Hands went warm. Did not chase it.'});
    }
    st.attempts.push({startYMD:'2026-08-0' + (a+1), entries, broken: a < (attempts||1)-1,
                      obstacle: a < (attempts||1)-1 ? 'Carelessness' : null});
  }
  return st;
}

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if(cond) { pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail !== undefined ? '  ' + detail : '')); }
}

console.log('\nEXPORT / IMPORT ROUND TRIP\n');

S = makeState('Vyana Vayu Kriya', 15, 1);
exportAll();
const file = written;

ok('the file is human readable at the top', file.startsWith('SADHANA — Vyana Vayu Kriya'));
ok('a day is legible in it', file.includes('Restless -> Clear'));
ok('the note survives', file.includes('Hands went warm'));
ok('it carries a machine section', file.includes(SAVE_MARK));

const res = parseBackup(file);
ok('it parses back', !res.error, res.error);
ok('practice matches', res.state && res.state.practice === 'Vyana Vayu Kriya');
ok('all fifteen days return', res.state && res.state.attempts[0].entries.length === 15);
ok('notes return intact', res.state && res.state.attempts[0].entries[0].note === 'Hands went warm. Did not chase it.');

const sum = describeBackup(res.state);
ok('summary counts days', sum.days === 15, sum.days);
ok('summary reports furthest day', sum.best === 15, sum.best);

ok('a late-logged day is named in the readable half',
   file.includes('logged the next day'), 'marker missing');

ok('the anchor stamp survives the round trip',
   res.state.attempts[0].entries[0].tz === 'Europe/London',
   String(res.state.attempts[0].entries[0].tz));

console.log('\n  --- merging into an existing record ---');
const backup = makeState('Vyana Vayu Kriya', 15, 1);
const onPhone = makeState('Vyana Vayu Kriya', 8, 1);
const merged = mergeState(onPhone, backup);
ok('no day is lost', merged.attempts[0].entries.length === 15, merged.attempts[0].entries.length);
ok('merging twice changes nothing',
   JSON.stringify(mergeState(merged, merged)) === JSON.stringify(merged));

const fresh = mergeState(null, backup);
ok('restoring onto an empty app works', fresh.attempts[0].entries.length === 15);

console.log('\n  --- files it must refuse ---');
ok('a plain note', parseBackup('just some text I wrote').error !== undefined);
ok('an empty file', parseBackup('').error !== undefined);
ok('marker but no data', parseBackup('x\n' + SAVE_MARK + '\n').error !== undefined);
ok('corrupted payload', parseBackup('x\n' + SAVE_MARK + '\nnot-valid-base64!!!').error !== undefined);
ok('valid base64, wrong shape',
   parseBackup('x\n' + SAVE_MARK + '\n' + btoa(JSON.stringify({v:1,state:{nope:true}}))).error !== undefined);

console.log('\n  --- a multi-attempt record ---');
S = makeState('Samana Vayu Kriya', 20, 3);
written = ''; exportAll();
const r3 = parseBackup(written);
ok('three attempts survive', !r3.error && r3.state.attempts.length === 3);
ok('the obstacle survives', r3.state.attempts[0].obstacle === 'Carelessness');
ok('broken attempts stay broken', r3.state.attempts[0].broken === true);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
