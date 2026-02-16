#!/bin/bash
# =============================================================================
# Margaz SQLite Otomatik Backup Script
# =============================================================================
# Kullanim:
#   chmod +x /home/bitnami/margaz-yeni/backend/scripts/backup-db.sh
#   ./backend/scripts/backup-db.sh
#
# Crontab kurulumu (her 12 saatte bir):
#   crontab -e
#   0 */12 * * * /home/bitnami/margaz-yeni/backend/scripts/backup-db.sh >> /home/bitnami/margaz-backups/backup.log 2>&1
# =============================================================================

set -euo pipefail

# --- Konfigürasyon ---
DB_PATH="/home/bitnami/margaz-yeni/backend/prisma/dev.db"
BACKUP_DIR="/home/bitnami/margaz-backups"
MAX_BACKUPS=14          # Son 14 backup tut (7 gun x 2/gun)
TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="${BACKUP_DIR}/auto-${TIMESTAMP}.db"

# --- Backup dizini kontrol ---
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "[$(date)] Backup dizini olusturuldu: $BACKUP_DIR"
fi

# --- DB dosyasi kontrol ---
if [ ! -f "$DB_PATH" ]; then
    echo "[$(date)] HATA: DB dosyasi bulunamadi: $DB_PATH"
    exit 1
fi

# --- Backup al (sqlite3 .backup — WAL-safe) ---
echo "[$(date)] Backup basladi: $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

# --- Boyut kontrol ---
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
DB_SIZE=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null)

if [ "$BACKUP_SIZE" -lt 1024 ]; then
    echo "[$(date)] UYARI: Backup dosyasi cok kucuk (${BACKUP_SIZE} bytes) — bozuk olabilir!"
    exit 1
fi

echo "[$(date)] Backup tamamlandi: ${BACKUP_FILE} (${BACKUP_SIZE} bytes, DB: ${DB_SIZE} bytes)"

# --- Eski backup'lari temizle (rotasyon) ---
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/auto-*.db 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "[$(date)] Eski backup temizligi: ${DELETE_COUNT} dosya silinecek"
    ls -1t "${BACKUP_DIR}"/auto-*.db | tail -n "$DELETE_COUNT" | xargs rm -f
    echo "[$(date)] Temizlik tamamlandi. Kalan backup: ${MAX_BACKUPS}"
fi

# --- Özet ---
echo "[$(date)] Aktif backup'lar:"
ls -lh "${BACKUP_DIR}"/auto-*.db 2>/dev/null | tail -5
echo "---"
