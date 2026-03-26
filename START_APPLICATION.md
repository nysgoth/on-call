# Как да стартираш приложението

Това ръководство обяснява как да стартираш On-Call Tracker приложението локално.

## 📋 Бърз старт

### Вариант 1: С готовите скриптове (Най-лесно и препоръчително)

```bash
# Стартирай всичко
./start.sh

# Спри всичко
./stop.sh
```

**Какво прави `start.sh`:**
- ✅ Проверява дали PostgreSQL работи
- ✅ Проверява/създава базата данни
- ✅ Стартира backend в background
- ✅ Стартира frontend в background
- ✅ Запазва PID файлове за лесно спиране

**Какво прави `stop.sh`:**
- ✅ Спира backend процеса
- ✅ Спира frontend процеса
- ✅ Почиства PID файлове
- ✅ Освобождава портовете 8000 и 3000

**Логове:**
- Backend логове: `.pids/backend.log`
- Frontend логове: `.pids/frontend.log`

---

### Вариант 2: С Docker

```bash
# Стартирай всички услуги (backend, frontend, database)
docker-compose up -d

# Инициализирай базата данни с примерни потребители
docker-compose exec backend python init_db.py

# Отвори в браузър
# Frontend: http://localhost:3000
# Backend API Docs: http://localhost:8000/docs
```

**За да спреш:**
```bash
docker-compose down
```

---

### Вариант 2: Без Docker (Ръчно)

#### Стъпка 1: Стартирай PostgreSQL

Ако PostgreSQL не работи:
```bash
# macOS (с Homebrew)
brew services start postgresql@15

# Или ръчно
pg_ctl -D /usr/local/var/postgresql@15 start
```

#### Стъпка 2: Стартирай Backend

**В първи терминал:**
```bash
cd backend

# Активирай virtual environment
source venv/bin/activate  # macOS/Linux
# или
venv\Scripts\activate  # Windows

# Настрой environment variables
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/oncall_tracker"
export SECRET_KEY="local-dev-secret-key"

# Стартирай backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend ще работи на: **http://localhost:8000**

#### Стъпка 3: Стартирай Frontend

**В втори терминал:**
```bash
cd frontend

# Стартирай прост HTTP сървър
python3 -m http.server 3000  # macOS/Linux
# или
python -m http.server 3000   # Windows
```

Frontend ще работи на: **http://localhost:3000**

---

### Вариант 3: Използвай готовите скриптове

#### Backend:
```bash
./start_local.sh
```

#### Frontend:
```bash
./start_frontend.sh
```

---

## 🔍 Проверка

### Проверка на Backend:
```bash
# Тест на API
curl http://localhost:8000/docs

# Или отвори в браузър
open http://localhost:8000/docs
```

### Проверка на Frontend:
```bash
# Отвори в браузър
open http://localhost:3000
```

---

## 👤 Демо потребители

След инициализация на базата данни (`init_db.py`), използвай:

- **Инженер:** `engineer1` / `engineer123`
- **Мениджър:** `manager1` / `manager123`
- **Админ:** `admin1` / `admin123`

---

## 🛑 Спиране на приложението

### Ако използваш Docker:
```bash
docker-compose down
```

### Ако използваш ръчно стартиране:

**Backend:**
- Натисни `Ctrl+C` в терминала където работи uvicorn

**Frontend:**
- Натисни `Ctrl+C` в терминала където работи http.server

**Или спри процесите:**
```bash
# Спри backend
pkill -f "uvicorn.*8000"

# Спри frontend
pkill -f "http.server.*3000"
```

---

## ⚙️ Настройки

### Database Connection

Backend автоматично използва:
- **Локално:** `postgresql://[username]@localhost:5432/oncall_tracker`
- **Azure:** Чрез `DATABASE_URL` environment variable

### Frontend API URL

Frontend използва `config.js`:
- **Локално:** `http://localhost:8000`
- **Azure:** `https://[your-app-service].azurewebsites.net`

---

## 🐛 Troubleshooting

### Backend не стартира

1. Провери дали PostgreSQL работи:
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. Провери дали базата данни съществува:
   ```bash
   psql -l | grep oncall_tracker
   ```

3. Провери дали virtual environment е активиран:
   ```bash
   which python  # Трябва да покаже venv/bin/python
   ```

### Frontend не може да се свърже с backend

1. Провери дали backend работи:
   ```bash
   curl http://localhost:8000/docs
   ```

2. Провери `frontend/config.js` - трябва да сочи към `http://localhost:8000`

3. Провери конзолата на браузъра (F12) за CORS грешки

### Базата данни не работи

1. Провери дали PostgreSQL е стартиран
2. Провери дали базата `oncall_tracker` съществува:
   ```bash
   psql -l | grep oncall_tracker
   ```
3. Ако не съществува, създай я:
   ```bash
   createdb oncall_tracker
   psql -d oncall_tracker -f database/schema.sql
   python backend/init_db.py
   ```

---

## 📝 Полезни команди

### Проверка на процесите:
```bash
# Виж дали backend работи
lsof -i :8000

# Виж дали frontend работи
lsof -i :3000

# Виж дали PostgreSQL работи
lsof -i :5432
```

### Проверка на логове:
```bash
# Backend логове (ако използваш Docker)
docker-compose logs -f backend

# Или директно в терминала където работи uvicorn
```

### Рестарт на базата данни:
```bash
# Ако използваш Docker
docker-compose restart postgres

# Или локално
brew services restart postgresql@15
```

---

## 🚀 Production Deployment

За production deployment в Azure, виж `AZURE_MIGRATION_GUIDE.md`.

---

**Последна актуализация:** 8 януари 2026
