# Tests

These let you change `backend/Code.gs` or the website and check nothing broke **before** deploying to the real Google Sheet. That matters because the live system runs during real classes: a mistake there means lost attendance.

Nothing here touches Google. The tests run a fake Google Apps Script in Node, so they are safe to run any number of times.

## Running them

From the project folder (the one containing `backend/` and `tests/`):

```sh
sh tests/run_all.sh          # all three suites, 181 checks
node tests/mock_test.js      # backend logic only (fast, a few seconds)
node tests/register_test.js  # the copy into the KASE register
node tests/e2e.js            # the two web pages, in a real browser
```

Each prints one `PASS` or `FAIL` line per check and ends with `ALL PASSED` or `N FAILED`.

**Requirements:** Node.js for the first two. The browser suite also needs Playwright and Chromium; if Playwright is not installed globally, point at it:

```sh
PLAYWRIGHT=/path/to/node_modules/playwright node tests/e2e.js
```

`run_all.sh` skips the browser suite with a message if Playwright is missing, so the other two still run.

## What each suite covers

| Suite | Checks | What it proves |
|---|---|---|
| `mock_test.js` | 106 | Logins, lockout, forged and edited tokens, roles. Scan windows, including the exact edges (a scan 31 minutes after a class starts is refused; a 2:00–4:00 PM class counts 1:40–2:30 PM). Field-day FN and AN. Duplicates, unknown roll numbers, back-dated scans, formula-like input, malformed requests. Creating, editing, moving and cancelling classes. Newest-first columns, future classes appearing on their day. HOD sheets and HOD email changes. Per-class scan close times: a custom FN or AN close time, the defaults when the cells are empty, validation of the limits, changing an old day's close time so that day is recalculated, and the refusal when a shorter window would take a P away. |
| `register_test.js` | 39 | The copy into the KASE attendance register, run against a **snapshot of the real file** (its real tabs, headers, merged date cells and odd dates). Per-batch start dates, new columns placed first in each tab's own style, a hand-made column reused instead of duplicated, P/A written, the team's own entries never changed, late arrivals upgraded from A to P, no rows added, other tabs untouched. |
| `e2e.js` | 36 | The scanner and scheduler pages in a real browser at phone size: logging in, creating/editing/cancelling classes, the overlap error, a successful scan, the red failure for a wrong barcode, offline saving and later upload, typing a roll number, the torch and zoom controls, the close-time fields and their defaults, and that the security policy blocks nothing the pages need. |

## Files

| File | What it is |
|---|---|
| `mock_gas.js` | The fake Google Apps Script: Sheets, Drive, Mail, locks, properties. It implements only what `Code.gs` actually calls, so adding a new Google API call to `Code.gs` may mean adding it here too. |
| `mock_test.js`, `register_test.js`, `e2e.js` | The three suites. |
| `data/register.json` | A snapshot of the real KASE register (all tabs, headers and values). |
| `data/students.json` | The cleaned student list used to build the spreadsheet. |
| `run_all.sh` | Runs everything. |

**`data/` holds real student names and roll numbers, and `register_test.js` mentions real roll numbers. Keep this folder private — never upload it to a public GitHub repository.**

## Time

The suites fix their own clock instead of using the real one, so they give the same result whatever time of day or day of year you run them:

- `mock_test.js` builds its dates with `daysAgo(n)`, relative to today.
- `e2e.js` sets a virtual **10:00 AM today** in both the fake backend and the browser pages.

Keep this when adding checks. A hardcoded date like `'2026-10-14'` will pass today and fail in a week, because the backend refuses scans older than `CFG.MAX_SCAN_AGE_DAYS` (7 days). An hour taken from the real clock will pass in the morning and fail at night, because a class cannot be created that would run past midnight.

## When a check fails

1. **Read the failing line.** Each describes one behaviour, for example `scan 31 minutes after a 10:00 class starts is not counted`.
2. **Decide which is wrong, the code or the test.** If you deliberately changed a rule, the test is now out of date; update it and say so in the commit. If you did not, the code has a bug.
3. **A column position changed.** Several checks look at a specific column (`cell(2, 4)`). Adding a class on a date another check uses will shift its columns and make unrelated checks fail. Give a new check its own date.
4. **Only the register suite fails.** Its snapshot may no longer match the real register, for example after a tab was renamed. See below.

## Updating the register snapshot

`data/register.json` is a copy of the real register, taken on 14 October 2026. If the register's layout changes (new tabs, moved columns, renamed headers), the suite is testing the old shape. To refresh it, download the register as `.xlsx` and convert it:

```python
import openpyxl, json
wb = openpyxl.load_workbook('register.xlsx')
out = {}
for ws in wb:
    out[ws.title] = {
        'gid': 0,
        'maxRows': ws.max_row,
        'rows': [[(v.isoformat()[:10] and {'__date': v.isoformat()}) if hasattr(v, 'isoformat')
                  else ('' if v is None else v) for v in row]
                 for row in ws.iter_rows(values_only=True)],
    }
json.dump(out, open('tests/data/register.json', 'w'))
```

Then run `node tests/register_test.js` and fix whatever the new layout breaks. Expect some checks to need new column numbers.

## Adding a check

Add a line to the matching suite using the existing `ok(condition, 'what this proves')` helper:

```js
ok(tab('Gamma').cell(3, 4) === 'P', 'scanned student is marked present');
```

Write what the behaviour *should* be, not what the code currently does, then run it. A check that passes the first time without you fixing anything has often been written to match a bug.
