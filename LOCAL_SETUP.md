# Локална инсталация (без Docker)

Ако Docker не работи или предпочитате локална инсталация, следвайте тези стъпки.

## 📋 Изисквания

1. **PostgreSQL 15+**
   - Инсталация: https://www.postgresql.org/download/
   - Или с Homebrew: `brew install postgresql@15`
   - Стартирайте: `brew services start postgresql@15`

2. **Python 3.11+**
   - Проверете: `python3 --version`
   - Инсталация: https://www.python.org/downloads/

## 🚀 Бърз старт

### Вариант 1: Автоматичен скрипт

```bash
# Стартирайте backend
./start_local.sh

# В друг терминал, стартирайте frontend
./start_frontend.sh
```

### Вариант 2: Ръчна инсталация

#### Стъпка 1: Настройка на базата данни

```bash
# Създайте база данни
createdb oncall_tracker

# Или ако използвате друг потребител:
psql -U postgres -c "CREATE DATABASE oncall_tracker;"

# Инициализирайте схемата
psql -U postgres -d oncall_tracker -f database/schema.sql
```

#### Стъпка 2: Настройка на backend

```bash
cd backend

# Създайте virtual environment
python3 -m venv venv

# Активирайте го
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Инсталирайте зависимости
pip install -r requirements.txt

# Настройте environment променливи
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oncall_tracker"
export SECRET_KEY="your-secret-key-change-in-production"

# Инициализирайте примерни потребители
python init_db.py

# Стартирайте backend
uvicorn app.main:app --reload
```

Backend ще работи на: **http://localhost:8000**

#### Стъпка 3: Стартиране на frontend

В нов терминал:

```bash
cd frontend

# Стартирайте прост HTTP сървър
python3 -m http.server 3000
```

Frontend ще работи на: **http://localhost:3000**

## 🔧 Конфигурация

### Промяна на database URL

Ако използвате различен потребител или парола за PostgreSQL:

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/oncall_tracker"
```

### Промяна на API URL в frontend

Ако backend работи на различен порт, редактирайте `frontend/app.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000';  // Променете порта ако е необходимо
```

## ✅ Проверка

1. Отворете http://localhost:3000
2. Влезте с:
   - Инженер: `engineer1` / `engineer123`
   - Мениджър: `manager1` / `manager123`
   - Админ: `admin1` / `admin123`

## 🐛 Често срещани проблеми

### PostgreSQL не е стартиран

```bash
# macOS (Homebrew)
brew services start postgresql@15

# Или ръчно
pg_ctl -D /usr/local/var/postgresql@15 start
```

### Грешка при свързване с базата данни

Проверете дали PostgreSQL работи:
```bash
psql -U postgres -c "SELECT version();"
```

Ако не работи, проверете:
- Дали PostgreSQL сървърът е стартиран
- Дали потребителят и паролата са правилни
- Дали базата данни съществува

### Порт 8000 или 3000 е зает

Променете порта в командите:
```bash
# Backend на друг порт
uvicorn app.main:app --reload --port 8001

# Frontend на друг порт
python3 -m http.server 3001
```

И обновете `API_BASE_URL` в `frontend/app.js`.

### Python модули не се намират

Уверете се, че virtual environment е активиран:
```bash
source venv/bin/activate  # macOS/Linux
# или
venv\Scripts\activate  # Windows
```

## 📝 Полезни команди

```bash
# Проверка на PostgreSQL статус
brew services list | grep postgresql

# Рестартиране на PostgreSQL
brew services restart postgresql@15

# Преглед на логове на backend
# (логовете се показват в терминала където работи uvicorn)

# Изчистване на базата данни (внимание!)
psql -U postgres -d oncall_tracker -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql -U postgres -d oncall_tracker -f database/schema.sql
```

## 🎯 Следващи стъпки

След като приложението работи, вижте:
- [README.md](README.md) за пълна документация
- [API.md](API.md) за API документация
- http://localhost:8000/docs за интерактивна API документация

