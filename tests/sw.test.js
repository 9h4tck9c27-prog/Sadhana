// Nothing in a deploy should need remembering. The service worker is the
// only file that ever did.
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'site', 'sw.js'), 'utf8');
// comments explain the code; they are not the code. Test the code.
const sw = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

let pass = 0, fail = 0;
const ok=(l,c,d)=>{ if(c){pass++;console.log('  ok    '+l);} else {fail++;console.log('  FAIL  '+l+(d!==undefined?'  '+d:''));} };

const cacheName = (sw.match(/const CACHE = '([^']+)'/) || [])[1];

console.log('\nNOTHING TO BUMP ON DEPLOY\n');
ok('the cache has a name', !!cacheName, String(cacheName));
ok('  carrying no version number', !/\d/.test(cacheName || 'x'), cacheName);
ok('  and no date', !/20\d\d/.test(cacheName || 'x'), cacheName);

console.log('\n  --- which is only safe because serving is network-first ---');
const fetchBlock = sw.slice(sw.indexOf("addEventListener('fetch'"));
ok('the network is tried first', /e\.respondWith\(\s*fetch\(req\)/.test(fetchBlock));
ok('the cache is only the fallback', /\.catch\(\(\) => caches\.match\(req\)/.test(fetchBlock));
ok('every successful fetch refreshes its entry', /c\.put\(req, copy\)/.test(fetchBlock));

console.log('\n  --- and the old versioned caches get swept up ---');
const activate = sw.slice(sw.indexOf("addEventListener('activate'"), sw.indexOf("addEventListener('fetch'"));
ok('anything not the current cache is deleted', /k !== CACHE/.test(activate) && /caches\.delete\(k\)/.test(activate));
ok('the worker claims open pages', /clients\.claim\(\)/.test(activate));

console.log('\n  --- one missing file cannot brick the worker ---');
const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
ok('precaching tolerates a failure', /allSettled/.test(install));
ok('  and does not use the all-or-nothing addAll', !/\.addAll\s*\(/.test(install));
ok('precached copies bypass the HTTP cache', /cache: 'reload'/.test(install));

console.log('\n  --- the exclusions that sign-in and testing depend on ---');
ok('cross-origin requests are untouched', /url\.origin !== self\.location\.origin/.test(fetchBlock));
ok('the auth handshake is untouched', /pathname\.startsWith\('\/__\/'\)/.test(fetchBlock));
ok('the audio test page is untouched', /audio-test\.html/.test(fetchBlock));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
