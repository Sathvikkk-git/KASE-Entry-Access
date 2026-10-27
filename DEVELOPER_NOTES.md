# KASE Entry Access – Developer Notes

How the code is built, for anyone (person or AI) changing it. `PROJECT_GUIDE.md` covers what the system does and how to operate it; this covers how it works inside.

Last updated: 27 October 2026

---

## 1. The shape of the system

Three pieces, one data store:

```
  Reception phone              KASE team
  site/scan.html + scan.js     site/admin.html + admin.js
          \                        /
           \  plain HTML, no build step, on GitHub Pages
            \                    /
             v                  v
        backend/Code.gs  (Google Apps Script, inside the master sheet)
                     |
          +----------+-----------+------------------+
          v                      v                  v
   master sheet          6 HOD sheets        KASE register
   "Entry Access"        (one per dept)      (the team's own file)
```

- The pages never touch a spreadsheet. They send JSON to one Apps Script web app and get JSON back.
- `Code.gs` is the only thing that reads or writes any sheet.
- There is no build step and no package manager. The website is files you edit and upload.

**Everything is India time (`Asia/Kolkata`).** Dates are `yyyy-MM-dd` strings and times are `HH:mm` strings; `toMs_(date, hhmm)` turns them into a timestamp by appending `+05:30`. Never use `new Date()` with local parsing, and never rely on the server's own timezone.

---

## 2. Where the data lives

### The master sheet

| Tab | Row 1 | Row 2 | Rows 3+ |
|---|---|---|---|
| `Gamma`, `Delta`, `Epsilon` | Roll Number, Name, Department, then a human label per class column | **hidden: the class ID of each column** | one student per row; `P` or blank |
| `Classes` | headers | — | every class ever made |
| `Scans` | headers | — | every scan ever received |
| `Users` (hidden sheet) | headers | — | two accounts, salted hashes |
| `Departments` | headers | — | one row per department |

**The hidden row 2 is the important part.** Column positions move constantly (newest class first), so nothing addresses a column by number. Row 2 holds a stable ID per column, and `findCols_(sheet, id)` looks it up:

- a normal class → the class ID, e.g. `C4F2A91B`
- a field day → **two** columns, `C4F2A91B#FN` and `C4F2A91B#AN`

If you ever delete or sort row 2, attendance columns become unidentifiable. Everything downstream breaks.

### Column order

Columns are **newest class first**, immediately after Department, and **only for days that have arrived**. Three functions do this:

| Function | Does |
|---|---|
| `wantedColumns_(batch, classes)` | What the columns *should* be right now: active classes with `date <= today`, newest first |
| `layoutBatch_(batch)` | Rewrites the tab to match, carrying each column's values with it by ID. Returns the IDs of newly added columns |
| `layoutOutdated_(batch)` / `syncLayouts_()` | Cheap check, then fix. Called at the start of every scan upload and every 10-minute refresh, so a new day's column appears on its own |

Because `layoutBatch_` moves values by ID rather than by position, inserting yesterday's class later does not disturb anything else.

---

## 3. A scan, end to end

1. **Phone** (`scan.js`): decodes the barcode, checks it matches `ROLL_RE`, and saves `{id, roll, ts}` to `localStorage`, where `ts` is the **phone's** clock. Uploads every 30 seconds.
2. **`submitScans_`** on the server, inside a script lock:
   - `syncLayouts_()` first, so today's columns exist.
   - For each scan: skip if the Scan ID is already in `Scans` (a retry after a dropped upload).
   - Validate: roll must match `ROLL_RE` → else `Invalid`; `ts` not in the future and not older than `MAX_SCAN_AGE_DAYS` → else `Bad time` / `Too old`.
   - Find the student's batch by looking the roll up in the three tabs → else `Unknown`.
   - `findClass_(classes, batch, ts)` → the active class of that batch whose window contains `ts`, nearest start wins → else `No class`.
   - `scanColumn_(c, ts)` → which column: the class ID, or `#FN` / `#AN`.
   - Write `P` if the cell is empty → `Marked`, else `Duplicate`.
   - Append a row to `Scans` with the result.
3. **Reply**: the Scan IDs that were saved. The phone deletes only those from its queue.

The phone's green tick means *"the barcode was read and stored"*, nothing more. Every attendance decision happens on the server.

### Scan windows

`scanWindows_(c)` returns one window per column, each `{col, from, to, at}`:

| Class type | Window(s) |
|---|---|
| `Class` | `start - EARLY_MIN` to `start + LATE_MIN` (20 min before to 30 min after) |
| `Field` | FN: `09:10 - 20min` to `FIELD_FN_LAST` (8:50–10:30). AN: `FIELD_AN_START - 20min` to `FIELD_AN_LAST` (1:40–2:30 PM) |

`at` is the nominal start, used only to pick the nearest class when two windows overlap. `windowAt_(c, ts)` returns the window containing `ts`, or null.

A class's **scan window** and its **span** are different things. `span_(c)` is the real 2-hour lesson, used only by `checkOverlap_` to stop double-booking a batch. Changing one does not change the other.

### recompute_

`recompute_(c)` rebuilds a class's columns from the whole `Scans` log. It runs whenever a class is created or edited, which is why scans taken *before* a class existed still count.

One asymmetry worth knowing: for a `Class` column and for `#FN`, the column is rebuilt from scans only, so a hand-typed `P` there can be wiped. For `#AN`, existing values are read first and kept, then scanned students are added. That was deliberate: the team types AN by hand.

---

## 4. The web API

One endpoint, `doPost`, dispatched by `route_` on `req.action`. Every action except `login` requires a token, and the role is checked server-side:

| Action | Role | Returns |
|---|---|---|
| `login` | — | token, role, expiry |
| `whoami` | any | username, role |
| `submitScans` | reception | the Scan IDs saved |
| `listClasses` | coordinator | every class |
| `createClass`, `updateClass`, `cancelClass` | coordinator | the class, and how many were marked |

Errors come back as `{ok: false, error, code}`. The pages act on `code === 'AUTH'` by logging the user out, so **keep that code** on any new auth failure.

### Tokens

`base64(username|role|expiry) + "." + HMAC-SHA256(payload + "|" + salt, secret)`. The secret lives in Script Properties, created by `setup()`. The user's password salt is mixed in, so changing a password invalidates every token for that account. `auth_` re-reads the user from the sheet each call, so editing a token's role fails the signature check.

Passwords: salted SHA-256, 300 rounds, compared with `sameText_` (constant time). 10 wrong attempts lock an account for 15 minutes, tracked in the script cache.

`safeText_` prefixes a leading `= + - @` with `'` before anything from the phone reaches a cell, so text cannot become a spreadsheet formula.

---

## 5. The register copy

The most intricate part, because it writes into a file **the team also edits by hand**. The governing rule: *their entries always win*.

`registerTick_` runs from the 10-minute timer and fires a copy once per slot per day (`REGISTER.RUNS`, currently 12:00 and 16:15), remembering which slots are done in Script Properties. `copyToRegisterNow()` is the menu item and ignores slots.

`registerBatch_(sheet, batch, classes, now)` per tab:

1. **Find the layout.** The fixed columns end at the last header among Name/Email/Roll Number/Department/Contact; date columns start after that. Row 2 having `Morning`/`Afternoon` rather than `FN`/`AN` sets `morningStyle` for that tab.
2. **Match students by roll number**, never by name. `registerRoll_` strips spaces, uppercases, and applies `REGISTER.ROLL_FIX` for known typos in the register.
3. **Place the day's columns** (`registerColumns_`): reuse a column whose date and row-2 label already match, else insert new ones in date order, writing the date in row 1 (merged across FN+AN) and the session in row 2.
4. **Write `P` / `A`**, but only into **empty** cells. The one exception: a cell the script itself wrote as `A` may later become `P` when the student turns out to have been scanned. Which cells those are is remembered in Script Properties under `rega_<day>_<key>`.

`registerDay_` parses the register's date headers, which are inconsistent: real date cells, `10/13/26 (Field Week-3)`, `10/13/2026`, and some nonsense like `15/29/2026`. Unparseable headers are simply skipped, which is why the odd ones are harmless.

`ADD_MISSING_STUDENTS` is `false`: students missing from the register are skipped there, not added.

---

## 6. Settings

Almost everything tunable is in two blocks at the top of `Code.gs`.

`CFG` — attendance rules:

| Key | Now | Meaning |
|---|---|---|
| `EARLY_MIN` / `LATE_MIN` | 20 / 30 | Scan window around a class start |
| `CLASS_MIN` | 120 | How long a class lasts (its span, not its scan window) |
| `FIELD_FROM` / `FIELD_TO` | 09:10 / 16:00 | College hours, used for a field day's span |
| `FIELD_FN_LAST` | 10:30 | FN scans close |
| `FIELD_AN_START` / `FIELD_AN_LAST` | 14:00 / 14:30 | AN scans open 20 min before this, and close |
| `MAX_SCAN_AGE_DAYS` | 7 | Older uploads refused |
| `TOKEN_HOURS` | 12 / 720 | Session length per role |
| `MAX_LOGIN_FAILS` | 10 | Then a 15-minute lockout |

`REGISTER` — the copy into the team's file: `ID`, `TABS`, `RUNS`, `START_DATE` (per batch), `CATCH_UP_DAYS`, `ADD_MISSING_STUDENTS`, `ROLL_FIX`.

`STUDENTS` is a 165-row array of `[roll, name, department]` built into the file. `setup()` loads it into the batch tabs and `addMissingStudents_` adds any that are missing, so re-running `setup()` is safe.

---

## 7. Making a change

```
1. Edit backend/Code.gs (or site/*)
2. sh tests/run_all.sh                 → all three suites say ALL PASSED
3. Paste Code.gs into Apps Script, Save
4. Deploy → Manage deployments → pencil → New version → Deploy
   (NOT "New deployment" — that makes a different URL and the pages stop working)
5. Website changes: commit, push, and bump VERSION in site/sw.js
   (otherwise phones keep serving their saved copy)
```

### Common changes

| Want to | Do |
|---|---|
| Change a scan window | Edit `CFG`. Add a test at the new edge. |
| Change register copy times | `REGISTER.RUNS`. The timer is every 10 minutes, so a run starts within 10 minutes of the time. |
| Add a column to the register | `registerSessions_` returns the sessions of a class; add one and give it a row-2 label. |
| Add an API action | A `case` in `route_` with the right role, plus a client call in `common.js`. |
| Add a student | A row in the batch tab is enough. Add to `STUDENTS` too, so a fresh `setup()` keeps them. |
| Next year's cohort | Replace `STUDENTS`, clear the batch tabs, re-run `setup()`. Consider the Excel import idea in the guide instead. |

---

## 8. Gotchas

- **Apps Script has no `const` scoping across files and no modules.** One file, plain functions. Private helpers end with `_`, which also hides them from the editor's Run menu.
- **Every sheet read or write costs 0.1–1 second.** Read a range once into an array, work in memory, write once. Never loop `getRange().setValue()` over students.
- **`withLock_` guards anything that writes.** Two phones syncing at the same moment would otherwise interleave.
- **A `Date` out of a cell is not a string.** `cellText_(v, pattern)` normalises both.
- **The scanner's `localStorage` belongs to one web address.** Moving from GitHub Pages to kase.co.in strands any unsynced scans on the old address. Sync first.
- **`e2e.js` and `mock_test.js` fix their own clock.** Keep it that way; see `tests/README.md`.
- **Student names live in `Code.gs`, `tests/data/` and the sheets.** Never in the public repository.

---

## 9. Where things are

| Path | What | Public? |
|---|---|---|
| `backend/Code.gs` | The whole backend, ~1,250 lines | **No** — contains student names |
| `site/` | The two pages and their assets | Yes, this is the GitHub repo |
| `tests/` | Three suites and the fake Apps Script | Code yes, `tests/data/` **no** |
| `data/` | The cleaned student list | **No** |
| `PROJECT_GUIDE.md` | How to operate the system | Yes |
| `DEVELOPER_NOTES.md` | This file | Yes |
| `START_HERE.md` | What to read first | Yes |

The live Google Sheet is the real system. These files are the source it was built from; the sheet does not update them, so a change made directly in Apps Script must be copied back here or it is lost.
