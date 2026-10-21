# Sadhana Tracker

A strict container for a daily meditation practice. One screen a day, two taps,
and a count that returns to one if a day is missed.

Live at **https://sadhana-tracker-app.netlify.app**

Grounded in Yoga Sutra I.14 — *sa tu dirgha-kala nairantarya satkara asevito
dridha-bhumih*: practice becomes firm ground when it is tended a long while,
without a gap, and with care. **Nairantarya** — without a gap — is the condition
the app actually enforces.

## The rules it keeps

- Miss a day and the count returns to day one. This never softens.
- The record is never erased. A broken attempt turns to ash, not to nothing.
- No accounts, no notifications, no streaks, no confetti.
- Local-first: it opens instantly at 4am with no signal.
- A day runs boundary-to-boundary in a timezone fixed at setup, not on the
  device, so crossing timezones can neither skip a day nor double one.
- The same feeling-words appear before and after a sitting, so the record shows
  a *shift* rather than two unrelated scores.

Strict about practice, forgiving about paperwork: if you practised and forgot to
open the app, you can say so at any point the following day and the thread
holds. One unrecorded day, asked about once, answered honestly. Never two.

## Layout

```
site/          the deployable — Netlify's base directory
  index.html   the entire app: markup, styles and logic in one file
  sw.js        service worker; network-first, nothing to bump
  firebase-config.js   cloud sync, switched off (set to null)
tests/         fourteen suites, no dependencies
run-tests.sh   runs all of them
```

The app is one file on purpose. It has no build step, no framework and no
dependencies, so it cannot rot and can be read end to end.

## Running the tests

```sh
./run-tests.sh          # all fourteen suites
node tests/rescue.test.js   # one of them
```

They read `site/index.html` directly and evaluate the real functions out of it,
so they stay honest as the app changes rather than testing a copy.

| suite | what it protects |
|---|---|
| `boundary` | the day boundary, across timezones and daylight saving |
| `tz` / `rescue` | moving the anchor without breaking the thread |
| `zone` | entry times staying true after the anchor moves |
| `grace` | forgiving one unrecorded day, never two |
| `draft` | a sitting started and never finished |
| `handlers` | paint() and wire() scopes; that buttons actually fire |
| `deadend` | a break never strands you away from your record |
| `reconcile` | localStorage and IndexedDB reconciling on boot |
| `import` | export → import round trip, and files it must refuse |
| `words` | the vocabulary and its migrations |
| `shelf` | archiving a finished container without losing a day |
| `sw` | that a deploy needs nothing remembered |
| `e2e` | the whole journey, install to day forty |

## Deploying

Push to `main`. Netlify is configured with **base directory `site`** and no
build command; `site/netlify.toml` does the rest. Nothing needs editing,
renaming or bumping first — that was true once of the service worker's cache
name and is deliberately no longer true of anything.

Netlify looks for `netlify.toml` in the base directory and the repository
root, which is why the base directory must be set: the file lives in `site/`,
alongside the thing it configures. Without it you silently lose the auth
proxy, the redirects and the `sw.js` cache header.

The service worker serves network-first, so a change reaches an open app on
its next load. The cache is the offline copy, not the serving copy.

Records live in `localStorage` and IndexedDB keyed to the domain, so deploying
never touches them. Clearing website data does.

## Things worth knowing before changing it

**State is stored per record.** `S.words`, `S.lengthDays`, `S.tz` and the rest
are copied into a person's record when they set up. Changing a default reaches
nobody already practising — it needs a migration (see `migrateWordOrder`,
`stampEntryZones`).

**Two stores, reconciled on every boot.** `localStorage` is the working copy;
IndexedDB is the more durable second one. `mergeState` takes the union and never
drops an entry, so reconciling can only ever restore.

**The anchor timezone is not the device timezone.** Every date question —
`logicalYMD`, `msUntilClose`, an entry's displayed time — resolves against
`S.tz`. Parsing a date string without an offset silently uses the device clock
instead, which is correct only until someone travels.

**A break is the heaviest thing the app says.** Before saying it, the router
checks the benign explanations in order: an anchor left behind in another
country, then a sitting that was started and never finished, then a day that
simply went unlogged. Only then does it break. And the break screen always
keeps the record reachable — reading it is never the thing you cannot do.

**`paint()` draws and `wire()` binds, and they are different scopes** that
declare near-identical locals. A handler reaching for one of `paint`'s locals
throws on click and the button silently does nothing. `tests/handlers` lints
for exactly that, because it already shipped once.

**The app never invents what it did not measure.** A sitting finished from a
stale draft has no duration, because the timer was never stopped. A day logged
the next day says so in the thread and in the export. Counting the day and
being honest about what is known are not in tension.
