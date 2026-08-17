#!/usr/bin/env bash
# Первичная настройка VPS Timeweb (Ubuntu 22.04/24.04). Запуск на сервере под root или с sudo.
set -euo pipefail

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Скрипт рассчитан на Ubuntu/Debian."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

echo "Готово: docker $(docker --version), nginx, certbot."
echo "Дальше: клонировать репозиторий, создать .env.production, docker compose -f docker-compose.prod.yml up -d --build"
