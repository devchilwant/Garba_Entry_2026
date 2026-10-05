# Society Entry Authorizer v4

## Changes in this version

QR generation and QR scanning have been completely removed.

The application now uses manual:
- Wing
- Flat Number
- People Entering Now

It reads from each wing sheet:

| Column | Meaning |
|---|---|
| B | Flat No. |
| D | Amount Paid |
| E | Owner / Tenant |
| G | Member Count |

## Entry logic

The application creates a separate log sheet for every calendar day.

Example:

- `Entry Log - 2026-10-05`
- `Entry Log - 2026-10-06`
- `Entry Log - 2026-10-07`

Each log contains:

`Timestamp | Wing | Flat No. | Owner/Tenant | Allowed Members | People Entering | Previous Entered | Total Entered | Remaining`

### Example

Flat 101:

- Allowed members = 4
- First entry = 2

The app records:

- People entering = 2
- Total entered = 2
- Remaining = 2

Later:

- People entering = 1

It records:

- Total entered = 3
- Remaining = 1

If somebody tries to enter 2 when only 1 remains, the app rejects the entry.

## Setup

### 1. Apps Script

Open your Apps Script project and replace `Code.gs` with the new `apps-script/Code.gs`.

Set:

`const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";`

The existing spreadsheet ID you provided earlier is:

`17ZpEPxHHG5OPnx0sdKyq2dFkvOy_Q6UxzsnaCJl0TdU`

So you can use:

`const SPREADSHEET_ID = "17ZpEPxHHG5OPnx0sdKyq2dFkvOy_Q6UxzsnaCJl0TdU";`

### 2. Payment amount

The code currently uses:

`const MINIMUM_AMOUNT = 1800;`

Change this if your event's required amount is different.

### 3. Deploy/update Web App

After replacing the Apps Script code:

Deploy → Manage deployments → Edit the Web App deployment → create/update the version → Deploy.

Keep:

- Execute as: Me
- Who has access: Anyone

### 4. GitHub website

Open `app.js` and replace:

`PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

with your existing Web App URL.

Then push the files to your GitHub Pages repository.

## Important behavior

The daily log is based on the spreadsheet/script timezone. If your spreadsheet timezone is India Standard Time, daily logs will follow IST.

The application does NOT reset the main Google Sheet count. It only calculates "entered today" from that day's log sheet.

When the next day starts, a new log sheet is automatically created and that day's entered count starts from zero.

No QR code functionality is included in this version.
