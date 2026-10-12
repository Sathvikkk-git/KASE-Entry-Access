# KASE Entry Access

Web pages for Anveshana attendance at KASE.

- `scan.html` – reception scanner (works offline after the first visit; add it to the phone's home screen)
- `admin.html` – class scheduler for the KASE team
- `config.js` – the Apps Script web app URL

The data lives in the "Entry Access" Google Sheet; its Apps Script (`Code.gs`) is the backend.

When you change any file here, also change `VERSION` in `sw.js` (e.g. `kase-v2`) so phones load the new copy.
