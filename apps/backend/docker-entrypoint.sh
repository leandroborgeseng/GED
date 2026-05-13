#!/bin/sh
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "==================================================================="
  echo "GED API: DATABASE_URL não está definida."
  echo "No Railway: abra o serviço da API → Variables → New Variable."
  echo "Nome: DATABASE_URL"
  echo "Valor: use \"Reference\" e escolha o PostgreSQL do projeto"
  echo "       (ex.: \${{ Postgres.DATABASE_URL }} — ajuste \"Postgres\" ao nome real do serviço de banco)."
  echo "==================================================================="
  exit 1
fi
npx prisma migrate deploy
exec node dist/src/main.js
