# BookReady DB backups — local + off-server

Daily `mysqldump` of `bookready_central` + every `tenant_*` DB. Local
retention is 14 days; the off-server copy mirrors that retention in an
S3-compatible bucket so a host loss doesn't take the dumps with it.

## Layout

```
/usr/local/bin/bookready-db-backup.sh        — local dump + rotation, chains into sync
/usr/local/bin/bookready-db-backup-sync.sh   — mirrors /root/backups/mysql/ to object storage
/etc/bookready/backup-sync.env               — credentials + endpoint (root-only)
/root/backups/mysql/                         — local 14 day rolling buffer
/var/log/bookready-backup.{log,err}          — local dump output
/var/log/bookready-backup-sync.{log,err}     — sync output
/var/lib/bookready/last-backup-sync.ts       — unix ts of last successful sync (health probe)
```

Crontab on prod (`crontab -e` as root):

```
0 3 * * * /usr/local/bin/bookready-db-backup.sh
0 4 * * * /usr/local/bin/bookready-db-backup-sync.sh
```

The 04:00 sync is a backfill / catch-up: if the 03:00 chained sync
failed (creds rotated, bucket hiccup), the 04:00 run catches the new
dump on its own.

## Choosing a provider

The sync script speaks the S3 API, so anything S3-compatible works. By
preference for BookReady's pre-launch scale (dumps under 1 GB/day):

1. **DigitalOcean Spaces** — same datacenter as the droplet, $5/mo flat
   for 250 GB + 1 TB transfer. Simplest if you already have a DO
   billing relationship. Recommended for launch.
2. **Backblaze B2** — cheapest by far ($0.006/GB/mo, free egress to
   Cloudflare). Different billing relationship to set up. Switch to
   this once dump volume justifies the bookkeeping.
3. **AWS S3** — standard, $0.023/GB/mo + egress. Use only if you need
   cross-region replication or are already on AWS.

## First-time setup (DigitalOcean Spaces)

Run as the founder, not from this repo. The bucket holds production
DB dumps — credentials should never live in this repo.

1. **Create the Space.** DO Console → Spaces Object Storage → Create
   Space. Region: `nyc3` (same as the droplet). Name:
   `bookready-prod-backups`. Allow file listing: OFF. Enable CDN: OFF.

2. **Generate a Spaces access key.** DO Console → API → Spaces Keys →
   Generate New Key. Name: `bookready-backup-sync`. Save both the
   Access Key and Secret to a password manager.

3. **Install aws CLI on the droplet** if not already there. On
   Ubuntu 24.04 the `awscli` apt package is no longer maintained —
   use snap or AWS's bundled installer:

   ```bash
   snap install aws-cli --classic
   aws --version  # confirm
   ```

   (Already installed on prod as of 2026-06-09.)

4. **Drop the env file on the server** with the credentials. Must be
   root-only readable.

   ```bash
   sudo install -d -m 0700 /etc/bookready
   sudo tee /etc/bookready/backup-sync.env >/dev/null <<'ENV'
   BACKUP_SYNC_BUCKET=bookready-prod-backups
   BACKUP_SYNC_PREFIX=mysql/
   BACKUP_SYNC_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com
   BACKUP_SYNC_REGION=nyc3
   AWS_ACCESS_KEY_ID=<paste DO Spaces access key>
   AWS_SECRET_ACCESS_KEY=<paste DO Spaces secret>
   ENV
   sudo chmod 0600 /etc/bookready/backup-sync.env
   ```

5. **Install the scripts.** Copy from the repo, make executable.

   ```bash
   scp infra/backup/bookready-db-backup.sh       root@prod:/usr/local/bin/
   scp infra/backup/bookready-db-backup-sync.sh  root@prod:/usr/local/bin/
   ssh root@prod chmod +x /usr/local/bin/bookready-db-backup.sh /usr/local/bin/bookready-db-backup-sync.sh
   ```

6. **Add the 04:00 catch-up cron** (the 03:00 dump already runs):

   ```bash
   sudo crontab -e
   # add:
   # 0 4 * * * /usr/local/bin/bookready-db-backup-sync.sh
   ```

7. **Manually run the sync once to seed the bucket** with the existing
   local dumps:

   ```bash
   sudo /usr/local/bin/bookready-db-backup-sync.sh
   ```

8. **Verify the bucket has the dumps.** DO Console → Spaces → your
   space → should show `mysql/bookready-YYYYMMDD-HHMMSS.sql.gz` for
   every retained day.

## Backblaze B2 setup (alternative)

Identical to DO Spaces except:

```bash
BACKUP_SYNC_ENDPOINT_URL=https://s3.us-east-005.backblazeb2.com
BACKUP_SYNC_REGION=us-east-005
```

The Access Key + Secret come from B2 Console → App Keys → Add a New
Application Key. Grant write + read access scoped to the bucket.

## AWS S3 setup (alternative)

Leave `BACKUP_SYNC_ENDPOINT_URL` unset. `BACKUP_SYNC_REGION` is the
bucket region (e.g. `us-east-1`). Credentials are an IAM key with the
narrow policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::bookready-prod-backups",
      "arn:aws:s3:::bookready-prod-backups/*"
    ]
  }]
}
```

## Restore from the off-server backup

If the droplet is gone, on a fresh host:

1. Install the AWS CLI + your provider credentials (same env file shape
   as above).
2. List available dumps:

   ```bash
   aws s3 ls s3://bookready-prod-backups/mysql/ --endpoint-url=https://nyc3.digitaloceanspaces.com
   ```

3. Pull the dump you want:

   ```bash
   aws s3 cp s3://bookready-prod-backups/mysql/bookready-20260609-030001.sql.gz . \
     --endpoint-url=https://nyc3.digitaloceanspaces.com
   ```

4. Restore against a running MySQL:

   ```bash
   gunzip -c bookready-20260609-030001.sql.gz | mysql -u root -p
   ```

   The dump uses `--databases ...` so it creates each database before
   restoring it. The target server does NOT need the databases pre-created.

5. After restore, run the BookReady deploy on the new host so config +
   migrations land in their expected state.

## Health monitoring

The sync writes `/var/lib/bookready/last-backup-sync.ts` (unix
timestamp) on every successful run. The admin platform System Health
tile should:

- Read this file
- If `now() - last_ts > 36h`, flag it (more than ~1.5 missed dumps —
  paging-worthy)
- If the file is missing entirely, treat as critical (sync never
  succeeded, credentials wrong)

To wire this into the dashboard, expose it via a small endpoint —
e.g. `GET /admin/system/health/backup-sync` returning
`{ last_synced_at: '...', age_seconds: N, ok: true|false }`.

## When to bump retention

14 days is a launch-tier policy: covers "a customer reported missing
data, can we restore" out to two business weeks. Once revenue customers
land, bump to **30 days local + 90 days off-server** (off-server is
cheap on B2; local stays at 14 to keep the droplet disk slim).
