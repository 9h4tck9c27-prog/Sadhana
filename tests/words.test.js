// The vocabulary must open on the expansive end, must not grow without bound,
// and must never discard a base word.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));

const DEFAULT_WORDS = eval(/const DEFAULT_WORDS = (\[[\s\S]*?\]);/.exec(js)[1]);
const RETIRED_WORDS = eval(/const RETIRED_WORDS = (\[[\s\S]*?\]);/.exec(js)[1]);
const MAX_CUSTOM_WORDS = Number(/const MAX_CUSTOM_WORDS = (\d+)/.exec(js)[1]);

let S;
eval(js.slice(js.indexOf('function wordUse()'), js.indexOf('function pastPractices()')));
eval(js.slice(js.indexOf('function wordUsed('), js.indexOf('function pruneWords()')));
eval(js.slice(js.indexOf('const NUMWORDS'), js.indexOf('function hourText')));

let pass = 0, fail = 0;
function ok(label, cond, detail){
  if(cond){ pass++; console.log('  ok    ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (detail!==undefined?'  '+detail:'')); }
}

console.log('\nVOCABULARY\n');

ok('opens on the expansive end', DEFAULT_WORDS[0] === 'Radiant');
ok('closes on the contracted end', DEFAULT_WORDS[DEFAULT_WORDS.length-1] === 'Heavy');
ok('fourteen words', DEFAULT_WORDS.length === 14, DEFAULT_WORDS.length);
ok('the settled end has room to spread',
   ['Radiant','Spacious','Warm','Quiet'].every(w => DEFAULT_WORDS.includes(w)));
ok('the two dead words are gone',
   !DEFAULT_WORDS.includes('Happy') && !DEFAULT_WORDS.includes('Anxious'));
ok('every word that saw use survives',
   ['Fulfilled','Light','Clear','Steady','Tender','Resistant','Scattered','Dull','Restless','Heavy']
     .every(w => DEFAULT_WORDS.includes(w)));

console.log('\n  --- the cap ---');

function mk(custom, uses){
  S = {words: DEFAULT_WORDS.concat(custom), attempts:[{entries:[]}]};
  Object.keys(uses || {}).forEach(w => {
    for(let i = 0; i < uses[w]; i++)
      S.attempts[0].entries.push({day:i+1, before:w, after:'Clear'});
  });
}

mk(['Porous','Raw','Wired']);
pruneWords();
ok('under the cap — nothing removed', S.words.length === DEFAULT_WORDS.length + 3, S.words.length);

mk(['A','B','C','D','E','F','G'], {A:9, B:8, C:7, D:6, E:5, F:4, G:0});
pruneWords();
const custom = S.words.filter(w => !DEFAULT_WORDS.includes(w));
ok('over the cap — trimmed to the limit', custom.length === MAX_CUSTOM_WORDS, custom.length);
ok('the unused word is the one dropped', !custom.includes('G'), custom.join(','));
ok('the most-used are kept', ['A','B','C','D','E'].every(w => custom.includes(w)));
ok('base words are never dropped', DEFAULT_WORDS.every(w => S.words.includes(w)));

mk(['A','B','C','D','E','F','G','H','I','J'], {});
pruneWords();
const c2 = S.words.filter(w => !DEFAULT_WORDS.includes(w));
ok('with no usage, the newest survive', c2.length === MAX_CUSTOM_WORDS && c2.includes('J'), c2.join(','));

mk([]);
pruneWords();
ok('no custom words — untouched', S.words.length === DEFAULT_WORDS.length);


console.log('\n  --- migrating an existing record ---');
eval(js.slice(js.indexOf('function migrateWordOrder()'), js.indexOf('function pruneWords()')));

const OLD = ['Happy','Fulfilled','Light','Clear','Steady','Tender',
             'Resistant','Scattered','Anxious','Dull','Restless','Heavy'];

S = {words: OLD.slice(), attempts: [{entries: []}]};
ok('an old record is migrated', migrateWordOrder() === true);
ok('  and now opens on Radiant', S.words[0] === 'Radiant', S.words[0]);
ok('  gaining the four new words',
   ['Radiant','Spacious','Warm','Quiet'].every(w => S.words.includes(w)));
ok('  and losing the two unused ones',
   !S.words.includes('Happy') && !S.words.includes('Anxious'));

S = {words: OLD.concat(['Porous','Raw']), attempts: [{entries: []}]};
migrateWordOrder();
ok('custom words survive', S.words.includes('Porous') && S.words.includes('Raw'));
ok('  and stay at the end',
   S.words.slice(-2).join(',') === 'Porous,Raw', S.words.slice(-2).join(','));

S = {words: OLD.slice(), attempts: [{entries: [{day:1, before:'Anxious', after:'Clear'}]}]};
migrateWordOrder();
ok('a retired word someone used is kept', S.words.includes('Anxious'));
ok('  while the unused one still goes', !S.words.includes('Happy'));

S = {words: DEFAULT_WORDS.slice(), attempts: [{entries: []}]};
ok('an already-migrated record is left alone', migrateWordOrder() === false);

S = {attempts: []};
ok('a record with no words does not throw', migrateWordOrder() === undefined);

console.log('\n  --- how a day reads ---');
ok('day one', numberWord(1) === 'One');
ok('day nineteen', numberWord(19) === 'Nineteen');
ok('day forty', numberWord(40) === 'Forty');
ok('beyond the table falls back to digits', numberWord(97) === '97');

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
