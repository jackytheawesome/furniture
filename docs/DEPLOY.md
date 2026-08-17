# Деплой КорпусСмета на Timeweb VPS

Проект: Next.js 16 + Auth.js + Prisma + **PostgreSQL** на одном VPS.  
Репозиторий: https://github.com/jackytheawesome/furniture

На сервере работают:

- **PostgreSQL** — в Docker, данные в volume
- **Next.js** — в Docker (`standalone`), порт `3000` только на localhost
- **Nginx** — на хосте, прокси + HTTPS (Let's Encrypt)

---

## Что нужно от вас

| Что | Пример | Зачем |
|-----|--------|--------|
| **IP сервера** | `185.x.x.x` | SSH и A-запись домена |
| **SSH** | пользователь `root` или отдельный deploy | Деплой и настройка |
| **Домен** | `smeta.example.ru` | Nginx + SSL |
| **Пароли** | в `.env.production` на сервере | Postgres + `AUTH_SECRET` |

---

## Как выдать доступ агенту (Cursor)

Самый безопасный вариант — **SSH-ключ**, без пароля в чат.

### 1. SSH на Timeweb VPS

1. В панели Timeweb откройте VPS → сеть → публичный IP.
2. Убедитесь, что **22** открыт (файрвол / security group).
3. Добавьте **ваш** SSH-ключ в Timeweb **или** на сервер в `~/.ssh/authorized_keys`.

Чтобы агент мог подключиться с вашей машины, в чат пришлите:

```text
SSH_HOST=185.x.x.x
SSH_USER=root
SSH_PORT=22
DOMAIN=smeta.example.ru
```

Если агент будет работать через ваш терминал (вы вводите пароль при `ssh`) — напишите «готов подключиться по SSH, скажи команду».

**Не присылайте root-пароль в чат**, если можно обойтись ключом. Временный пароль — только если без него никак, и потом смените.

### 2. Домен

В DNS домена (Timeweb или где куплен):

| Тип | Имя | Значение |
|-----|-----|----------|
| A | `@` или поддомен | IP VPS |
| A | `www` | IP VPS (если нужен www) |

Дождитесь пропагации (обычно 5–30 мин, иногда до 24 ч).

### 3. Секреты (на сервере, не в Git)

На VPS создайте `.env.production` из шаблона:

```bash
cp .env.production.example .env.production
```

Заполните:

```bash
openssl rand -base64 32   # для AUTH_SECRET
# POSTGRES_PASSWORD — длинный случайный пароль
```

Файл **не коммитится** — только на сервере.

### 4. GitHub

Репозиторий уже на GitHub. На сервере:

```bash
git clone https://github.com/jackytheawesome/furniture.git
cd furniture
```

Для приватного репо — deploy key или personal access token на сервере.

---

## Пошаговый деплой (первый раз)

Выполняется **на VPS** (Ubuntu 22.04/24.04).

### Шаг 1. Базовая настройка сервера

```bash
git clone https://github.com/jackytheawesome/furniture.git
cd furniture
sudo bash deploy/setup-server.sh
```

Установит Docker, Nginx, Certbot, Git.

### Шаг 2. Переменные окружения

```bash
cp .env.production.example .env.production
nano .env.production
```

### Шаг 3. Запуск приложения и базы

```bash
bash deploy/deploy.sh
```

При старте контейнера выполняется `prisma migrate deploy`.

### Шаг 4. Первичный seed (один раз)

```bash
bash deploy/seed.sh
```

Создаёт demo/admin и прайс Ренессанс. **На production смените пароли** или уберите demo из `prisma/seed.ts`.

### Шаг 5. Nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/korpus-smeta
sudo sed -i "s/DOMAIN/your-domain.ru/g" /etc/nginx/sites-available/korpus-smeta
sudo ln -sf /etc/nginx/sites-available/korpus-smeta /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Проверка: `http://your-domain.ru/login`

### Шаг 6. HTTPS

```bash
sudo certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

Certbot сам пропишет SSL в Nginx.

---

## Обновление после изменений в коде

На сервере в каталоге репозитория:

```bash
git pull
bash deploy/deploy.sh
```

---

## Локальная разработка

```bash
docker compose up -d          # только Postgres
cp .env.example .env          # DATABASE_URL на localhost:5432
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

---

## Чеклист «готово к релизу»

- [ ] A-запись домена → IP VPS
- [ ] `.env.production` на сервере (`POSTGRES_*`, `AUTH_SECRET`)
- [ ] `docker compose -f docker-compose.prod.yml up` — контейнеры healthy
- [ ] `prisma db seed` выполнен (или свои пользователи)
- [ ] Nginx проксирует на `127.0.0.1:3000`
- [ ] HTTPS через certbot
- [ ] Логин на `https://ваш-домен/login`
- [ ] Demo-пароли сменены или demo-аккаунты убраны

---

## Что уже в репозитории

| Файл | Назначение |
|------|------------|
| `Dockerfile` | Production-сборка Next.js standalone |
| `docker-compose.yml` | Локальный Postgres |
| `docker-compose.prod.yml` | Postgres + app на VPS |
| `deploy/nginx.conf` | Шаблон Nginx |
| `deploy/setup-server.sh` | Первичная настройка Ubuntu |
| `deploy/deploy.sh` | `git pull` + rebuild |
| `.env.production.example` | Шаблон секретов для сервера |

---

## Типичные проблемы Timeweb

**Сайт не открывается** — проверьте A-запись, `ufw` / файрвол Timeweb (80, 443, 22).

**502 Bad Gateway** — приложение не запущено: `docker compose -f docker-compose.prod.yml ps` и логи `docker compose -f docker-compose.prod.yml logs app`.

**Ошибка миграций** — логи app при старте; проверьте `DATABASE_URL` и что Postgres healthy.

**502 / seed libssl.so.1.1** — образ на Alpine; в `Dockerfile` используется `node:20-bookworm-slim`. Пересоберите: `bash deploy/deploy.sh`.
