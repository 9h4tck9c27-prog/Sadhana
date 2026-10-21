// paint() and wire() are separate scopes that look alike. A handler that
// reaches for one of paint's locals throws on click and the button silently
// does nothing — which is exactly how the grace screen's "Yes" shipped.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

let pass = 0, fail = 0;
const ok = (l, c, d) => { if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

function body(name){
  const i = js.indexOf('function ' + name + '(');
  if(i < 0) throw new Error('no function ' + name);
  let depth = 0, started = false;
  for(let k = i; k < js.length; k++){
    if(js[k] === '{'){ depth++; started = true; }
    else if(js[k] === '}'){ depth--; if(started && depth === 0) return js.slice(i, k + 1); }
  }
  throw new Error('unbalanced ' + name);
}

// strip comments and string/template contents so identifiers inside copy
// are not mistaken for code
function code(src){
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, m =>
      m.replace(/[^$\{\}]/g, ' '))          // keep ${...}, blank the literal text
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

// top-level `const X =` / `let X =` declarations directly inside a function
function locals(src){
  const inner = code(src);
  const out = new Set();
  const re = /^\s{2}(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while((m = re.exec(inner))) out.add(m[1]);
  return out;
}

const paintLocals = locals(body('paint'));
const wireLocals  = locals(body('wire'));
const wireCode    = code(body('wire'));

console.log('\nSCOPE: wire() MUST NOT BORROW paint()\'s LOCALS\n');
console.log('  paint declares: ' + [...paintLocals].join(', '));
console.log('  wire declares : ' + [...wireLocals].join(', '));
console.log('');

const borrowed = [...paintLocals].filter(n =>
  !wireLocals.has(n) && new RegExp('(^|[^\\w$.])' + n + '(?![\\w$])').test(wireCode));

ok('wire borrows nothing from paint', borrowed.length === 0,
   borrowed.length ? 'borrows: ' + borrowed.join(', ') : '');

ok('wire declares the attempt it acts on', wireLocals.has('a'));
ok('wire declares the day number', wireLocals.has('day'));
ok('wire declares the marked count', wireLocals.has('marked'));

console.log('\n  --- and "Yes, I practised" actually records the day ---');

let S;
eval(js.slice(js.indexOf('function ymdIn'), js.indexOf('function repairState')));
eval(js.slice(js.indexOf('function fmtDate'), js.indexOf('function nowYMD')));
eval(js.slice(js.indexOf('function highestMarked'), js.indexOf('function tzOffsetMs')));

// the handler's body, lifted verbatim
const src = body('wire');
const yes = src.slice(src.indexOf("on('#yday-yes'"), src.indexOf("on('#yday-no'"));
const stmts = yes.slice(yes.indexOf('{', yes.indexOf('()=>')) + 1, yes.lastIndexOf('}', yes.lastIndexOf('})')));

S = {practice:'Pran Vayu Kryia', lengthDays:40, dayStartHour:0, tz:'America/Los_Angeles',
     attempts:[{startYMD:'2026-09-22', entries:[], broken:false, obstacle:null, askedYMD:null}]};
for(let d = 1; d <= 28; d++){
  S.attempts[0].entries.push({day:d,
    ymd:new Date(Date.parse('2026-09-22T12:00:00Z') + (d-1)*86400000).toISOString().slice(0,10),
    startedAt:1, minutes:29, before:'Steady', after:'Fulfilled'});
}
const now = new Date('2026-10-21T07:27:00-07:00');
const a = currentAttempt();
const marked = highestMarked(a);
let saved = false, rerendered = false, route = 'x';
const save = () => { saved = true; };
const render = () => { rerendered = true; };

let threw = null;
try { eval(stmts); } catch(e){ threw = e; }

ok('the handler runs without throwing', threw === null, threw && threw.message);
ok('day 29 is added', highestMarked(a) === 29, String(highestMarked(a)));
const added = a.entries.find(e => e.day === 29);
ok('  dated the day before today', added && added.ymd === '2026-10-20', added && added.ymd);
ok('  marked as logged late', !!(added && added.loggedLate));
ok('  with no invented feeling words', !!added && added.before === null && added.after === null);
ok('  and no invented duration', !!added && added.minutes === null);
ok('the question is not asked again today', a.askedYMD === '2026-10-21', String(a.askedYMD));
ok('the record is saved', saved === true);

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
