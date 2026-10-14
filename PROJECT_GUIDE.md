# KASE Entry Access – Project Guide

This guide explains the whole project in plain language: what it does, how it works, how to set it up from nothing, how to use it every day, how to fix common problems, and what we plan to add later.

Last updated: 14 October 2026 (daily copy into the Gamma, Delta and Epsilon batch tabs of the KASE register; 7 students added)

---

## 1. What this project is

During the **Anveshana** program, second-year students attend sessions at **KASE** instead of their regular classes. KASE needs to record who came, and each department's HOD needs to see that attendance so they can mark it in the department.

This project does that:

1. The **KASE team** schedules each class on a web page.
2. When a student arrives, the **receptionist** scans the barcode on their college ID card with a phone. The phone shows green (scan successful) or red (scan failed).
3. The system writes **P** next to the student's name for that class in a **Google Sheet**.
4. Each **HOD** has their own Google Sheet that shows only their department's students. It updates automatically.
5. Every day at **11:30 AM** and **4:15 PM**, the attendance is also copied into the **KASE attendance register**, the team's own Google Sheet, in its usual layout.

There are 165 students in three batches:

| Batch | Departments | Students |
|---|---|---|
| Gamma | CSE | 67 |
| Delta | CSM | 48 |
| Epsilon | CSD, ECE, MECH, CIVIL | 50 |

---

## 2. Who uses what

| Person | Uses | What they do |
|---|---|---|
| Receptionist | Scanner page on a phone (`scan.html`) | Scans ID cards as students walk in |
| KASE team | Class scheduler page (`admin.html`) | Creates, edits and cancels classes. One shared login. |
| HODs | Their department's Google Sheet (view only) | Look at attendance and mark it in the department |
| KASE team | The KASE attendance register (their existing Google Sheet) | Gets the day's P/A copied in automatically; can still correct it by hand |
| Project admin (you) | The master Google Sheet and its Apps Script | Passwords, HOD emails, fixes |

---

## 3. How a normal day works

1. **Before the class**, someone from the KASE team opens the class scheduler, picks the batch, type, date and start time, and clicks **Create class**. On the day of the class, a column for it appears in the batch's tab in the Google Sheet, right after Department.
2. **When students arrive**, the receptionist opens the scanner on the phone and taps **Start scanning**. Each student shows their ID card and the barcode is held inside the white box.
   - Green "Scan successful" with a beep means the scan is saved.
   - Red "Scan failed" with a buzz means it wasn't a student ID barcode. Try again, or tap **Type roll number**.
3. **The phone uploads scans** every 30 seconds, and straight away when the internet comes back. Without internet it keeps the scans and uploads them later.
4. **The system checks each scan**: is this roll number an Anveshana student, and does their batch have a class right now? If yes, it writes **P** in that class's column.
5. **Every 10 minutes**, each HOD's sheet is refreshed with the latest attendance.
6. **At 11:30 AM** the morning attendance (FN and classes that have started) is copied into the KASE register, and **at 4:15 PM** the afternoon (AN and later classes) plus any late morning arrivals.

The receptionist does not need to know whether the student "should" be there. They only scan. All decisions happen in the system.

---

## 4. The parts and where they live

```
  Reception phone              KASE team laptop/phone
  (scan.html)                  (admin.html)
        \                          /
         \   website on GitHub Pages (later kase.co.in)
          \                      /
           v                    v
        Google Apps Script backend  (Code.gs, inside the master sheet)
                     |
                     v
        Master Google Sheet "Entry Access"
                     |
                     v  copied every 10 minutes
        Six department sheets (CSE, CSM, CSD, ECE, MECH, CIVIL)  ──►  HODs
                     
        and, at 11:30 AM and 4:15 PM:
        KASE attendance register (the team's own sheet: Gamma batch, Delta batch, Epsilon batch tabs)
```

| Part | What it is | Where it lives |
|---|---|---|
| Website | Two web pages: scanner and class scheduler | GitHub Pages now, kase.co.in later. Files are in `website/`. |
| Backend | The "brain". Checks logins, decides which class a scan belongs to, writes to the sheet. | Inside the master Google Sheet: **Extensions → Apps Script**. Copy in `backend/Code.gs`. |
| Master sheet | All the data | Google Drive, owned by the account that ran setup |
| Department sheets | One read-only copy per department for its HOD | Google Drive, same folder as the master sheet |
| KASE attendance register | The team's existing attendance sheet; receives a daily copy | Google Drive (its own link). The account running the script must have **edit** access to it. |

**Why this design:** Google Sheets is free and everyone already knows it. Apps Script runs free on Google's servers, so there's no server to rent or maintain. The website is plain HTML with no build step, so anyone can edit it.

---

## 5. The master Google Sheet, tab by tab

| Tab | What's in it | Can I edit it by hand? |
|---|---|---|
| **Gamma, Delta, Epsilon** | One row per student (roll number, name, department). One column per class, **newest first**: the latest class is right after Department, older ones further right. Future classes don't appear until their day. **P** = present, blank = not scanned. | Yes, you can type P by hand (for example AN on field days). Don't delete or rearrange columns. Use the class scheduler for that. |
| **Classes** | Every class ever created, including future ones: ID, batch, type, date, start, end, status (Active/Cancelled) | No. Use the class scheduler. |
| **Scans** | Every scan ever received, with time, phone, and result | No. It's the permanent record. |
| **Departments** | Each department, its HOD's email, and the link to its sheet | Yes, change the **HOD Email** column. |
| **Users** (hidden) | Login accounts. Passwords are stored scrambled (hashed), never as plain text. | No. Use the **Entry Access** menu. |

**Hidden row 2** in each batch tab holds the class ID for each column. The system uses it to find the right column, so don't delete it.

### What the "Result" column in Scans means

| Result | Meaning |
|---|---|
| Marked | Student was marked present (P) |
| Duplicate | Student was already marked for this class. Nothing changed. |
| No class | Real student, but their batch had no class at that time |
| Unknown | Roll number isn't in the Anveshana list (for example a student from another program) |
| Bad time | The phone's clock was clearly wrong (more than 15 minutes in the future) |
| Too old | The scan was more than 7 days old when it reached the server. It is not counted (this stops back-dated uploads). |
| Invalid | What was sent isn't a roll number. Only possible if someone bypasses the scanner page. |

---

## 6. The attendance rules

| Rule | Detail |
|---|---|
| Class length | A **Class** is 2 hours from its start time |
| Early arrivals | Scans count from **20 minutes before** the start. For an 8:00 class, scans from 7:40 to 10:00 count. |
| Field days | Two columns for the day, **FN first, then AN**. Scans from **8:50 AM up to 2:00 PM** mark **FN**. Scans from **2:00 PM to 4:00 PM** mark **AN**. A student scanned in the morning and again in the afternoon gets P in both. Scans after 4:00 PM aren't counted. Both columns can also be typed by hand. |
| College hours | 9:10 AM – 4:00 PM (used for field days) |
| Back-to-back classes | If a scan falls inside two windows (e.g. 11:50 between a 10:00 and a 12:00 class), it goes to the class whose start time is nearest, here 12:00. |
| Same batch, same time | The scheduler refuses two classes for one batch that overlap |
| Absent | Left **blank**. Nothing is marked absent automatically. |
| Check-out | Not recorded. Check-in only. |
| Scanned twice | Counts once |
| Class scheduled late | If students were scanned **before** the class was created, they still get P when it's created. The system rechecks all saved scans whenever a class is created or edited. |
| Class edited | Attendance for that class is recalculated from the scans. For a Class and for **FN**, the column is rebuilt from scans only, so a hand-typed P there can be cleared. For **AN**, hand-typed entries are always kept and scanned students are added. (So if a field day is moved to another date, its old AN entries stay. Check them after moving.) |
| Class cancelled | Its column is removed. It stays in the Classes tab as "Cancelled". |
| Column order | Newest class first, in the master sheet and the HOD sheets. Today's class sits right after Department. Older classes shift right, and their P marks move with them. |
| Future classes | Saved only in the Classes tab (and shown in the scheduler). Their column appears on the day of the class, just after midnight (at the next 10-minute refresh or the first scan of the day), and then stays. |

All times are India time.

---

## 6a. Daily copy into the KASE attendance register

The KASE team keeps its own attendance register (a separate Google Sheet). The system copies attendance into it automatically, in the register's own style, so nobody has to retype it.

**When:** shortly after **11:30 AM** and after **4:15 PM** every day (the 10-minute timer starts each copy within 10 minutes of those times). It can also be run any time from **Entry Access menu → Copy attendance to the KASE register now**.

**Where:** only the tabs **Gamma batch**, **Delta batch** and **Epsilon batch**, found by name (capital letters and extra spaces don't matter, so "Gamma Batch" works too). "Epsilon batch Wise", "Main sheet" and any other tab are never touched. Each new column gets the **date in row 1** (for example "10/14/2026 (Field Week)" on a field day, or "10/14/2026" for a class) and the session in row 2 (FN/AN or Morning/Afternoon, matching the tab, or the class time such as "11:20 - 01:20"). Register students who aren't in the Anveshana list are left blank. **Don't rename these three tabs**; if one is renamed, the copy skips it and says so.

**How it looks:**

| | Field day | Class |
|---|---|---|
| Row 1 | `10/14/2026 (Field Week)`, merged over two columns | `10/14/2026` |
| Row 2 | **FN / AN** (Epsilon) or **Morning / Afternoon** (Gamma, Delta), matching what each tab already uses | the time, e.g. `11:20 - 01:20` |
| Position | Newest day first, right after the student details; older days move right. Within a day, earlier sessions are on the left. | same |

If the team has already made a column for that day by hand (same date, same FN/AN or time label), the system fills that column instead of adding a new one.

**What is written:** **P** if the student was scanned (or has P typed in our master sheet), **A** if not.

| Copy | What it fills |
|---|---|
| 11:30 AM | FN and any class that has started. Students not yet scanned get A. |
| 4:15 PM | AN and later classes. Students who arrived late in the morning are upgraded from A to P. |

**The team's own edits are safe.** A cell is only written if it is empty, or if it holds an **A that the system itself wrote** and the student was scanned later. If the team types anything (P, A, ML, a note), the system never changes it, even if it disagrees.

**Days covered:** today, plus a re-check of the last 3 days in case a copy was missed. Each batch has its own first day: **Gamma and Epsilon from 13 October 2026**, **Delta from 14 October 2026**. Nothing before those dates is ever written, because earlier days were kept by hand. When a day already has a column in the register (made by hand), it is reused and only its **empty** cells are filled. These dates are `REGISTER.START_DATE` at the top of Code.gs.

**Students:** students in our system but missing from the register are added as new rows at the bottom of the right tab (roll number, name, department). Seven students who were in the register but not in our system were added to our system on 14 October, so their scans now count. Known spelling mistakes in the register's roll numbers (a letter O typed instead of a zero, or an extra zero) are matched to the right student.

---

## 7. How the scanner works

- The barcode on the KGR ID card is a **Code 128** barcode that contains only the roll number in capitals (for example `25QM1A0000`).
- On Android phones, the scanner uses the phone's built-in barcode reader (fast and good with glare). On other phones it uses the free ZXing library.
- A code is accepted from a **single clean read** if it **looks like a roll number** (2 digits, QM, then 6 letters/digits). Code 128 barcodes carry their own check digit, so a damaged read is rejected rather than misread. (Until 12 Oct it needed two matching reads, which made scratched covers hard to scan.)
- **Torch** and **Zoom** controls appear under the camera on phones that support them. The zoom setting is remembered.
- The same card scanned again within 20 seconds is ignored, so holding the card in view doesn't create duplicates.
- **Offline:** each scan is saved on the phone first with the phone's time and a unique ID. When the internet is back, the phone uploads them. If an upload is repeated (network drop mid-upload), the server recognises the unique ID and doesn't count it twice. Scans must reach the server within **7 days**; older ones are refused.
- The top bar shows the phone's time, because that's the time the system uses. **Automatic date and time must be ON** on the reception phone.
- The screen stays awake while scanning.
- Logging out with scans still waiting asks for confirmation. Waiting scans stay on the phone and upload after the next login.

**Tips at the desk:** tilt the card slightly to avoid reflections from lights. For a **scratched cover**, turn on the **Torch**, zoom in a little and hold the card slightly further from the phone, so it is in sharp focus. If a card still fails, slide it out of the cover or use **Type roll number**.

---

## 8. Setting it up from nothing (how to run)

You only do this once. It's already done for the current test setup.

### Step 1 – Create the Google Sheet
1. Sign in to the Google account that should own the system. For the real launch use a **KASE account**, not a personal one, so it doesn't depend on one person.
2. Create a blank Google Sheet named **Entry Access**.
3. Keep sharing **Restricted**. Add only KASE team members who need edit access. The system doesn't need link sharing.

### Step 2 – Add the backend
1. In the sheet: **Extensions → Apps Script**.
2. Delete the sample code, paste everything from `backend/Code.gs`, click **Save**.
3. In the function dropdown pick **setup**, click **Run**, and allow the permissions. You'll see "Google hasn't verified this app": click **Advanced → Go to Entry Access (unsafe) → Allow**. It's your own script.
4. Open the **Execution log** and **copy the two passwords** (coordinator and reception). They're shown only once.
5. Optional: run **selfTest**. The log should say one real student "Marked" and a test roll number that is not in the list "Unknown".

What setup does: creates all the tabs, loads the 165 students (and adds any missing ones to existing tabs), creates the six department sheets, emails each HOD their link, creates the two logins, and sets up the 10-minute refresh. Running it again is safe. It won't duplicate anything.

### Step 2b – Give the script access to the KASE register
The account that ran setup must be able to **edit** the KASE attendance register. If the register belongs to someone else, they share it with that account as **Editor**. The register's ID and tab names are at the top of Code.gs, under `REGISTER`.

### Step 3 – Publish the backend
1. **Deploy → New deployment**, gear icon → **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**. Click **Deploy**.
3. Copy the **Web app URL**.

"Anyone" only means the web pages can reach the backend. Every request still needs a valid login, and the sheet stays private.

### Step 4 – Point the website at the backend
Open `website/config.js` and paste the Web app URL as `API_URL`.

### Step 5 – Put the website online (GitHub Pages)
1. Create a **public** GitHub repository, e.g. `kase-entry-access`.
2. Upload all files from the `website/` folder (not the folder itself).
3. **Settings → Pages →** Source: **Deploy from a branch**, branch **main**, folder **/ (root)**, **Save**.
4. After about a minute the site is at `https://<username>.github.io/kase-entry-access/`.

**Never upload `backend/Code.gs` or the `data/` folder to a public repository.** They contain student names.

### Step 6 – Set up the reception phone
1. In Chrome, open `…/scan.html` and log in with the **reception** account.
2. Tap **Start scanning** and allow the camera.
3. **⋮ menu → Add to Home screen.** From now on it opens like an app, even without internet.
4. Check **Settings → Date & time → Automatic** is on.

---

## 9. Everyday how-to

| I want to… | Do this |
|---|---|
| Schedule a class | Class scheduler → choose batch, type, date, start time → **Create class** |
| Change a class's time/date/batch | Class scheduler → **Edit** on the class → change → **Save changes**. Attendance is recalculated automatically. |
| Cancel a class | Class scheduler → **Cancel** → **Yes, cancel class** |
| See past or cancelled classes | Tick **Past and cancelled** in the class list |
| AN attendance on a field day | Scan students between 2:00 PM and 4:00 PM, or type **P** in the "Field AN" column of the batch tab in the master sheet. Both work together. |
| Change a password | In the master sheet: **Entry Access menu → Set coordinator / reception password**. Everyone using that account must log in again. Do this whenever someone leaves the KASE team. |
| Change an HOD | In the **Departments** tab, change the email in **HOD Email**. The system removes the old person's access, gives the new person access, and emails them the link. The link itself never changes. |
| Update HOD sheets right now | **Entry Access menu → Refresh HOD sheets now** (otherwise every 10 minutes) |
| Add a new student | Add a row at the bottom of the right batch tab: roll number (capitals), name, department. Order doesn't matter. The next register copy adds them to the register too. |
| Copy to the KASE register right now | **Entry Access menu → Copy attendance to the KASE register now**. Safe to run any number of times. |
| A register tab was renamed | Rename it back, or update `REGISTER.TABS` at the top of Code.gs with the new name, then deploy a new version. |
| Fix a wrong roll number | Edit it in the batch tab. Future scans will match. |
| Mark someone present by hand | Type **P** in their cell. (Note: editing that class later recalculates its scan column from the Scans log, so a hand-typed P in a *scan* column can be cleared. AN columns are safe.) |

---

## 10. Changing the code later

### Changing the backend (Code.gs)
1. Edit the code in **Extensions → Apps Script** and **Save**.
2. **Deploy → Manage deployments →** pencil icon → Version: **New version → Deploy**.

This keeps the **same URL**, so nothing else needs changing. Don't use "New deployment", which creates a different URL.

Settings like the 20-minute early window, class length, field-day times and the test HOD email are at the top of Code.gs in `CFG`.

### Changing the website
1. Edit the files in `website/` and upload them to GitHub again.
2. In `sw.js`, change `VERSION` (e.g. `kase-v1` → `kase-v2`). This tells phones to fetch the new version instead of using their saved copy.

---

## 11. Moving to kase.co.in

When testing is finished:
1. Copy the files from `website/` onto the kase.co.in hosting (for example a folder `/attendance/`). The site already uses https, which the camera needs.
2. **Before switching, make sure the reception phone shows "All synced".** Each web address keeps its own saved scans, so unsynced scans on the old address wouldn't move over.
3. On the reception phone, open the new address, log in once, and add it to the home screen again.

The backend and Google Sheets don't change.

Before the real launch, also:
- Replace the test HOD email with the real HOD emails in the **Departments** tab.
- Consider moving ownership to a KASE Google account (re-run setup there, or transfer the file ownership).
- Set new passwords for both accounts.

---

## 12. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Scan successful, but no P in the sheet | Check the **Scans** tab, Result column. "No class": the class wasn't created, the time/batch is wrong, or (on a field day) the scan was after 4:00 PM. Fix the class, and attendance recalculates automatically. "Unknown": roll number not in the list. "Too old": the phone held the scan for more than 7 days before uploading. |
| Phone says "X waiting to sync" for a long time | No internet, or the login expired. Tap **Sync now**. If it asks to log in, log in. Scans are kept. |
| Barcode won't scan | Tilt to avoid glare. For scratched covers, use the Torch and Zoom controls and hold the card a bit further away. Otherwise take the card out of the cover, or use **Type roll number**. |
| "Camera permission was denied" | Chrome → site settings → Camera → Allow, then tap Start scanning again. |
| Camera won't start offline | The scanner needs internet the very first time it's opened on a phone. After that it works offline. |
| "Unexpected reply from the server" | The Apps Script deployment's access isn't set to **Anyone**, or the URL in config.js is wrong. |
| "Too many wrong attempts" | 10 wrong passwords lock that account for 15 minutes |
| HOD didn't get the email | Check the email in Departments. Personal Gmail may block or spam it. The link is also in the **Sheet Link** column. You can send it yourself. |
| HOD sheet is out of date | Wait up to 10 minutes, or **Entry Access → Refresh HOD sheets now** |
| Times look wrong | Check the reception phone's automatic date and time |
| Website changes don't show on the phone | Bump `VERSION` in sw.js, upload again, and reopen the app twice |
| KASE register not updated | Run **Entry Access → Copy attendance to the KASE register now** from the master sheet. A message says what was written for each batch. "Register tab not found" = a tab was renamed (see Everyday how-to). An access error = the script's account lost edit access to the register. |
| Can't share the HOD sheet with a Gmail address | The college Google Workspace may block sharing outside the college. Ask the Workspace admin. |

---

## 13. Security and privacy

- Passwords are stored as salted SHA-256 hashes (300 rounds), never as plain text. 10 wrong passwords lock that account for 15 minutes.
- Logins are signed tokens. A token that has been changed in any way (for example a reception token edited to say "coordinator") is rejected. They expire after 12 hours (coordinator) and 30 days (reception). Changing a password logs out everyone using it.
- The reception account can only send scans. It cannot create or change classes. Every action is checked on the server, not just on the web page.
- Everything the phone sends is checked: roll numbers must match the roll-number pattern, times can't be in the future or more than 7 days old, and text that could act as a spreadsheet formula (starting with = + - @) is stored as plain text.
- The web pages use a strict Content Security Policy: they can only load their own files and the ZXing barcode library, and only talk to the Apps Script backend. This blocks injected scripts.
- The pages never display text from the server as HTML, so a crafted message can't run code in the browser.
- HODs can only **view** their own department's sheet. They have no access to the master sheet. (A filter view would not be enough, because anyone with view access can turn it off.)
- The website contains no student data. Student names live only in the Google Sheet and in Code.gs.
- Keep the master sheet's sharing **Restricted**.

---

## 14. Decisions we made, and why

| Decision | Why |
|---|---|
| Google Sheets as the database | Free, familiar, easy to share with HODs, enough for 165 students |
| Apps Script as the backend | Free, runs on Google, no server to maintain |
| Website hosted separately (not inside Apps Script) | Apps Script pages can't reliably use the camera and can't work offline |
| GitHub Pages for testing, kase.co.in later | Free https hosting while we test |
| Separate sheet per HOD | Filter views don't actually hide data from viewers |
| Raw Scans log kept forever | Nothing is lost. Attendance can always be rebuilt or audited. |
| Phone's time used, not upload time | So offline scans get the time the student actually arrived |
| Single read accepted (changed from two) | Scratched covers rarely give two clean reads in a row. Code 128's check digit and the roll-number pattern already block misreads. |
| Blank instead of "A" | HODs asked only for presence for now |
| One shared coordinator login | Requested by the KASE team. Change the password when people leave. |
| Register copy only fills empty cells and its own A's | The register is the team's official record; their corrections must always win. |
| A for absent in the register, blank in our sheet | The register already used A; our sheet only records presence. |

---

## 15. Future integrations and ideas

Things we discussed or that would be natural next steps:

Already done (12 Oct 2026): newest class first; future classes hidden until their day; single-read scanning with torch and zoom for scratched covers; **AN attendance by scan on field days** (2:00 PM – 4:00 PM); security review. 14 Oct 2026: daily copy into the KASE attendance register.

1. **Late marking.** Mark "L" instead of P after a cut-off (e.g. 15 minutes after start).
2. **Automatic absent.** Fill blanks with "A" after a class ends.
3. **Check-out scans.** Record when students leave, to check they stayed for the session.
4. **Live result at reception.** Show the student's name and "Marked present" / "No class now" on the phone when online.
5. **Phone clock check.** The server tells the phone if its clock is wrong.
6. **Attendance summary.** Percentages per student and department, and a dashboard for the KASE team.
7. **Individual coordinator accounts** instead of one shared login, so changes show who made them.
8. **Student notifications.** Email or WhatsApp to students with low attendance.
9. **Several reception phones/gates.** Already supported. Add a "gate name" setting per phone for reports.
10. **Block HOD downloads.** Stop viewers from downloading/printing the HOD sheets (needs the Drive advanced service).
11. **Next year's batch.** Import a new student list from Excel through a menu option instead of editing Code.gs.
12. **Move to a KASE Google Workspace account** and the kase.co.in domain (section 11).

---

## 16. How it was tested

- The backend logic was tested against a simulated Google Sheet with **78 automatic checks**: logins, wrong passwords and lockout, forged and edited tokens, early arrivals, duplicates, unknown roll numbers, back-to-back classes, field-day FN and AN scanning (including the 2:00 PM and 4:00 PM edges), hand-typed AN entries being kept, editing/moving/cancelling classes, HOD email changes, newest-first ordering, future classes appearing on their day, formula-like input, back-dated scans and malformed requests.
- The register copy was tested against a copy of the real KASE register file (all its tabs, headers and merged dates) with **37 checks**: per-batch start dates (Gamma and Epsilon from 13 Oct, Delta from 14 Oct), a hand-made 13 Oct column reused without changing the team's entries, only the Gamma, Delta and Epsilon batch tabs written (found by name, any capitals), the date written in row 1 and new days placed first in each tab's own style, no duplicate columns for a day, P/A written, register students outside the Anveshana list left blank, older attendance and other tabs untouched, missing students added, roll-number typos matched, team corrections (including ML) kept, late arrivals upgraded at 4:15 PM, no extra runs, the next day placed in front, and nothing written before 14 Oct.
- Both web pages were tested in a real browser on a phone-sized screen with **28 checks**: logging in, creating/editing/cancelling classes, the overlap error, scanning, the red failure for a wrong barcode, offline saving and later upload, typing a roll number, the torch and zoom controls, and that the security policy blocks nothing the pages need.
- The barcode on a real KGR ID card was decoded from a photo, both with and without the plastic cover.

The first live test on the reception phone and the real Google Sheet is still the final check.

---

## 17. Files in this folder

| File | What it is |
|---|---|
| `README.md` | Short overview |
| `PROJECT_GUIDE.md` | This guide |
| `website/` | The two web pages and their files. Upload these to GitHub Pages. |
| `website/config.js` | The backend's web app URL |
| `website/scan.html`, `scan.js` | Reception scanner (page and its logic) |
| `website/admin.html`, `admin.js` | Class scheduler (page and its logic) |
| `website/common.js`, `style.css` | Shared helpers and styling |
| `website/sw.js` | Makes the scanner work offline |
| `backend/Code.gs` | The Apps Script backend (contains student names, keep private) |
| `data/Anveshana_2026_students_by_batch.xlsx` | Cleaned student list (165 students) |

Architecture document: https://claude.ai/code/artifact/d8b5e20d-94e2-4f30-9625-1b7ce21df1b7
