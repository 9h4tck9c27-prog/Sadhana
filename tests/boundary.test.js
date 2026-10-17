// The day boundary belongs to the anchor, not to the device holding the phone.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
let S;
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));
eval(js.slice(js.indexOf('function tzOffsetMs'), js.indexOf('function humanLeft')));

let pass=0, fail=0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };
const hrs = ms => (ms/3600000).toFixed(2);

console.log('\nTHE DAY BOUNDARY\n');

// Saturday 16:47 in Los Angeles is Sunday 00:47 in London — 47 minutes past
// a London midnight. The device is in LA; the anchor is not.
S = {tz:'Europe/London', dayStartHour:0};
let now = new Date('2026-10-17T16:47:00-07:00');
ok('anchored to London, 47 minutes past its midnight',
   Math.abs(86400000 - msUntilClose(now) - 47*60000) < 60000, hrs(86400000-msUntilClose(now))+'h');

S = {tz:'America/Los_Angeles', dayStartHour:0};
ok('anchored at home, 7h13m still to run',
   Math.abs(msUntilClose(now) - (7*3600000 + 13*60000)) < 60000, hrs(msUntilClose(now))+'h');

console.log('\n  --- a 3am boundary ---');
S = {tz:'America/Los_Angeles', dayStartHour:3};
now = new Date('2026-10-17T04:00:00-07:00');
ok('an hour past a 3am close', Math.abs(86400000 - msUntilClose(now) - 3600000) < 60000,
   hrs(86400000-msUntilClose(now))+'h');
now = new Date('2026-10-17T02:00:00-07:00');
ok('an hour before it', Math.abs(msUntilClose(now) - 3600000) < 60000, hrs(msUntilClose(now))+'h');

console.log('\n  --- across a daylight-saving change ---');
// Britain leaves BST at 02:00 on 25 October 2026.
S = {tz:'Europe/London', dayStartHour:0};
now = new Date('2026-10-24T23:30:00+01:00');
ok('the night before the clocks change',
   Math.abs(msUntilClose(now) - 30*60000) < 60000, hrs(msUntilClose(now))+'h');
now = new Date('2026-10-25T12:00:00+00:00');
ok('the day itself still closes in 12 hours',
   Math.abs(msUntilClose(now) - 12*3600000) < 60000, hrs(msUntilClose(now))+'h');

console.log('\n  --- never out of range ---');
['Europe/London','America/Los_Angeles','Asia/Tokyo','Australia/Sydney','Asia/Kolkata'].forEach(tz => {
  S = {tz, dayStartHour:3};
  let bad = 0;
  for(let i = 0; i < 24*14; i++){
    const t = new Date(Date.parse('2026-10-01T00:00:00Z') + i*3600000);
    const v = msUntilClose(t);
    if(!(v > 0 && v <= 86400000 + 3600000)) bad++;
  }
  ok(tz + ': 336 hourly checks all inside one day', bad === 0, bad + ' bad');
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
