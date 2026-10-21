// A break must never strand someone away from their own record.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

const brk = html.slice(html.indexOf("view === 'break'"), html.indexOf("/* ---- SHELF ----"));

console.log('\nTHE BREAK SCREEN IS NOT A DEAD END\n');
ok('the thread is reachable from it', brk.includes('id="see-thread"'));
ok('the record can be exported from it', brk.includes('id="export"'));
ok('the diagnostic is reachable from it', brk.includes('id="diag"'));
ok('it names the last day it actually holds', brk.includes('The last day this app holds is'));
ok('  with the date it was recorded', brk.includes('last.ymd'));
ok('  and the time, in its own anchor', brk.includes('entryTime(last)'));

console.log('\n  --- and it still ends the thread honestly ---');
ok('the rule is still stated', brk.includes('The count returns to day one'));
ok('beginning again is still the primary action', brk.includes('id="again-today"'));
ok('nothing on it rescues a day', !brk.includes('id="yday-yes"') && !brk.includes('mark it now'));

console.log('\n  --- the thread has a way back ---');
const thr = html.slice(html.indexOf("id=\"reset-all\""), html.indexOf("id=\"reset-all\"") + 400);
ok('a back button when arrived at deliberately', thr.includes('id="thread-back"'));
ok('  only then', thr.includes("route === 'thread' ?"));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
