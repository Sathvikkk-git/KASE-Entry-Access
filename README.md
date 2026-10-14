# KASE Entry Access

Barcode-based attendance for the **Anveshana** program at KASE.

The receptionist scans each student's college ID card with a phone. The system marks **P** in a Google Sheet for that student's class, and each HOD sees their own department's attendance in a separate view-only sheet. The day's attendance is also copied into the KASE team's attendance register.

**Full guide:** [PROJECT_GUIDE.md](PROJECT_GUIDE.md) covers how it works, setup, daily use, troubleshooting and future plans.

## What's in this repository

This repository holds only the **website**, the `website/` folder described in the guide. The backend script (`Code.gs`) and the student list contain student names, so they are kept privately and never uploaded here.

| Page | Who uses it |
|---|---|
| `scan.html` + `scan.js` | Receptionist. Scans student ID barcodes. It works offline after the first visit. Add it to the phone's home screen. |
| `admin.html` + `admin.js` | KASE team. Creates, edits and cancels classes. |
| `index.html` | Links to both pages. |
| `config.js` | The Apps Script web app URL that the pages talk to. |

Live (testing): https://sathvikkk-git.github.io/KASE-Entry-Access/

## Key rules

- A class lasts 2 hours. Scans count from 20 minutes before the start.
- Field days get two columns, FN then AN. Scans from 8:50 AM to 2:00 PM mark FN, and scans from 2:00 PM to 4:00 PM mark AN. Both can also be typed by hand.
- Unscanned students stay blank. The system records check-in only.
- Unknown roll numbers, or students whose batch has no class at that time, are logged but not marked.
- Class columns are **newest first**. Today's class sits right after Department, in the master sheet and the HOD sheets.
- Future classes are kept only in the Classes tab. Their column appears in the sheet on the day of the class.
- Every day after 11:30 AM and 4:15 PM, attendance is also copied into the KASE attendance register (P / A), in the register's own layout. The team's own edits there are never changed.

## Updating

- **Website:** edit the files and commit, and change `VERSION` in `sw.js` (for example `kase-v2` → `kase-v3`) so phones load the new version.
- **Backend:** after replacing the code in Apps Script, use **Deploy → Manage deployments → pencil icon → New version → Deploy**. This keeps the same web app URL.

## Hosting

Testing runs on GitHub Pages (branch `main`, folder `/`). The live version will move to kase.co.in. Copy these files there; nothing else changes.
