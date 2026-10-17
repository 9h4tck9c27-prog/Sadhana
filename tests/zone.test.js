// A sitting's displayed time must agree with its displayed date, before and
// after the anchor moves.
const fs=require('fs');
const html=fs.readFileSync('/home/claude/site/index.html','utf8');
const js=html.slice(html.lastIndexOf('<script>')+8, html.lastIndexOf('</script>'));
let S;
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function entryTime'), js.indexOf('function daysBetween')));

let pass=0, fail=0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

// A real sitting: Saturday 10 Oct, 5:33pm in Los Angeles.
const sat = Date.parse('2026-10-10T17:33:00-07:00');
S={tz:'America/Los_Angeles', attempts:[]};
const e={day:19, ymd:'2026-10-10', startedAt:sat};

console.log('\nTHE BUG IN THE SCREENSHOT\n');
const deviceLondon = new Date(sat).toLocaleTimeString('en-GB',
  {hour:'numeric',minute:'2-digit',timeZone:'Europe/London'});
console.log('  rendered in the device zone while in London: ' + deviceLondon);
ok('which disagrees with the SAT label', deviceLondon.startsWith('1:33'));

console.log('\nAFTER THE FIX\n');
S={tz:'America/Los_Angeles'};
const stamped = Object.assign({}, e, {tz:'America/Los_Angeles'});
ok('a stamped entry reads 5:33 pm wherever you are',
   entryTime(stamped).replace(/\s/g,'').toLowerCase().indexOf('5:33') === 0,
   entryTime(stamped));

S={tz:'Europe/London'};   // the anchor has moved
ok('and still reads 5:33 pm after the anchor moves to London',
   entryTime(stamped).replace(/\s/g,'').toLowerCase().indexOf('5:33') === 0,
   entryTime(stamped));

const londonSit = {day:22, ymd:'2026-10-13', startedAt:Date.parse('2026-10-13T06:30:00+01:00'),
                   tz:'Europe/London'};
ok('a new London sitting reads 6:30 am',
   entryTime(londonSit).replace(/\s/g,'').toLowerCase().indexOf('6:30') === 0,
   entryTime(londonSit));

console.log('\n  --- the stamp itself ---');
eval(js.slice(js.indexOf('function stampEntryZones'), js.indexOf('function daysBetween')));
S={tz:'America/Los_Angeles', completed:[],
   attempts:[{entries:[{day:1,startedAt:sat},{day:2,startedAt:sat+86400000}]}]};
ok('unstamped entries are stamped on load', stampEntryZones() === true);
ok('  with the anchor in force at that moment',
   S.attempts[0].entries.every(x => x.tz === 'America/Los_Angeles'));
ok('running it again changes nothing', stampEntryZones() === false);

S={tz:'Europe/London', completed:[], attempts:[{entries:[{day:1,startedAt:sat,tz:'America/Los_Angeles'}]}]};
stampEntryZones();
ok('an already-stamped entry is never overwritten',
   S.attempts[0].entries[0].tz === 'America/Los_Angeles');

S={tz:'Europe/London', completed:[], attempts:[{entries:[{day:1,startedAt:null}]}]};
ok('an entry with no start time is left alone', stampEntryZones() === false);

console.log('\n'+pass+' passed, '+fail+' failed\n');
process.exit(fail?1:0);
