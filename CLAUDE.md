# CLAUDE.md — School Management System

Guidance for Claude (or any AI/dev) working on this repo. The user speaks Roman-Urdu/Hinglish; reply in the same style, briefly. **Do not change existing features unless asked** — fix only the reported issue.

## Projects
- `public/` — school app (headmaster/teacher/parent). Vanilla HTML/CSS/JS SPA, no build. Main file `script.js` (~250 KB, global functions).
- `admin/` — Platform Admin site (approvals, plans, expiry). Separate deployment.
- Public site: Vercel `https://sms-mrjb.vercel.app`. Static + one serverless function `public/api/drive.js`.

## Architecture
- State: global `DB` object persisted in localStorage (`DB_KEY`); `saveDB()` marks pending sync; `render()` redraws `#app`.
- Storage: one JSON file per school in the headmaster's Google Drive (`DRIVE_FILE_ID`, from `?fid=` or localStorage `bfhs_drive_file_id`).
- Registry: JSON on Drive (`MASTER_REGISTRY_FILE_ID`) `{schools:{[fileId]:{status,plan,expiryDate,…}}}`, public read, admin-only write. `refreshApprovalStatus()` + `approvalCacheGet/Set` (30-day offline cache) drive the approval gate in `render()`.
- Reads: `fetchDriveJson(id)` tries `/api/drive` (server) → sign-in token → API key → token+key, and reports every failure. Never add more routes/retries (Google anti-abuse blocking gets worse); keep backoff.
- Writes: Google Identity Services token (scope `drive.file` + `userinfo.email`). `drive.file` only sees app-created files or files picked via Google Picker, so teachers must use `driveOfferPicker()` once. Token lasts ~1h; renew silently (`driveEnsureToken`, `bfhs_drive_auth`). Drive stays connected until logout.
- Offline: `sw.js` (network-first, cache fallback, bypasses Google hosts and `/api/`). Pending changes in `bfhs_pending_sync`; `driveSyncCycle()` uploads when online.
- `DRIVE_LOAD` (`ok/err/loading`) feeds `loadStatusHtml()/loadFailHtml()` on the login screen; `testParentAccess()` is the headmaster's self-test.

## Rules of the domain (do not break)
- Fees: a student is charged only from the **admission month** (`feeStartMonth/feeApplies/feeGuard`); show paid / total / remaining (`recAmount/recPaid/recBalance/feeSummary`). Combined voucher: `openCombinedFee/cfIssue`.
- Salary: counted from teacher **join month** (`salStartMonth/salApplies/salGuard`) with the same warning style.
- Streams: separate class names (e.g. "11th Pre-Medical"); chosen in `hmPromotion` via `nextClassOptions/nextClassFor`.
- Certificates: freeze school name/headmaster at issue (`rec.school`); voiding keeps the record (never delete); log is class-wise.
- Theme: `THEMES`, `applyTheme`, `setTheme`. Default school name `My School` until registration.
- Headmaster Gmail is set from the connected Google account (no manual Gmail/password fields at registration).

## Admin site
- No username/password. Access only via Google sign-in as `OWNER_GMAIL`. **Never reintroduce hard-coded credentials.** Registry sharing is auto-checked/healed (`adminCheckPublicRead`, `adminEnsurePublicSharing`).

## Release checklist
1. Edit code → `node --check script.js sw.js api/drive.js`.
2. Bump `CACHE_VERSION` (`sw.js`) and `BUILD_TAG` (`script.js`).
3. Commit/push the **whole** folder incl. `api/`.
4. Verify `/api/drive?id=<REGISTRY_ID>` returns JSON, login screen shows the new build tag, headmaster "Test teacher/parent link" is green.

## Testing
- Playwright (Chromium in `/opt/pw-browsers`, Python sync API) with `route()` mocking of Google endpoints; serve `public/` on a free local port. CDNs (Tailwind) are unreachable in the sandbox, so layout checks are limited.
- Scenarios worth keeping: public read for parent/teacher, registry unreadable (teachers/parents not locked out), school file unreadable (banner, no first-time HM form), teacher token 404 → picker offer, slow response (>4 s) still re-renders.

## Known setup requirements (Google Cloud)
API key website restrictions must list the public and admin domains; allow Drive + Picker APIs; OAuth origins must list both domains. Most "link doesn't work" reports come from here (`API_KEY_HTTP_REFERRER_BLOCKED`).

## Known limitations / ideas
- Plaintext passwords in a publicly readable file; consider hashed passwords or a private backend (Firebase/Supabase/Cloudflare KV).
- Layout/branding of PWA store assets: `public/screenshots/`, `icon-*.png`, `manifest.webmanifest` (has `id`, categories, wide screenshots).
