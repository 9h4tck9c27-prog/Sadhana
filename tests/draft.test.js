// A sitting that was started and never finished must not evaporate — and
// must never be turned into a claim the app cannot support.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let S, DEVICE_TZ = 'America/Los_Angeles';
const TRAVEL = {tz:null, touched:false, dismissed:false};
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));
eval(js.slice(js.indexOf('function highestMarked'), js.indexOf('function tzOffsetMs')));
eval(js.slice(js.indexOf('function tzOffsetMs'), js.indexOf('function humanLeft')));
eval(js.slice(js.indexOf('function draftYMD'), js.indexOf('function anchorShift')));
eval(js.slice(js.indexOf('function anchorShift'), js.indexOf('function daysBetween')));
deviceTz = function(){ return DEVICE_TZ; };

function screen(now){
  const a = currentAttempt();
  const day = dayNumber(now), marked = highestMarked(a);
  if(marked >= S.lengthDays) return 'complete';
  if(day > marked + 1 && !a.broken && !TRAVEL.dismissed && staleAnchor(now)) return 'travel';
  if(day === marked + 2 && !a.broken && a.askedYMD !== logicalYMD(now)) return 'yesterday';
  if(day > marked + 1 && !a.broken) return 'break';
  if(a.broken) return 'break';
  if(!Number.isFinite(day) || day < 1) return 'waiting';
  if(marked >= day) return 'thread';
  if(draftYMD() === logicalYMD(now)) return 'unfinished';
  return 'today';
}

function state(marked, draft){
  const st = {practice:'Pran Vayu Kryia', lengthDays:40, dayStartHour:0,
              tz:'America/Los_Angeles', draft: draft || null,
              attempts:[{startYMD:'2026-09-22', entries:[], broken:false,
                         obstacle:null, askedYMD:null}]};
  for(let d = 1; d <= marked; d++){
    st.attempts[0].entries.push({day:d,
      ymd:new Date(Date.parse('2026-09-22T12:00:00Z') + (d-1)*86400000).toISOString().slice(0,10),
      startedAt:1, minutes:29, before:'Steady', after:'Fulfilled'});
  }
  return st;
}

let pass = 0, fail = 0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

// 28 days recorded; day 29 is today. The timer started at 7:14am and the
// app was closed before it was stopped.
const START = Date.parse('2026-10-20T07:14:00-07:00');
const SAME_DAY  = new Date('2026-10-20T16:30:00-07:00');
const NEXT_DAY  = new Date('2026-10-21T07:30:00-07:00');
const TWO_LATER = new Date('2026-10-22T07:30:00-07:00');

console.log('\nAN UNFINISHED SITTING\n');

S = state(28, {startedAt: START, before: 'Scattered', note: ''});
ok('later the same day, the app offers to finish it', screen(SAME_DAY) === 'unfinished');
ok('  rather than inviting a fresh sitting', screen(SAME_DAY) !== 'today');

S = state(28, null);
ok('with no draft, the day is simply offered', screen(SAME_DAY) === 'today');

S = state(29, {startedAt: START, before: 'Scattered'});
ok('a draft left over after the day is recorded does not reappear',
   screen(SAME_DAY) === 'thread');

console.log('\n  --- a sitting left unfinished overnight ---');
S = state(28, {startedAt: START, before: 'Scattered', note: ''});
ok('the next day it becomes the question about yesterday',
   screen(NEXT_DAY) === 'yesterday');
ok('  and the app knows the sitting belongs to yesterday',
   draftYMD() === '2026-10-20', String(draftYMD()));

// answering yes, with the handler's own logic
const a = currentAttempt();
const marked = highestMarked(a);
const now = NEXT_DAY;
const yday = addDays(logicalYMD(now), -1);
const d = (draftYMD() === yday) ? S.draft : {};
a.entries.push({day: marked + 1, ymd: yday,
                startedAt: d.startedAt || null, tz: S.tz, minutes: null,
                before: d.before || null, after: d.after || null,
                note: d.note || '', loggedLate: true});
if(draftYMD() === yday) S.draft = null;
a.askedYMD = logicalYMD(now);

const added = a.entries.find(e => e.day === 29);
ok('day 29 is recorded', !!added);
ok('  keeping the word chosen before the sitting', added.before === 'Scattered');
ok('  keeping the hour it began', added.startedAt === START);
ok('  claiming no length, because none was measured', added.minutes === null);
ok('  and no feeling it never collected', added.after === null);
ok('  flagged as logged late', added.loggedLate === true);
ok('the draft is consumed, not left to reappear', S.draft === null);
ok('and today is now offered normally', screen(NEXT_DAY) === 'today');

console.log('\n  --- and the thread says it was logged late ---');
const fs2 = require('fs');
const page = fs2.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const row = page.slice(page.indexOf('<div class="entry'), page.indexOf('<div class="entry') + 800);
ok('the marker does not depend on the before-word being absent',
   row.includes('${e.loggedLate ? `<div class="late">Logged the next day</div>` : \'\'}'));
ok('  so a day with a before-word still shows it',
   !row.includes("e.loggedLate && !e.before"));
ok('a day with neither word still reads as practised',
   row.includes("(!e.before && !e.after)"));

console.log('\n  --- it never rescues more than the rule allows ---');
S = state(28, {startedAt: START, before: 'Scattered'});
ok('two days on, a stale draft does not resurrect anything',
   screen(TWO_LATER) === 'break');

S = state(28, {startedAt: START, before: 'Scattered'});
S.attempts[0].askedYMD = logicalYMD(NEXT_DAY);
ok('and the question is still asked only once', screen(NEXT_DAY) === 'break');

console.log('\n  --- discarding is honest too ---');
S = state(28, {startedAt: START, before: 'Scattered'});
S.draft = null;
ok('after discarding, the day is still there to practise',
   screen(SAME_DAY) === 'today');
ok('  and nothing was written to the record',
   highestMarked(currentAttempt()) === 28);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
