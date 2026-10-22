// The recording is the only large thing this app stores, and the only thing
// it plays. Both carry decisions that are easy to undo by accident.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const code = js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

let pass = 0, fail = 0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

console.log('\nTHE RECORDING STAYS ON THE DEVICE\n');
const acc = (html.match(/id="a-file" accept="([^"]+)"/) || [])[1] || '';
ok('it is picked with a file input', /type="file"/.test(html) && acc.includes('audio/*'));
ok('  with the extensions named, which iOS needs to keep files selectable',
   ['.mp3','.m4a','.wav','.aac'].every(x => acc.includes(x)), acc);
ok('nothing uploads it', !/fetch\([^)]*audio/i.test(code) && !/FormData/.test(code));
ok('it lives in a store of its own', /createObjectStore\('audio'\)/.test(code));
ok('  separate from the record', /createObjectStore\('state'\)/.test(code));
ok('  so eviction can take the file and not the days',
   /objectStoreNames\.contains\('audio'\)/.test(code) && /objectStoreNames\.contains\('state'\)/.test(code));
ok('the database version was raised for it', /indexedDB\.open\('sadhana', 2\)/.test(code));
ok('an older tab holding it open cannot hang the app', /onblocked/.test(code));

console.log('\n  --- a file that will not fit is refused in words ---');
const pick = code.slice(code.indexOf("on('#a-file','change'"), code.indexOf("on('#finish-draft'"));
ok('headroom is checked before writing', /storage\.estimate/.test(pick));
ok('  and the shortfall is given in megabytes', /mb\(free\)/.test(pick));
ok('persistence is requested before storing tens of megabytes', /storage\.persist/.test(pick));
ok('a quota failure is named as one', /QuotaExceededError/.test(pick));
ok('any other failure reports its real name', /err\.name/.test(pick));
ok('  rather than a shrug', !/could not be saved'\)\)/.test(pick));
ok('the diagnostic shows what room is left', /'limit: '/.test(code) && /'free:  '/.test(code));

console.log('\n  --- it plays through a silenced phone ---');
ok('playback uses an audio element', /new Audio\(\)/.test(code));
ok('  not the Web Audio API, which iOS silences with the ringer',
   !/AudioContext|webkitAudioContext|createBufferSource/.test(code));
ok('  and plays inline rather than taking over the screen', /playsInline\s*=\s*true/.test(code));

console.log('\n  --- iOS only allows play() from the tap itself ---');
const toggle = code.slice(code.indexOf('function audioToggle'), code.indexOf('function audioSkip'));
ok('play is called directly in the handler', /el\.play\(\)/.test(toggle));
ok('  with nothing awaited before it', !/await/.test(toggle));
ok('  and a refusal is surfaced, not swallowed', /AUDIO\.err\s*=/.test(toggle));

console.log('\n  --- skipping ---');
ok('the controls move fifteen seconds', /audioSkip\(-15\)/.test(code) && /audioSkip\(15\)/.test(code));
ok('the lock screen gets the same two', /seekbackward/.test(code) && /seekforward/.test(code));

let AUDIO = {ready:true, el:null};
// audioSkip repaints after moving; the paint is the browser's job, not this test's
function paintAudio(){}
function $(){ return null; }
eval(js.slice(js.indexOf('function audioSkip'), js.indexOf('function paintAudio')));
const at = t => { AUDIO.el = {currentTime:t, duration:300}; return AUDIO.el; };
at(100); audioSkip(15);  ok('forward adds fifteen', AUDIO.el.currentTime === 115);
at(100); audioSkip(-15); ok('back takes fifteen', AUDIO.el.currentTime === 85);
at(7);   audioSkip(-15); ok('it never goes below zero', AUDIO.el.currentTime === 0);
at(295); audioSkip(15);  ok('it never passes the end', AUDIO.el.currentTime === 300);
AUDIO.el = {currentTime:10, duration:NaN}; audioSkip(15);
ok('an unknown length does not produce NaN', Number.isFinite(AUDIO.el.currentTime), String(AUDIO.el.currentTime));
AUDIO.ready = false; at(100); audioSkip(15);
ok('skipping before it has loaded does nothing', AUDIO.el.currentTime === 100);

console.log('\n  --- nothing is left playing, and nothing is left behind ---');
ok('leaving the timer screen releases it', /view !== 'sitting' && AUDIO\.el\) audioForget/.test(code));
ok('the blob URL is revoked', /revokeObjectURL/.test(code));
ok('a finished practice deletes its recording', /audioDel\(S\.audio\.id\)/.test(code));
ok('replacing one deletes the one before it', /if\(old\) audioDel\(old\)/.test(code));
ok('the service worker does not try to precache it',
   !/audio/i.test(fs.readFileSync(path.join(__dirname, '..', 'site', 'sw.js'), 'utf8')
     .match(/const CORE = \[[\s\S]*?\]/)[0]));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
