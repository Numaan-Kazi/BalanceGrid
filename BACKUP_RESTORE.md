# Database Backup and Recovery Guide — BalanceGrid

This document outlines the backup, retention, and disaster recovery strategy for BalanceGrid's PostgreSQL database.

---

## 1. Automated PostgreSQL Backups

### Creating a Full Database Backup

Run `pg_dump` with custom archive format (`-F c`):

```bash
pg_dump \
  -h localhost \
  -p 5432 \
  -U balance_user \
  -d balance_grid_db \
  -F c \
  -b \
  -v \
  -f "balance_grid_backup_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 2. Restoring from a Backup

To restore the database from a `.dump` file:

### Step 1: Terminate active connections (if restoring an existing DB)
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'balance_grid_db' AND pid <> pg_backend_pid();
```

### Step 2: Drop and recreate database
```bash
dropdb -h localhost -U balance_user balance_grid_db
createdb -h localhost -U balance_user balance_grid_db
```

### Step 3: Run `pg_restore`
```bash
pg_restore \
  -h localhost \
  -p 5432 \
  -U balance_user \
  -d balance_grid_db \
  -v \
  balance_grid_backup_YYYYMMDD_HHMMSS.dump
```

---

## 3. Recommended Automated Daily Backup Cron Job

On a Linux/macOS production server, create `/etc/cron.daily/backup-balance-grid`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/balance_grid"
DATE=$(date +\%Y\%m\%d_\%H\%M\%S)
FILENAME="${BACKUP_DIR}/balance_grid_${DATE}.dump"

mkdir -p "${BACKUP_DIR}"

pg_dump -h localhost -U balance_user -d balance_grid_db -F c -b -f "${FILENAME}"

# Retain backups for 30 days
find "${BACKUP_DIR}" -type f -name "*.dump" -mtime +30 -delete
```

Ensure permissions:
```bash
chmod +x /etc/cron.daily/backup-balance-grid
```

