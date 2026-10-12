# School Management System

A multi-school management web app (PWA) for headmasters, teachers and parents. It works offline and syncs each school's data to **that school's own Google Drive** when the internet is back.

Two separate sites make up the system:

| Site | Purpose | Folder |
|---|---|---|
| **Public school site** | Headmaster / Teacher / Parent app | `public/` |
| **Platform Admin site** | Approves schools, manages plans & expiry | `admin/` |

The public site is deployed on Vercel (`https://sms-mrjb.vercel.app`). The admin site is deployed separately (e.g. Cloudflare Pages).

## Features

- **Fees** – counted only from the student's admission month; paid / total / remaining shown; combined multi-month voucher.
- **Salary** – counted only from the teacher's join month; paid / total / remaining; warning when a month is before joining.
- **Classes & streams** – 11th/12th Pre-Engineering and Pre-Medical, chosen at promotion from 10th; separate subjects and teachers.
- **Marks, attendance, homework, timetable, announcements.**
- **Certificates & ID cards** – use each school's own name; issued certificates are a permanent, class-wise record (can be voided, never deleted).
- **Themes** – the headmaster picks one of 6 colour themes.
- **Offline-first PWA** – works with no internet; changes upload automatically when internet returns.
- **School Link** – `https://<site>/?fid=<DRIVE_FILE_ID>` gives teachers and parents access to that school only.
- **Admin approval** – a new school must be approved by the platform admin before its dashboard opens.

## How it works

```
Parent / Teacher phone ──► /api/drive (Vercel) ──► Google Drive (school JSON file)
Headmaster / Teacher ──(Google sign-in)──► Drive upload (auto-sync)
Admin site ──(Google sign-in as owner)──► registry JSON on Drive
School site ──► reads registry to see approved / pending / denied / expired
```

- Each school = one JSON file in the headmaster's Google Drive.
- A **registry** JSON file (`MASTER_REGISTRY_FILE_ID` in `public/script.js`) lists schools and their status/plan/expiry. It is shared "anyone with the link: viewer"; only the admin writes to it.
- Parents and teachers read the school file without signing in (through `/api/drive`, which falls back to direct Google reads).
- Teachers who want to save must connect their Google account, and select the school file once (Google Picker) — required by the `drive.file` scope.

## Project layout

```
public/
  index.html, style.css, script.js     # the whole app (vanilla JS)
  sw.js                                # service worker (offline)
  manifest.webmanifest, icon-*.png     # PWA
  screenshots/                         # PWA store screenshots
  api/drive.js                         # Vercel server read-proxy for Drive JSON
  privacy-policy.html, terms-of-service.html
admin/
  index.html, style.css, script.js     # Platform Admin
```

## Deploy

1. Commit and push **the whole folder, including `api/`**, then deploy to Vercel (or upload the folder).
2. In **Google Cloud Console → Credentials**:
   - **API key → Website restrictions:** add `https://sms-mrjb.vercel.app/*` (and the admin site's domain).
   - **API key → API restrictions:** allow *Google Drive API* and *Google Picker API*.
   - **OAuth Client ID → Authorized JavaScript origins:** add `https://sms-mrjb.vercel.app` and the admin domain.
   - Enable *Google Drive API* and *Google Picker API* in the Library.
3. Bump `CACHE_VERSION` in `sw.js` (and `BUILD_TAG` in `script.js`) on every release so devices refresh. The build tag is shown at the bottom of the login screen.
4. Check `https://<site>/api/drive?id=<REGISTRY_ID>` — it should return JSON.

## First-time school setup

1. Headmaster opens the site, registers the school and signs in with Google (Cloud Sync). The backup Gmail is taken from that Google account.
2. The admin approves the school in the Platform Admin site.
3. Headmaster: Cloud Sync → **Enable Parent Viewing**, then **🧪 Test teacher/parent link** (should be green).
4. Share the **School Link** with teachers and parents.
5. Teachers: log in with the Gmail the headmaster added, tap **Connect Google Drive**, then **Allow access to school file** once.

## Troubleshooting

| Message | Meaning / fix |
|---|---|
| `API_KEY_HTTP_REFERRER_BLOCKED` | Add the site to the API key's website restrictions. |
| "The API developer key is invalid" (Picker) | Same key problem; also allow *Google Picker API* on the key. |
| `notFound` / "file is not public" | Headmaster must press **Enable Parent Viewing**. |
| `Failed to fetch` | Network/browser blocks Google; use the Vercel `/api/drive` route (deploy `api/`). |
| Teacher work not reaching headmaster | Teacher must connect Google Drive and allow the school file. |

## Security notes

- Teacher/parent passwords are stored in the school's data file in plain text, and "Enable Parent Viewing" makes the file readable by anyone with the link. Treat the School Link like a password. Hashing passwords and moving data to a private backend are recommended future improvements.
- The platform admin has no username/password: access is only through Google sign-in with the owner account. Never add hard-coded credentials.

## Local development

No build step. Serve `public/` with any static server (`python3 -m http.server`) and open `index.html?fid=<FILE_ID>`. Tailwind and html2canvas load from CDNs.
