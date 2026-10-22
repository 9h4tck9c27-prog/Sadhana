// Finishing a container must archive it whole and leave the app ready for the
// next one, without touching anything already kept.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let S, NOW = new Date('2026-09-19T08:00:00-07:00');
const nowYMD = () => '2026-09-19';
const save = () => { S.updatedAt = Date.now(); };
let forgot = 0, deleted = [];
const audioForget = () => { forgot++; };
const audioDel = id => { deleted.push(id); return Promise.resolve(); };
let rendered = 0, route = null;
const render = () => { rendered++; };

eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function msUntilClose')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));
const DEFAULT_WORDS = eval(/const DEFAULT_WORDS = (\[[\s\S]*?\]);/.exec(js)[1]);
eval(js.slice(js.indexOf('const NUMWORDS'), js.indexOf('function hourText')));
eval(js.slice(js.indexOf('function archiveCurrent()'), js.indexOf('function wrapCanvas')));

function blank(){
  return {practice:'', lengthDays:40, dayStartHour:3, tz:'America/Los_Angeles',
          startDate:null, words: DEFAULT_WORDS.slice(), attempts:[], completed:[],
          onboarded:false, installShown:false, syncOffered:false, freshStart:false,
          draft:null, view:null, updatedAt:0};
}

function finished(practice, length, attempts){
  const st = Object.assign(blank(), {practice, lengthDays:length, onboarded:true,
                                     installShown:true, startDate:'2026-08-10'});
  st.attempts = [];
  for(let a = 0; a < attempts; a++){
    const last = a === attempts - 1;
    const entries = [];
    const n = last ? length : 5;
    for(let dd = 1; dd <= n; dd++){
      entries.push({day:dd, ymd:'2026-08-' + String(9+dd).padStart(2,'0'),
        startedAt: Date.parse('2026-08-' + String(9+(dd%20)).padStart(2,'0') + 'T06:00:00-07:00'),
        minutes:35, before:'Tender', after:'Steady', note:''});
    }
    st.attempts.push({startYMD: a === 0 ? '2026-08-09' : '2026-08-10',
                      entries, broken: !last, obstacle: last ? null : 'Circumstance'});
  }
  return st;
}

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if(cond){ pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail !== undefined ? '  ' + detail : '')); }
}

console.log('\nFINISHING A CONTAINER\n');

S = finished('Vyana Vayu Kryia', 40, 2);
S.audio = {id:'aud-one', name:'class.m4a', size:1000, added:1};
const daysBefore = S.attempts.reduce((n,a)=>n+a.entries.length, 0);
beginAnother();

ok('the finished practice is on the shelf', S.completed.length === 1);
ok('  with its name', S.completed[0].practice === 'Vyana Vayu Kryia');
ok('  its length', S.completed[0].lengthDays === 40);
ok('  both attempts', S.completed[0].attempts.length === 2, S.completed[0].attempts.length);
ok('  every entry', S.completed[0].attempts.reduce((n,a)=>n+a.entries.length,0) === daysBefore);
ok('  and its summary', S.completed[0].stats.after === 'Steady', JSON.stringify(S.completed[0].stats));
ok('  dated', S.completed[0].startYMD === '2026-08-09' && S.completed[0].endYMD === '2026-09-18',
   S.completed[0].startYMD + ' to ' + S.completed[0].endYMD);

ok('the recording is released', forgot > 0);
ok('  and deleted from the device', deleted.includes('aud-one'), deleted.join(','));

console.log('\n  --- and the app is ready for the next ---');
ok('the practice name is cleared', S.practice === '');
ok('no attempts carried over', S.attempts.length === 0);
ok('onboarding is not repeated', S.installShown === true);
ok('the vocabulary is kept', S.words.length === DEFAULT_WORDS.length);
ok('no recording is carried into the new practice', !S.audio);
ok('the day boundary is kept', S.dayStartHour === 3);
ok('the timezone is kept', S.tz === 'America/Los_Angeles');

console.log('\n  --- a second container ---');
S.practice = 'Samana Vayu Kriya'; S.lengthDays = 40; S.onboarded = true;
S.startDate = '2026-09-20';
S.attempts = [{startYMD:'2026-09-20', entries:[], broken:false, obstacle:null}];
for(let dd = 1; dd <= 40; dd++){
  S.attempts[0].entries.push({day:dd, ymd:'2026-09-' + String(19+dd).padStart(2,'0'),
    startedAt: Date.parse('2026-09-20T06:00:00-07:00'), minutes:31,
    before:'Scattered', after:'Fulfilled', note:''});
}
beginAnother();
ok('both are on the shelf', S.completed.length === 2);
ok('  the first is untouched', S.completed[0].practice === 'Vyana Vayu Kryia');
ok('  the second is added after it', S.completed[1].practice === 'Samana Vayu Kriya');
ok('  each keeps its own summary',
   S.completed[0].stats.after === 'Steady' && S.completed[1].stats.after === 'Fulfilled');
ok('  and the app is clear again', S.practice === '' && S.attempts.length === 0);

console.log('\n  --- nothing is lost ---');
const total = S.completed.reduce((n,c) =>
  n + c.attempts.reduce((m,a)=>m+a.entries.length, 0), 0);
ok('every day of both containers survives', total === daysBefore + 40, total);
ok('archiving does not mutate what is already kept',
   S.completed[0].attempts[1].entries.length === 40);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
