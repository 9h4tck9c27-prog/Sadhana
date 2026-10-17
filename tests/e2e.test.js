// Walks a new user through the whole app using the real date, routing and
// merge logic lifted out of index.html. Simulates taps; asserts the screen
// reached at every step.
const fs = require('fs');
const path = require('path');
const srcHtml = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = srcHtml.slice(srcHtml.lastIndexOf('<script>') + 8, srcHtml.lastIndexOf('</script>'));

let S, NOW, STANDALONE = false, SIGNED_IN = false, PULLING = false,
    SETTLED = true, RETURNING = false, CONFIGURED = true;

const nowYMD = () => ymdIn(NOW, S.tz);
const save = () => { S.updatedAt = NOW.getTime(); };
const isStandalone = () => STANDALONE;
const syncConfigured = () => CONFIGURED;

// real helpers from the page
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function msUntilClose')));
eval(js.slice(js.indexOf('function entryWeight'), js.indexOf('function stampSeed')));

function blank(){
  return {practice:'', lengthDays:40, dayStartHour:3, tz:'Europe/London', startDate:null,
          words:['Heavy','Restless','Clear'], attempts:[], completed:[], onboarded:false,
          installShown:false, syncOffered:false, freshStart:false, updatedAt:0};
}

// mirrors the router in render()
function screen(){
  if(!S.installShown && !isStandalone()) return 'install';
  if(CONFIGURED && ((!SETTLED && RETURNING) || (PULLING && !S.practice))) return 'authwait';
  if(!S.practice && isStandalone() && CONFIGURED && !SIGNED_IN && !S.freshStart) return 'restore';
  if(!S.practice) return 'setup';
  if(CONFIGURED && !SIGNED_IN && !S.syncOffered) return 'signin';
  if(!S.onboarded) return 'ritual';
  const a = currentAttempt();
  if(!a) return 'setup';
  const day = dayNumber(NOW), marked = highestMarked(a);
  if(marked >= S.lengthDays) return 'complete';
  if(day > marked + 1 || a.broken) return 'break';
  if(!Number.isFinite(day) || day < 1) return 'waiting';
  if(marked >= day) return 'thread';
  return 'today';
}

let pass = 0, fail = 0, step = 0;
function at(expected, note){
  step++;
  const got = screen();
  if(got === expected){ pass++; console.log(`  ${String(step).padStart(2)}. ok    ${note.padEnd(46)} ${got}`); }
  else { fail++; console.log(`  ${String(step).padStart(2)}. FAIL  ${note.padEnd(46)} got ${got}, wanted ${expected}`); }
}

CONFIGURED = false;   // cloud backup is switched off

console.log('\nNEW USER — install first, no accounts\n');
S = blank();
NOW = new Date('2026-08-08T20:00:00Z');

at('install', 'opens the site in a browser for the first time');

console.log('\n  --- installs, then opens the app ---');
S = blank(); STANDALONE = true;      // fresh container, nothing to carry across
at('setup', 'opens the installed app — straight to setup');

S.practice = 'Vyana Vayu Kriya'; S.startDate = '2026-08-09'; save();
at('ritual', 'names the practice, holds I UNDERSTAND');

S.onboarded = true;
S.attempts.push({startYMD: S.startDate, entries: [], broken: false, obstacle: null});
save();
at('waiting', 'holds BEGIN DAY ONE — sadhana starts tomorrow');

console.log('\n  --- the practice itself ---');
NOW = new Date('2026-08-09T04:30:00Z');
at('today', 'day one, 5:30am, not yet practised');

const a = () => S.attempts[S.attempts.length - 1];
function keep(day, ymd){
  a().entries.push({day, ymd, startedAt: NOW.getTime(), minutes: 31,
                    before: 'Restless', after: 'Clear', note: 'Sat.'});
  save();
}
keep(1, '2026-08-09');
at('thread', 'saves day one');

NOW = new Date('2026-08-10T04:30:00Z');
at('today', 'day two arrives');
keep(2, '2026-08-10');
at('thread', 'saves day two');

NOW = new Date('2026-08-11T01:00:00+01:00');   // 1am local, before the 3am close
at('thread', 'still day two at 1am — boundary not crossed');
NOW = new Date('2026-08-11T03:00:00+01:00');   // 3am local, the day turns over
at('today', 'day three opens at 3am exactly');

NOW = new Date('2026-08-12T04:30:00Z');
at('break', 'skips day three — the thread breaks');

a().broken = true;
S.attempts.push({startYMD: '2026-08-12', entries: [], broken: false, obstacle: 'Carelessness'});
save();
at('today', 'begins again today — back to day one');

console.log('\n  --- carrying it to completion ---');
for(let d = 1; d <= 40; d++){
  NOW = new Date(Date.parse('2026-08-12T04:30:00Z') + (d - 1) * 86400000);
  keep(d, ymdIn(new Date(NOW.getTime() - 3 * 3600000), S.tz));
}
at('complete', 'forty days kept without a gap');

console.log('\n  --- what the record says ---');
const st = (function(){
  const es = a().entries;
  const mode = k => { const c = {}; es.forEach(e => { if(e[k]) c[e[k]] = (c[e[k]] || 0) + 1; });
    return Object.keys(c).sort((x, y) => c[y] - c[x])[0] || '—'; };
  return {days: es.length, attempts: S.attempts.length, before: mode('before'), after: mode('after')};
})();
console.log(`      days kept: ${st.days} of ${S.lengthDays}   attempts: ${st.attempts}   ${st.before} → ${st.after}`);
if(st.days !== 40) fail++; else pass++;
if(st.attempts !== 2) fail++; else pass++;

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
