#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/specifications"

mkdir -p "${OUT_DIR}"

: "${DB_NAME:?Missing DB_NAME}"
: "${DB_HOST:?Missing DB_HOST}"
: "${DB_PORT:?Missing DB_PORT}"
: "${DB_USER:?Missing DB_USER}"
: "${DB_PASSWORD:?Missing DB_PASSWORD}"

MYSQL_OPTS=(
  --host="${DB_HOST}"
  --port="${DB_PORT}"
  --user="${DB_USER}"
  --protocol=tcp
)

MYSQL_PWD="${DB_PASSWORD}"
export MYSQL_PWD

CA_FILE=""
SSL_OPTS=()
if [[ -n "${DB_CA_CERT:-}" ]]; then
  CA_FILE="$(mktemp)"
  printf '%s' "${DB_CA_CERT}" | sed 's/\\n/\n/g' > "${CA_FILE}"
  SSL_OPTS+=(--ssl-ca="${CA_FILE}")
fi

cleanup() {
  if [[ -n "${CA_FILE}" ]]; then
    rm -f "${CA_FILE}"
  fi
}
trap cleanup EXIT

mysqldump \
  "${MYSQL_OPTS[@]}" \
  "${SSL_OPTS[@]}" \
  --no-data \
  --skip-comments \
  --skip-dump-date \
  --routines \
  --triggers \
  "${DB_NAME}" > "${OUT_DIR}/schema.sql"

{
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "table_name" \
    "column_name" \
    "column_type" \
    "is_nullable" \
    "column_default" \
    "column_key" \
    "extra" \
    "column_comment"
  mysql \
    "${MYSQL_OPTS[@]}" \
    "${SSL_OPTS[@]}" \
    --batch \
    --raw \
    --skip-column-names \
    --database="${DB_NAME}" \
    --execute="SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' ORDER BY TABLE_NAME, ORDINAL_POSITION;"
} > "${OUT_DIR}/schema_columns.tsv"
