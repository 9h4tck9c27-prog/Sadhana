// A day lost to a stale anchor must never be called a break, and a day that
// was genuinely missed must never be rescued by one.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let S, DEVICE_TZ;
const LOG_GRACE_HOURS = 6;
const TRAVEL = {tz:null, touched:false, dismissed:false};

eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));
eval(js.slice(js.indexOf('function tzOffsetMs'), js.indexOf('function humanLeft')));
eval(js.slice(js.indexOf('function highestMarked'), js.indexOf('function tzOffsetMs')));
// this slice carries dayNumberUnder, deviceTz, staleAnchor and anchorShift
eval(js.slice(js.indexOf('function dayNumberUnder'), js.indexOf('function daysBetween')));
// stand the test somewhere of its choosing — must come AFTER the eval, which
// defines the real deviceTz and would otherwise overwrite this
deviceTz = function(){ return DEVICE_TZ; };

// the router, reduced to the decisions an anchor can reach
function screen(now){
  const a = currentAttempt();
  const day = dayNumber(now), marked = highestMarked(a);
  if(marked >= S.lengthDays) return 'complete';
  if(day > marked + 1 && !a.broken && !TRAVEL.dismissed && staleAnchor(now)) return 'travel';
  if(day === marked + 2 && !a.broken && a.askedYMD !== logicalYMD(now)
     && msSinceClose(now) < LOG_GRACE_HOURS * 3600000) return 'yesterday';
  if(day > marked + 1 && !a.broken) return 'break';
  if(a.broken) return 'break';
  if(!Number.isFinite(day) || day < 1) return 'waiting';
  if(marked >= day) return 'thread';
  return 'today';
}

function record(startYMD, days, tz, hour){
  const entries = [];
  for(let d = 1; d <= days; d++){
    entries.push({day:d,
      ymd:new Date(Date.parse(startYMD + 'T12:00:00Z') + (d-1)*86400000).toISOString().slice(0,10),
      startedAt:1, minutes:30, before:'Tender', after:'Steady'});
  }
  return {practice:'Pran Vayu Kryia', lengthDays:40, dayStartHour:hour, tz,
          attempts:[{startYMD, entries, broken:false, obstacle:null, askedYMD:null}]};
}

let pass = 0, fail = 0;
function ok(l, c, d){ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} }
function reset(){ TRAVEL.tz=null; TRAVEL.touched=false; TRAVEL.dismissed=false; }

// Home from London. 4:47pm Saturday in Los Angeles is already 00:47 Sunday
// in London, so the anchor has rolled a day that has not happened here.
// Day 25 is the last recorded; day 26 is today and still unpractised.
const NOW   = new Date('2026-10-17T16:47:00-07:00');
const START = '2026-09-22';

console.log('\nHOME FROM LONDON — THE ANCHOR IS A DAY AHEAD\n');
reset();
S = record(START, 25, 'Europe/London', 0);
DEVICE_TZ = 'America/Los_Angeles';
ok('anchored to London it reads day ' + dayNumber(NOW), dayNumber(NOW) === 27);
ok('  which would have been a break', dayNumber(NOW) > highestMarked(S.attempts[0]) + 1);
ok('the app offers the anchor instead', screen(NOW) === 'travel');

const sh = anchorShift(NOW, 'America/Los_Angeles');
ok('moving home gives day ' + sh.to, sh.to === 26);
ok('  which is exactly the next unrecorded day', sh.to === sh.marked + 1);
ok('  so the move is allowed', sh.safe === true);

const before = JSON.stringify(S.attempts);
S.tz = 'America/Los_Angeles';
ok('after moving, today is day 26', dayNumber(NOW) === 26);
ok('  and it is offered to practise', screen(NOW) === 'today');
ok('  with the record untouched', JSON.stringify(S.attempts) === before);
ok('  twenty-five days still recorded', highestMarked(S.attempts[0]) === 25);

console.log('\n  --- it cannot rescue a day that was really missed ---');
reset();
// Same place as the anchor: no travel, no rescue.
S = record(START, 25, 'America/Los_Angeles', 0);
DEVICE_TZ = 'America/Los_Angeles';
const LATE = new Date('2026-10-18T10:00:00-07:00');   // day 27 at home
ok('at home, two days past the last recorded', dayNumber(LATE) === 27);
ok('  the anchor offers nothing', staleAnchor(LATE) === false);
ok('  and after the grace window it is a break',
   screen(new Date('2026-10-18T16:00:00-07:00')) === 'break');

reset();
// Abroad, but genuinely two days behind: the shift cannot reach marked+1.
S = record(START, 24, 'Europe/London', 0);
DEVICE_TZ = 'America/Los_Angeles';
ok('two days genuinely missed: the shift is refused',
   anchorShift(NOW, 'America/Los_Angeles').safe === false);
ok('  so it is still a break', screen(NOW) === 'break');

console.log('\n  --- the honest opt-out ---');
reset();
S = record(START, 25, 'Europe/London', 0);
DEVICE_TZ = 'America/Los_Angeles';
ok('offered the anchor', screen(NOW) === 'travel');
TRAVEL.dismissed = true;
ok('saying "no, I did miss a day" asks about yesterday instead', screen(NOW) === 'yesterday');
S.attempts[0].askedYMD = logicalYMD(NOW);
ok('  and answering that honestly reaches the break', screen(NOW) === 'break');

console.log('\n  --- the grace route that went missing ---');
reset();
S = record(START, 25, 'America/Los_Angeles', 0);
DEVICE_TZ = 'America/Los_Angeles';
const SOON = new Date('2026-10-18T03:00:00-07:00');   // 3h past midnight at home
ok('one day unlogged, inside the window: asked about yesterday',
   screen(SOON) === 'yesterday');
S.attempts[0].askedYMD = logicalYMD(SOON);
ok('  asked only once', screen(SOON) === 'break');

console.log('\n  --- ordinary days are unaffected ---');
reset();
S = record(START, 26, 'America/Los_Angeles', 0);
DEVICE_TZ = 'America/Los_Angeles';
ok('today already practised shows the thread',
   screen(new Date('2026-10-17T20:00:00-07:00')) === 'thread');
reset();
S = record(START, 25, 'America/Los_Angeles', 0);
ok('today not yet practised shows today',
   screen(new Date('2026-10-17T09:00:00-07:00')) === 'today');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
