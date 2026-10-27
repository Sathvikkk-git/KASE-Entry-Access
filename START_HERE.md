# Start here

This is the KASE Entry Access project: barcode attendance for the Anveshana program. The system is **live and in daily use**, so changes to it affect real attendance records.

## If you are starting a new chat about this project

Attach these files, in this order:

| Attach | Why |
|---|---|
| `START_HERE.md` | This file |
| `PROJECT_GUIDE.md` | What the system does, how it is operated, the rules it follows |
| `DEVELOPER_NOTES.md` | How the code is built: data model, the column-ID scheme, settings, gotchas |
| `backend/Code.gs` | The entire backend |
| `tests/README.md` | How to check a change before deploying |

For a website change, add the files from `site/` as well. For a question about the data, add `data/Anveshana_2026_students_by_batch.xlsx`.

A useful opening message: *"Here is my KASE attendance project. Read START_HERE.md first. I want to change X."*

## The one rule

**Run the tests before deploying anything.**

```sh
sh tests/run_all.sh
```

Three suites, 152 checks, none of which touch Google. They catch the mistakes that would otherwise show up as missing attendance during a real class. If a suite will not run in your environment, say so rather than skipping it quietly.

## What is where

```
KASE Entry Access/
├── START_HERE.md           this file
├── PROJECT_GUIDE.md        how the system works and is operated
├── DEVELOPER_NOTES.md      how the code works
├── README.md               short overview
├── backend/Code.gs         the backend (Google Apps Script)   PRIVATE
├── site/                   the two web pages (public on GitHub)
├── tests/                  test suites; tests/data/ is PRIVATE
└── data/                   the cleaned student list            PRIVATE
```

**Private** means it contains real student names or roll numbers. Those never go to the public GitHub repository, which holds only `site/` and the documentation.

## Deploying

| Changed | Steps |
|---|---|
| `backend/Code.gs` | Paste into **Extensions → Apps Script**, Save, then **Deploy → Manage deployments → pencil → New version → Deploy**. Never "New deployment" — it creates a different URL and the pages stop working. |
| `site/` | Commit and push, and bump `VERSION` in `site/sw.js`, or phones keep their saved copy. |

## Current state (27 October 2026)

- Live and running: scanning, the class scheduler, 6 HOD sheets, and a twice-daily copy into the KASE team's own attendance register.
- 165 students in three batches: Gamma (CSE), Delta (CSM), Epsilon (CSD, ECE, MECH, CIVIL).
- Website hosted on GitHub Pages for testing; the move to kase.co.in is still to do (section 11 of the guide).
- Still open before a full launch: real HOD emails in place of the test address, new passwords, and ideally moving the sheet to a KASE Google account rather than a personal one.

Section 15 of `PROJECT_GUIDE.md` lists the ideas that were discussed but not built, such as late marking, automatic absent, check-out scans and an attendance dashboard.
