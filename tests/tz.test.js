// Moving the anchor timezone mid-container re-evaluates which sadhana-day
// "now" belongs to. Entries keep the ymd they were written with, so the
// question is only ever: does the day number move, and does it move far
// enough to break the thread?
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let S;
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function highestMarked'), js.indexOf('function msUntilClose')));
eval(js.slice(js.indexOf('function dayNumberUnder'), js.indexOf('function daysBetween')));

// the router's decision, reduced to the part the anchor can affect
function screen(now){
  const a = currentAttempt();
  const day = dayNumber(now), marked = highestMarked(a);
  if(marked >= S.lengthDays) return 'complete';
  if(day > marked + 1 && !a.broken) return 'break';
  if(!Number.isFinite(day) || day < 1) return 'waiting';
  if(marked >= day) return 'thread';
  return 'today';
}

function record(startYMD, days, tz, hour){
  const entries = [];
  for(let d = 1; d <= days; d++){
    const ymd = new Date(Date.parse(startYMD + 'T12:00:00Z') + (d-1)*86400000)
                  .toISOString().slice(0,10);
    entries.push({day:d, ymd, startedAt:1, minutes:35, before:'Tender', after:'Steady', note:''});
  }
  return {practice:'Samana Vayu', lengthDays:40, dayStartHour:hour, tz,
          attempts:[{startYMD, entries, broken:false, obstacle:null}]};
}

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if(cond){ pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail !== undefined ? '  ' + detail : '')); }
}

// Ten days in, last logged on the LA day that is still in progress.
// It is 06:00 Tuesday in London, which is 22:00 Monday in Los Angeles.
const NOW = new Date('2026-10-13T06:00:00+01:00');
const START = '2026-10-03';

console.log('\nTHE SITUATION, AS IT STANDS');
S = record(START, 10, 'America/Los_Angeles', 0);
console.log('  anchored to Los Angeles, 10 days logged, the last on ' +
            S.attempts[0].entries[9].ymd);
ok('the app thinks today is ' + logicalYMD(NOW), logicalYMD(NOW) === '2026-10-12');
ok('day number reads ' + dayNumber(NOW), dayNumber(NOW) === 10);
ok('so the screen shows the thread — already practised', screen(NOW) === 'thread');

console.log('\nAFTER MOVING THE ANCHOR TO LONDON');
S.tz = 'Europe/London';
ok('today becomes ' + logicalYMD(NOW), logicalYMD(NOW) === '2026-10-13');
ok('day number becomes ' + dayNumber(NOW), dayNumber(NOW) === 11);
ok('the screen offers day 11', screen(NOW) === 'today');
ok('THE THREAD DOES NOT BREAK', screen(NOW) !== 'break');
ok('no entry was altered', S.attempts[0].entries[9].ymd === '2026-10-12');

console.log('\n  --- the case that would break it ---');
// Someone who has NOT yet logged the current day is already at marked+1.
// Shifting forward puts them at marked+2, which the router reads as a gap.
S = record(START, 9, 'America/Los_Angeles', 0);
ok('unlogged today, anchored to LA: day ' + dayNumber(NOW) + ', screen ' + screen(NOW),
   screen(NOW) === 'today');
S.tz = 'Europe/London';
ok('after the shift it would read as a break', screen(NOW) === 'break');
console.log('      -> the change must be refused in this state, or the day logged first');

console.log('\n  --- flying home again ---');
S = record(START, 11, 'Europe/London', 0);
const BACK = new Date('2026-10-20T06:00:00+01:00');
S.attempts[0].entries = record(START, 18, 'Europe/London', 0).attempts[0].entries;
const beforeHome = dayNumber(BACK);
S.tz = 'America/Los_Angeles';
const afterHome = dayNumber(BACK);
ok('the day number steps back by one (' + beforeHome + ' -> ' + afterHome + ')',
   afterHome === beforeHome - 1);
ok('which shows the thread, not a break', screen(BACK) === 'thread');
console.log('      -> one logging slot is skipped, the count is never lost');

console.log('\n  --- a 3am boundary, not midnight ---');
S = record(START, 10, 'America/Los_Angeles', 3);
const preDawn = new Date('2026-10-13T06:00:00+01:00');   // 22:00 Mon in LA
ok('LA anchor, 3am boundary: day ' + dayNumber(preDawn), dayNumber(preDawn) === 10);
S.tz = 'Europe/London';
ok('London anchor, 3am boundary: day ' + dayNumber(preDawn), dayNumber(preDawn) === 11);
ok('still no break', screen(preDawn) !== 'break');

console.log('\n  --- the guard the app actually uses ---');

S = record(START, 10, 'America/Los_Angeles', 0);
let g = anchorShift(NOW, 'Europe/London');
ok('ten days logged: the move is allowed (' + g.from + ' -> ' + g.to + ')', g.safe === true);

S = record(START, 9, 'America/Los_Angeles', 0);
g = anchorShift(NOW, 'Europe/London');
ok('today unlogged: the move is refused', g.safe === false);
ok('  and it says how far past (' + (g.to - g.marked) + ' days)', g.to - g.marked === 2);

S = record(START, 10, 'America/Los_Angeles', 0);
g = anchorShift(NOW, 'America/Los_Angeles');
ok('choosing the anchor it already has is a no-op', g.same === true);

S = record(START, 10, 'Europe/London', 0);
g = anchorShift(NOW, 'America/Los_Angeles');
ok('stepping the anchor backwards is allowed', g.safe === true);
ok('  and moves the day back (' + g.from + ' -> ' + g.to + ')', g.to === g.from - 1);

S = record(START, 10, 'America/Los_Angeles', 0);
g = anchorShift(NOW, 'Asia/Tokyo');
ok('a far eastward jump is still only one day (' + g.from + ' -> ' + g.to + ')',
   g.to === g.from + 1 && g.safe === true);

S = record(START, 10, 'America/Los_Angeles', 3);
g = anchorShift(NOW, 'Europe/London');
ok('the 3am boundary is honoured by the guard', g.safe === true && g.to === 11);

console.log('\n  --- the record is never touched ---');
S = record(START, 21, 'America/Los_Angeles', 0);
S.attempts[0].startYMD = '2026-09-22';
S.attempts[0].entries = (function(){
  const out = [];
  for(let d = 1; d <= 21; d++){
    const ymd = new Date(Date.parse('2026-09-22T12:00:00Z') + (d-1)*86400000)
                  .toISOString().slice(0,10);
    out.push({day:d, ymd, startedAt:1, minutes:28, before:'Tender', after:'Steady'});
  }
  return out;
})();
const NOW2 = new Date('2026-10-13T06:13:00+01:00');
const before = JSON.stringify(S.attempts);
const sh = anchorShift(NOW2, 'Europe/London');
ok('today reads day ' + sh.from + ' and would read day ' + sh.to, sh.from === 21 && sh.to === 22);
ok('  dated ' + sh.fromYMD + ' -> ' + sh.toYMD,
   sh.fromYMD === '2026-10-12' && sh.toYMD === '2026-10-13');
S.tz = 'Europe/London';
ok('day 21 is still day 21', S.attempts[0].entries[20].day === 21);
ok('  still dated 2026-10-12', S.attempts[0].entries[20].ymd === '2026-10-12');
ok('not one entry changed', JSON.stringify(S.attempts) === before);
ok('the next practice offered is day 22', dayNumber(NOW2) === 22 && screen(NOW2) === 'today');
ok('and it sits exactly one past the last recorded',
   dayNumber(NOW2) === highestMarked(S.attempts[0]) + 1);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
