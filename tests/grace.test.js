// Verifies the grace window keeps a genuinely practised day, and that it never
// rescues a day that was actually missed.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let S, NOW;
const nowYMD = () => ymdIn(NOW, S.tz);
const save = () => {};
const isStandalone = () => true;
const syncConfigured = () => false;
const LOG_GRACE_HOURS = 6;

eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function fmtDate')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));

function screen(){
  const a = currentAttempt();
  if(!a) return 'setup';
  const day = dayNumber(NOW), marked = highestMarked(a);
  if(marked >= S.lengthDays) return 'complete';
  if(day === marked + 2 && !a.broken && a.askedYMD !== logicalYMD(NOW)
     && msSinceClose(NOW) < LOG_GRACE_HOURS * 3600000) return 'yesterday';
  if(day > marked + 1 || a.broken) return 'break';
  if(!Number.isFinite(day) || day < 1) return 'waiting';
  if(marked >= day) return 'thread';
  return 'today';
}

let pass = 0, fail = 0;
function ok(label, got, want){
  if(got === want){ pass++; console.log('  ok    ' + label.padEnd(52) + got); }
  else { fail++; console.log('  FAIL  ' + label.padEnd(52) + 'got ' + got + ', wanted ' + want); }
}

function setup(marked, opts){
  S = {practice:'V', lengthDays:40, dayStartHour:3, tz:'Europe/London',
       attempts:[{startYMD:'2026-08-09', entries:[], broken:false, obstacle:null,
                  askedYMD:(opts&&opts.asked)||null}]};
  for(let d = 1; d <= marked; d++){
    S.attempts[0].entries.push({day:d, ymd:'2026-08-' + String(8+d).padStart(2,'0'),
      before:'Restless', after:'Clear', minutes:31, startedAt:1, note:''});
  }
}

console.log('\nGRACE WINDOW — forgiving about logging, strict about practice\n');

// day 3 marked; it is now day 4 — nothing missing yet
setup(3); NOW = new Date('2026-08-12T06:00:00+01:00');
ok('day four, day three marked — normal morning', screen(), 'today');

// day 3 marked; it is now day 5, 6am, boundary passed 3 hours ago
setup(3); NOW = new Date('2026-08-13T06:00:00+01:00');
ok('day four unmarked, 3h past the boundary', screen(), 'yesterday');

// same, but the window has closed
setup(3); NOW = new Date('2026-08-13T12:00:00+01:00');
ok('same day, 9h past — window closed', screen(), 'break');

// already answered today
setup(3, {asked:'2026-08-13'}); NOW = new Date('2026-08-13T06:00:00+01:00');
ok('already answered — not asked twice', screen(), 'break');

// answering yes keeps the thread
setup(3); NOW = new Date('2026-08-13T06:00:00+01:00');
const a = S.attempts[0];
a.entries.push({day:4, ymd:'2026-08-12', before:null, after:null,
                minutes:null, startedAt:null, note:'', loggedLate:true});
a.askedYMD = '2026-08-13';
ok('answered yes — thread holds, on day five', screen(), 'today');
ok('  the day is counted', String(highestMarked(a)), '4');

// answering no lets it break
setup(3); NOW = new Date('2026-08-13T06:00:00+01:00');
S.attempts[0].askedYMD = '2026-08-13';
ok('answered no — the thread breaks', screen(), 'break');

// two days missing is never rescued
setup(3); NOW = new Date('2026-08-14T06:00:00+01:00');
ok('two days missing — no grace', screen(), 'break');

// three days missing
setup(3); NOW = new Date('2026-08-16T06:00:00+01:00');
ok('four days missing — no grace', screen(), 'break');

// the grace window must not fire mid-day on a normal day
setup(3); NOW = new Date('2026-08-12T20:00:00+01:00');
ok('evening of a normal day', screen(), 'today');

// completing still works
setup(39); NOW = new Date('2026-09-17T06:00:00+01:00');
ok('day forty, thirty-nine marked', screen(), 'today');
setup(40); NOW = new Date('2026-09-17T06:00:00+01:00');
ok('forty marked — complete', screen(), 'complete');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
