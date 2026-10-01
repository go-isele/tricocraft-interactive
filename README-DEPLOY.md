# Deploying TrioCraft to a VPS

Two apps, one domain, one PostgreSQL database. This is the one-time setup; once
it's done, shipping a change is just `git push` locally and `./deploy.sh` on
the server.

## Architecture

```
                         ┌─────────────────────────┐
  https://triocraft.org ▶│         Nginx            │
                         │   (ports 80 / 443)       │
                         └───────────┬──────────────┘
                     /api/*, /uploads/*   everything else
                                │                │
                                ▼                ▼
                   ┌─────────────────────┐  ┌─────────────────────┐
                   │  Express API        │  │  Next.js frontend   │
                   │  server/            │  │  web/                │
                   │  127.0.0.1:4000     │  │  127.0.0.1:3000     │
                   │  systemd:           │  │  systemd:           │
                   │  triocraft-api      │  │  triocraft-web      │
                   └──────────┬──────────┘  └─────────────────────┘
                              ▼
                   PostgreSQL (local, 127.0.0.1:5432)
                   database: triocraft
```

Both apps run on the same machine behind one Nginx host, so the session
cookie and client-side API calls work same-origin with zero CORS config —
see the comments in `web/lib/api.js` and `server/server.js`.

**Why PostgreSQL and not SQLite:** an earlier version of this stack used
`better-sqlite3`. That's a *native* Node module — it needs a prebuilt binary
matching the exact Node version running it, and a very new/non-LTS Node
release can break it with "Could not locate the bindings file" until a
matching prebuild exists. `pg` (the Postgres driver used here) is pure
JavaScript — there's no native binary to ever mismatch — and Postgres
also handles concurrent writes properly if this API ever runs on more
than one server. See `server/db/schema.sql`'s header comment for the full
migration notes.

## Prerequisites on the VPS

- Server: `185.194.217.95`
- Domain: `triocraft.org`
- Ubuntu/Debian (commands below assume `apt`; adjust for another distro)
- Node.js 18+ (`node -v` — install via NodeSource if needed; prefer an LTS
  release — 20.x or 22.x — over the bleeding-edge "current" line, since
  native-module prebuilds for very new Node versions lag behind)
- Nginx
- PostgreSQL + the `pg_dump`/`pg_restore` client tools (for backups):
  `sudo apt install postgresql postgresql-contrib`
- `certbot` with the Nginx plugin: `sudo apt install certbot python3-certbot-nginx`

## 0. DNS (do this first — it needs time to propagate)

In the Gandi DNS console for `triocraft.org`:

1. **Change** the apex `A` record from `144.91.81.97` (the old server) to
   `185.194.217.95` (this server). `www` is a `CNAME` to `@`, so it follows
   automatically — no separate change needed.
2. **Delete** these `A` records, which pointed unrelated projects at the old
   server and are being decommissioned from this domain:
   `app`, `carflex`, `karoapi`, `leatherlens`, `mmspro`, `smarticket`,
   `upnext`. Double-check nothing still depends on them before deleting —
   this takes those subdomains offline immediately.
3. **Leave everything else untouched** — the mail records (MX, SPF, DMARC,
   DKIM, the IMAP/POP3/submission SRV records), `webmail`, the
   Mailtrap/SMTP2GO records (`em815232`, `link`, `mt-link`, `mt90`,
   `rwmt1`/`rwmt2`._domainkey, `s815232`._domainkey), and `somo` (a separate
   project on Vercel) are all unrelated to this migration.

DNS propagation can take anywhere from a few minutes to a few hours — the
`certbot` step in part 7 will fail if `triocraft.org` hasn't started
resolving to this server yet, so it's worth doing this step first and
checking with `dig triocraft.org` before moving on.

## 1. Create a dedicated service user and directory

Don't run this as root day-to-day.

```bash
sudo adduser --system --group --home /var/www/triocraft triocraft
sudo mkdir -p /var/www/triocraft
sudo chown triocraft:triocraft /var/www/triocraft
```

## 1b. Create the PostgreSQL role and database

```bash
sudo -u postgres psql -c "CREATE ROLE triocraft WITH LOGIN PASSWORD 'CHOOSE-A-REAL-PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE triocraft OWNER triocraft;"
```

Use the same password in `DATABASE_URL` in step 3. No manual schema/table
creation needed — the app applies `server/db/schema.sql` automatically on
every boot (every statement is `CREATE TABLE IF NOT EXISTS`).

## 2. Clone the repo

```bash
sudo -u triocraft git clone git@github.com:go-isele/tricocraft-interactive.git /var/www/triocraft
cd /var/www/triocraft
```

(If the VPS needs its own SSH deploy key for GitHub, generate one as the
`triocraft` user and add it as a deploy key on the repo.)

## 3. Environment files

Neither app's real env file is committed (see each `.gitignore`) — you
create both directly on the server.

**API** — `server/.env`:

```bash
cp server/.env.example server/.env
nano server/.env
```

Fill in at minimum:
- `DATABASE_URL` — `postgresql://triocraft:THE-PASSWORD-FROM-STEP-1B@localhost:5432/triocraft`
- `SESSION_SECRET` — a long random string
- `MPESA_CALLBACK_URL=https://triocraft.org/api/mpesa/callback` — Safaricom
  calls this to confirm payments, so it must be this real public HTTPS URL,
  never `localhost`
- the real M-Pesa Daraja consumer key/secret/shortcode/passkey, and
  WhatsApp Cloud API / SMTP credentials, once you have them

Everything above is designed to gracefully simulate when left blank, so the
app runs correctly end-to-end (including a working checkout flow) before
those real credentials exist.

**Frontend** — `web/.env.production.local`:

```bash
cp web/env.production.example web/.env.production.local
```

The defaults in that file are already correct for this setup
(`INTERNAL_API_URL=http://localhost:4000`, `NEXT_PUBLIC_API_URL=` empty) —
just make sure the file exists before the first build. **This matters more
than it looks**: `NEXT_PUBLIC_API_URL` gets baked into the browser bundle at
*build time*, not read at request time, so it must be in place before you
ever run `npm run build`, not just before starting the server.

## 4. Install dependencies and build

```bash
cd /var/www/triocraft/server && npm ci --omit=dev
cd /var/www/triocraft/web && npm ci && npm run build
```

## 5. First boot — apply schema and seed demo/admin data

The schema applies itself automatically against Postgres on every boot
(every table is `CREATE TABLE IF NOT EXISTS` — see `server/db/db.js`'s
`ensureSchema()`), but the seed script that creates the admin account and
starter catalogue is a **one-time, manual step** — never run it again after
go-live, since re-running it will reset demo account passwords.

```bash
cd /var/www/triocraft/server
node db/seed.js
```

Then immediately change the seeded admin/vendor/client passwords (the seed
script prints a reminder) — either through the app once it's live, or
directly:

```bash
node -e "
const bcrypt = require('bcryptjs');
const db = require('./db/db');
db.run('UPDATE users SET password_hash = ? WHERE email = ?',
  [bcrypt.hashSync('YOUR-NEW-PASSWORD', 10), 'admin@triocraft.org'])
  .then(() => db.pool.end());
"
```

## 6. systemd services

```bash
sudo cp deploy/triocraft-api.service /etc/systemd/system/
sudo cp deploy/triocraft-web.service /etc/systemd/system/
```

Edit both files first if your repo lives anywhere other than
`/var/www/triocraft`, and confirm the `node` path in
`triocraft-api.service` matches `which node` on this server.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now triocraft-api
sudo systemctl enable --now triocraft-web
sudo systemctl status triocraft-api triocraft-web
```

## 7. Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/triocraft
sudo ln -s /etc/nginx/sites-available/triocraft /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d triocraft.org -d www.triocraft.org
```

`deploy/nginx.conf` already has `triocraft.org` filled in — no editing
needed unless the domain changes later. Run certbot *after* the plain-HTTP
config is live and `nginx -t` passes — it edits the file in place to add the
HTTPS server block with the correct certificate paths. Certbot also sets up
its own renewal timer; nothing else to do there.

At this point the site should be live at `https://triocraft.org`.

## 8. Let the deploy user restart services without a password

`deploy.sh` restarts both services via `sudo systemctl restart`. Scope that
narrowly rather than giving the deploy user full sudo:

```bash
sudo visudo -f /etc/sudoers.d/triocraft-deploy
```

```
triocraft ALL=(root) NOPASSWD: /usr/bin/systemctl restart triocraft-api, /usr/bin/systemctl restart triocraft-web
```

## 9. Database backups

```bash
chmod +x deploy/backup-db.sh
crontab -e   # as the triocraft user, or adjust the path if run as root
```

```
0 3 * * * /var/www/triocraft/deploy/backup-db.sh >> /var/log/triocraft-backup.log 2>&1
```

Backups land in `backups/` at the repo root (`pg_dump -Fc` custom-format
dumps, 14-day retention by default) and are gitignored — copy them off the
VPS periodically (e.g. to S3, Backblaze, or just `scp` down) so a disk
failure can't take both copies. Restore one onto a fresh database with:

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/triocraft-TIMESTAMP.dump
```

---

## Ongoing deploys

From your own machine:

```bash
git push origin main
```

On the server:

```bash
cd /var/www/triocraft
./deploy.sh
```

`deploy.sh` pulls `main`, installs locked dependencies for both apps,
rebuilds the frontend, restarts both services, and health-checks each one.
It refuses to run if there are uncommitted changes on the server, and never
touches the database or Nginx config — see the comments at the top of the
script for exactly what it does and doesn't do.

## Troubleshooting

- **Service won't start**: `sudo journalctl -u triocraft-api -n 50 --no-pager`
  (or `triocraft-web`)
- **502 from Nginx**: the upstream service is down or hasn't started yet —
  check the systemd status for both services first
- **Logged-in users keep getting logged out / API calls fail from the
  browser but work from `curl`**: almost always `NEXT_PUBLIC_API_URL` wasn't
  empty at build time — rebuild the frontend after fixing
  `web/.env.production.local`
- **M-Pesa callback never arrives**: `MPESA_CALLBACK_URL` in `server/.env`
  must be `https://triocraft.org/api/mpesa/callback` (real public HTTPS URL),
  not `localhost`
- **API won't start — "DATABASE_URL is not set"**: `server/.env` is missing
  or doesn't have `DATABASE_URL` set — see step 3.
- **API won't start — "password authentication failed for user \"triocraft\""
  or "database \"triocraft\" does not exist"**: the role/database from step
  1b doesn't match what's in `DATABASE_URL`, or step 1b was skipped —
  `sudo -u postgres psql -l` lists existing databases, `\du` inside `psql`
  lists roles.
- **"Could not locate the bindings file" (better-sqlite3)**: this means
  you're running code from before the Postgres migration — pull the latest
  `main` and re-run `npm ci` in `server/`; this error should not occur on
  current code at all, since `pg` has no native binary to mismatch.
