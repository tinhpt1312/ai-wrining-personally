#!/bin/sh
set -e

if [ -n "${DB_HOST}" ]; then
  echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
  until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME}" -d "${DB_DATABASE}" > /dev/null 2>&1; do
    sleep 2
  done
  echo "PostgreSQL is ready."
fi

echo "Running database migrations..."
node ./node_modules/typeorm/cli.js migration:run -d ./dist/config/db.config.js

echo "Starting API..."
exec "$@"
