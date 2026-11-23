# Operations: monitoring, backups and account settings

Nothing here is part of the website, costs money or contains a secret. It is the safety net around it.

## 1. GitHub: secret scanning and push protection (free; do once, 2 minutes)

The repository is **public**, so GitHub offers these at no cost. They cannot be switched on from outside your account.

1. Open the repository on github.com, then **Settings → Code security** (older layout: *Code security and analysis*).
2. Turn **ON**: *Dependency graph*, *Dependabot alerts*, *Dependabot security updates*, *Secret scanning*, and **Push protection** (this blocks a push that contains a recognised key or token).
3. Optional but sensible: **Settings → Branches → Add rule** for `main`: *Require a pull request before merging* is not needed for a solo project, but turn on *Block force pushes* and *Restrict deletions*.
4. Make sure your own GitHub account has two-step sign-in (Settings → Password and authentication).

## 2. Vercel: preview deployment protection (free option recommended)

Today preview URLs are open to anyone who has or guesses the address (Vercel Authentication and Password Protection are both off). Previews carry no user data (they have no database connection), but they show unreleased work.

Recommended, free configuration, in **Vercel → project japan-live-city → Settings → Deployment Protection**:

- **Vercel Authentication: ON, scope "Standard Protection"** (previews and the long per-deployment addresses require a Vercel login; your public production address `livecityjapan.vercel.app` stays open to everyone). This is available on all plans.
- **Password Protection: leave OFF.** It is a paid add-on on some plans.
- **Protection Bypass for Automation: optional.** Only turn it on if you want my test scripts to be able to call a protected preview; it creates a secret that you control and can rotate.
- Effect to expect: opening a preview asks you to sign in to Vercel (you already are the owner). Anyone you want to show a preview to must be invited to the team or use a temporary share link from the deployment page.

## 3. Uptime monitoring (free)

**What is watched:** `/api/community/status` (can the Community reach its database and photo bucket?) and the home page. Note: the status endpoint always answers HTTP 200; the real verdict is `"ok": true` in its JSON, so a plain "is it up" ping is not enough: use one of the keyword/JSON checks below.

**Option A, prepared on the owner's Mac (not in the repository yet): `.github/workflows/uptime.yml`.** Runs on GitHub every 15 minutes, free for public repositories, uses no secrets and no third-party code. If anything is wrong the run fails and GitHub emails you. GitHub refuses to accept a workflow file from the access token used on that Mac (it lacks the `workflow` permission), so the file is kept out of the pushed commits. To switch it on without changing any token: on github.com open the repository → **Add file → Create new file**, name it `.github/workflows/uptime.yml`, paste the file's contents, and commit to `main`. GitHub runs schedules from the default branch only, and pauses them after 60 days without repository activity (re-enable under the *Actions* tab).

**Option B, outside GitHub (good as a second opinion):** UptimeRobot or Better Stack, both with a free tier. Create a monitor of type **Keyword**, URL `https://livecityjapan.vercel.app/api/community/status`, keyword `"ok":true`, "alert if the keyword does NOT exist", interval 5 minutes, alert to your email. Create a second plain HTTP monitor for `https://livecityjapan.vercel.app/`. (Creating that account is yours to do.)

## 4. Weekly encrypted backup (free; runs on your Mac; nothing leaves it)

Tool: `ops/backup/`. It reads the database through a **read-only snapshot**, writes **one encrypted file** (AES-256-GCM), proves the file is good by decrypting it again and comparing every row count with the database, keeps the newest 8, and tells you by macOS notification if it fails.

**What is in a backup:** the data of every table in `public` (found automatically, so tables added later are included), a minimal account list (id, email, dates; **never password hashes**) and every photo in the bucket. The structure of the database is already in git (`supabase/migrations`), so it is not repeated.
**What is not:** passwords (people would reset them), and anything outside `public` / the photo bucket.

### One-time setup
1. In a Terminal: `cd "<your project folder>/ops/backup" && npm install` (installs one small package, `pg`, only for this tool).
2. Build the connection string. For this project it is
   `postgresql://postgres.kmulidalmhqezaffadzc:YOUR_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`
   where `YOUR_PASSWORD` is your **database password** (not your Supabase login; letters and numbers only, so nothing needs escaping). Supabase never shows this password again; if it is lost, set a new one under Project Settings → Database. It contains the password, so keep it out of files. *(Planned improvement, after the scratch-project test: use the built-in read-only database user `supabase_read_only_user` instead of `postgres`; it cannot write at all.)*
3. Store the two secrets in the macOS Keychain (each command asks you to type the value, so it never appears in your shell history or in any file):
   ```
   security add-generic-password -a livecityjapan -s livecityjapan-supabase-db-url -w
   security add-generic-password -a livecityjapan -s livecityjapan-backup-passphrase -w
   ```
   For the passphrase use something long and random, for example the output of `openssl rand -base64 24`. **Also save that passphrase in your password manager: without it the backups cannot be opened, and nobody (including me) can recover it.**
3b. **Supabase's certificate** (so the tool only talks to the real Supabase and never sends the password to an impostor): Supabase dashboard → Project Settings → Database → *SSL Configuration* → **Download certificate**, and save the file as `ops/backup/supabase-ca.crt` (it is a public certificate, not a secret). Without it the tool refuses to connect and says so.
4. Test it once by hand: `node backup.mjs`. You should see "Backup OK: … rows …" and a file in `~/LiveCityBackups`.
5. Schedule it weekly: first make sure the log folder exists (`mkdir -p ~/LiveCityBackups`; step 4 also creates it), then copy `com.livecityjapan.backup.plist.template` to `~/Library/LaunchAgents/com.livecityjapan.backup.plist`, replace `NODE_PATH` (run `which node`), `REPO_PATH` (this project's folder) and `HOME_PATH` (your home folder), then run `launchctl load ~/Library/LaunchAgents/com.livecityjapan.backup.plist`. It runs Sundays 03:30 and also when you log in, but at login it does nothing unless the last good backup is older than 6 days, so a Mac that was off on Sunday catches up. It keeps no log except the short result lines, readable by you only. Glance at `~/LiveCityBackups/status.json` now and then: `"ok": true` and a recent date mean all is well, and a notification appears if a backup fails.
6. **Keep a second copy** of the newest file somewhere else (an external drive or any cloud drive). It is encrypted, so that is safe, and it protects you if the Mac is lost.

Optional: `LCJ_BACKUP_CA` can point to the certificate file somewhere else.

### Restoring
`node restore.mjs <backup-file> --out ~/restore-test` decrypts and checks the file, then writes `restore.sql` (data for every table, readable before you run it), the photos under `photos/`, `accounts.csv` and `summary.txt`. It never touches a database, and it **refuses to write inside this project folder** (the files are unencrypted readable copies of your data; delete the folder when you are done).

To restore into a **new, empty** Supabase project: apply `supabase/migrations` to it, paste `restore.sql` into its SQL editor, upload the photos to the `community-photos` bucket. **`restore.sql` starts with a safety check that stops with a message, changing nothing, if the database already contains community data**, so pasting it into the live project by mistake does nothing. (`--allow-non-empty` removes the check; do not use it on live.) The SQL contains only `INSERT` statements (never delete, truncate, drop or alter). In the default, guarded mode (an empty project) rows that the migrations pre-fill, such as site settings and categories, take the backup's values; with `--allow-non-empty` nothing existing is ever replaced. Note: the SQL switches triggers off while loading with `session_replication_role = replica`; if the SQL editor refuses that setting, tell me: it has to be verified on the scratch project. **Practise this on a throwaway project once or twice a year** so you know it works before you need it.

### Limits to know
- Photos are held in memory while backing up, so the tool refuses above 300 MB of photos (today: 0.4 MB) and says so; at that size the photos need a different method.
- With the `postgres` login the tool relies on its read-only connection (set for the whole session and checked before anything is read) to stay harmless. Your project already has a built-in `supabase_read_only_user` that cannot write at all; setting a password for it is a change to the live database, so it needs your separate approval and a scratch-project trial first.
- Anyone who can run programs as you on this Mac can read Keychain items made this way without a prompt (that is how macOS treats items created by the `security` tool). FileVault protects the Mac when it is off or locked; keep the Mac's login protected.
- A weak passphrase can be guessed offline: use a long random one (the encryption is deliberately slow to guess against, but cannot save a weak passphrase).
- The free Supabase plan has no built-in backups, so this tool is the only safety net. Weekly means you could lose up to a week of posts; run it by hand before any risky change.
