# Society Entry Authorization v2

A mobile-friendly GitHub Pages application for society event entry.

## Features

- QR code scanning using the phone camera
- Manual Wing + Flat fallback
- Reads private Google Sheet through Google Apps Script
- One Google Sheet tab per wing
- Uses:
  - Column B = Flat No.
  - Column D = Amount Paid
  - Column G = Member Count
- Checks minimum payment
- Records every successful entry
- Prevents entry after the allowed member count is exhausted
- Uses Apps Script LockService to reduce duplicate authorization when two guards scan the same flat simultaneously
- Creates an `Entry Log` sheet automatically

## Example

Google Sheet:

| B: Flat No. | D: Amount | G: Count |
|---|---:|---:|
| 101 | 1800 | 4 |
| 102 | 1800 | 2 |

If Flat 101 is scanned four times:

1. Entry 1 → Authorized → Remaining 3
2. Entry 2 → Authorized → Remaining 2
3. Entry 3 → Authorized → Remaining 1
4. Entry 4 → Authorized → Remaining 0
5. Entry 5 → Rejected → Maximum count reached

## QR format

The scanner accepts any of these:

### Recommended
`A Wing|101`

### Also accepted
`A Wing,101`

`A Wing-101`

Or JSON:

`{"wing":"A Wing","flat":"101"}`

The QR code does not need to contain payment information. The application reads the payment/member count from the Google Sheet.

## Setup

### 1. Google Sheet

Keep your existing sheets:

- A Wing
- B Wing
- C Wing
- D Wing
- E Wing
- F Wing
- G Wing
- H Wing
- I Wing
- J Wing

Column B = Flat No.
Column D = Amount
Column G = Count

Do not rename the sheets unless you also change the application.

### 2. Google Apps Script

Open Google Sheet → Extensions → Apps Script.

Copy `apps-script/Code.gs` into the Apps Script project.

Change:

`PASTE_YOUR_GOOGLE_SHEET_ID_HERE`

Example Sheet URL:

`https://docs.google.com/spreadsheets/d/ABC123/edit`

The ID is:

`ABC123`

Also check:

`const MINIMUM_AMOUNT = 1800;`

If your required contribution is different, change 1800.

### 3. Deploy Apps Script

Apps Script → Deploy → New deployment → Web app

Use:

- Execute as: Me
- Who has access: Anyone

Deploy and copy the Web App URL.

### 4. Configure frontend

Open `app.js` and replace:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with your Apps Script Web App URL.

### 5. GitHub Pages

Create a GitHub repository and upload:

- index.html
- styles.css
- app.js
- README.md
- apps-script/Code.gs

Then:

Repository → Settings → Pages

Select:

- Deploy from a branch
- Branch: main
- Folder: / (root)

Your site will be available at a GitHub Pages URL.

## QR generation

Create one QR per flat containing:

`A Wing|101`

`A Wing|102`

etc.

You can create these QR codes in bulk later from your Google Sheet.

## Important

The first scan of a flat records an entry. Therefore, use this application for the actual gate entry check.

If the same person scans the same QR again, it counts as another entry. If you want a "family token" workflow instead (one scan opens a screen where the guard selects 1/2/3/4 members entering at once), that can be added.

For better security, a future version can add a guard PIN/login and an event-specific reset so the same Google Sheet can be reused for multiple events.
