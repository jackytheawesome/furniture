#!/usr/bin/env bash
# Обновление приложения на сервере (из каталога репозитория).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.production ]]; then
  echo "Создайте .env.production из .env.production.example"
  exit 1
fi

set -a
source .env.production
set +a

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "Деплой завершён. Проверка: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login"
