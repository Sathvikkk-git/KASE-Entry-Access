# KASE Entry Access – website

The web pages for Anveshana attendance at KASE.

| Page | Who uses it |
|---|---|
| `scan.html` | Receptionist. Scans student ID barcodes. It works offline after the first visit. Add it to the phone's home screen. |
| `admin.html` | KASE team. Creates, edits and cancels classes. |
| `index.html` | Links to both pages. |

## How it works

The pages send requests to a Google Apps Script web app (the URL is in `config.js`). That script stores everything in a private Google Sheet and checks every login. These pages contain no student data.

## Updating

1. Edit the files and commit.
2. Change `VERSION` in `sw.js` (for example `kase-v1` → `kase-v2`) so phones load the new version instead of their saved copy.

## Hosting

Testing runs on GitHub Pages (Settings → Pages → Deploy from branch `main`, folder `/`). The live version will move to kase.co.in. Copy these files there; nothing else changes.
