# Бърз старт

## 🚀 Най-бърз начин да стартирате приложението

### С Docker (Препоръчително)

```bash
# 1. Стартирайте всички услуги
docker-compose up -d

# 2. Изчакайте няколко секунди за инициализация на базата данни

# 3. Създайте примерни потребители
docker-compose exec backend python init_db.py

# 4. Отворете браузър
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Без Docker

```bash
# 1. Инсталирайте PostgreSQL и създайте база данни
createdb oncall_tracker
psql oncall_tracker < database/schema.sql

# 2. Настройте backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Настройте environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oncall_tracker"
export SECRET_KEY="your-secret-key"

# 4. Инициализирайте потребители
python init_db.py

# 5. Стартирайте backend
uvicorn app.main:app --reload

# 6. В друг терминал, стартирайте frontend
cd frontend
python -m http.server 3000

# 7. Отворете http://localhost:3000
```

## 👤 Демо потребители

След изпълнение на `init_db.py`:

- **Инженер:** `engineer1` / `engineer123`
- **Мениджър:** `manager1` / `manager123`
- **Админ:** `admin1` / `admin123`

## ✅ Проверка

1. Влезте с инженерски акаунт
2. Създайте нов инцидент
3. Влезте с мениджърски акаунт
4. Вижте всички инциденти и маркирайте като прегледан

## 🛠️ Полезни команди

```bash
# Вижте логове
docker-compose logs -f

# Спрете услугите
docker-compose down

# Премахнете всичко (включително данни)
docker-compose down -v

# Рестартирайте услуга
docker-compose restart backend
```

## 📝 Следващи стъпки

Вижте [README.md](README.md) за пълна документация.

