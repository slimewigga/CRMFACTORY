# ☁️ Деплой в облако — Деньги-Бабки CRM

Пошаговая инструкция, чтобы вы с другом заходили с любого устройства через интернет.

---

## Вариант 1: Render.com (рекомендуем)

Render — простой хостинг для Node.js. Нужен GitHub-аккаунт.

### Шаг 1. Залей проект на GitHub

1. Создай репозиторий на [github.com](https://github.com/new) (например `dengi-babki-crm`)
2. В папке проекта открой терминал:

```bash
git init
git add .
git commit -m "Initial CRM"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЛОГИН/dengi-babki-crm.git
git push -u origin main
```

### Шаг 2. Создай сервис на Render

1. Зайди на [render.com](https://render.com) → **Sign Up** (через GitHub)
2. **New +** → **Blueprint** (или **Web Service**)
3. Подключи репозиторий `dengi-babki-crm`
4. Render подхватит `render.yaml` автоматически

### Шаг 3. Настрой переменные

В Render → твой сервис → **Environment**:

| Переменная   | Значение |
|-------------|----------|
| `JWT_SECRET` | длинная случайная строка (32+ символов) |
| `DB_PATH`    | `/var/data/crm.db` |

`JWT_SECRET` можно сгенерировать: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Шаг 4. Подключи диск (важно!)

Без диска база **сбросится** при каждом перезапуске.

1. Render → твой сервис → **Disks** → **Add Disk**
2. Mount Path: `/var/data`
3. Size: 1 GB

### Шаг 5. Деплой

Нажми **Deploy**. Через 2–3 минуты получишь URL вида:
`https://dengi-babki-crm.onrender.com`

**Первый вход:** `admin` / `admin123` — сразу смени пароль!

---

## Вариант 2: Railway.app

1. [railway.app](https://railway.app) → Login with GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Выбери репозиторий
4. **Variables** → добавь `JWT_SECRET`
5. **Settings** → **Generate Domain**
6. Для сохранения БД: **Add Volume**, mount `/data`, `DB_PATH=/data/crm.db`

---

## Вариант 3: Docker (VPS / любой сервер)

Если есть VPS (Timeweb, Hetzner, DigitalOcean):

```bash
# На сервере
git clone https://github.com/ТВОЙ_ЛОГИН/dengi-babki-crm.git
cd dengi-babki-crm

# Создай .env
cp .env.example .env
# Отредактируй JWT_SECRET

docker build -t dengi-babki .
docker run -d -p 3000:3000 -v crm-data:/data --env-file .env --name crm dengi-babki
```

Сайт будет на `http://IP_СЕРВЕРА:3000`

---

## После деплоя

1. Зайди как **admin** / **admin123**
2. Админ-панель → смени пароль admin
3. Друг регистрируется на `/` (вкладка «Регистрация»)
4. Работаете вместе — одна база, одни идеи и задачи

---

## Бесплатный тариф Render

- Сервис «засыпает» после 15 мин без активности
- Первый заход после сна — ~30 сек загрузка
- Диск на бесплатном плане **недоступен** → для постоянной БД нужен **Starter ($7/мес)** или Railway

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| Данные пропали после деплоя | Подключи persistent disk / volume |
| 502 Bad Gateway | Подожди 1–2 мин, проверь логи в Render |
| Не могу войти | Проверь что `JWT_SECRET` задан |
| better-sqlite3 ошибка сборки | Node 20, в Dockerfile уже есть build tools |

---

*Удачи, перцы! 🚀*
