# Deploying Stockhaus WMS to production

This guide puts the app live on a single Linux server using Docker and Caddy
(automatic HTTPS). Total time: ~15 minutes.

```
Browser ──HTTPS──► Caddy :443 ──► frontend (nginx) ──/api──► backend ──► postgres
                    (auto certs)     SPA + proxy     Express+Prisma    (internal)
```

On first boot the backend runs Prisma migrations and seeds permissions, roles
and the admin account automatically — no manual DB step.

Only Caddy is exposed to the internet. The database and backend are reachable
only on the internal Docker network.

## 1. Provision a server

- A small Linux VPS is enough: 1–2 vCPU, 2 GB RAM, 20 GB disk
  (Hetzner, DigitalOcean, AWS Lightsail, etc.).
- Open inbound ports **80** and **443** in the provider firewall.

## 2. (Optional but recommended) Point a domain at it

Create a DNS **A record** for e.g. `wms.yourcompany.com` → the server's IP.
HTTPS — and therefore phone **camera barcode scanning** — needs a hostname.
You can skip this and run by IP first; just add the domain later.

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Get the code and configure secrets

```bash
git clone <your-repo-url> /opt/wms && cd /opt/wms
git checkout claude/wms-architecture-design-6h18n2
cp .env.example .env
```

Edit `.env` and set, at minimum:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 16)      # strong db password
JWT_ACCESS_SECRET=$(openssl rand -hex 32)      # long random secret
JWT_REFRESH_SECRET=$(openssl rand -hex 32)     # a different long random secret
SEED_ADMIN_PASSWORD=your-real-admin-password   # your first login
SEED_DEMO=false                                # no demo accounts / sample data
SITE_ADDRESS=wms.yourcompany.com               # or leave as :80 to run by IP
```

> The production compose file refuses to start if `POSTGRES_PASSWORD`,
> `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` or `SEED_ADMIN_PASSWORD` are missing.

## 5. Launch

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- With a hostname in `SITE_ADDRESS`, Caddy fetches a TLS cert automatically —
  open `https://wms.yourcompany.com`.
- By IP, open `http://YOUR_SERVER_IP`.

Sign in as `admin` with the password you set. Because `SEED_DEMO=false`, only
the admin account exists — create staff and assign roles under **Users**.

## 6. Back ups

```bash
crontab -e
# add:
0 2 * * * /opt/wms/scripts/backup.sh >> /var/log/wms-backup.log 2>&1
```

Dumps land in `/opt/wms/backups/` (latest 14 kept). Restore with:

```bash
gunzip -c backups/wms-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U wms wms
```

## Operating it

```bash
# logs
docker compose -f docker-compose.prod.yml logs -f backend

# update to the latest code
git pull
docker compose -f docker-compose.prod.yml up -d --build

# stop / start
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Adding a domain later (if you started by IP)

1. Point an A record at the server.
2. Set `SITE_ADDRESS=wms.yourcompany.com` in `.env`.
3. `docker compose -f docker-compose.prod.yml up -d` — Caddy gets the cert on
   the next boot. Camera scanning now works on phones.

## Security checklist

- [ ] `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `POSTGRES_PASSWORD` are long and random
- [ ] `SEED_DEMO=false` and the admin password is strong
- [ ] Only ports 80/443 are open in the firewall (db/backend stay internal)
- [ ] DNS + HTTPS in place before using camera scanning
- [ ] Nightly backups scheduled and a restore tested once
