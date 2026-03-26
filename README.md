# On-Call Tracker

Вътрешно уеб приложение за тракване на on-call инциденти с централизирана база данни и удобен UI за екипа и мениджърите.

## 📋 Съдържание

- [Функционалности](#функционалности)
- [Архитектура](#архитектура)
- [Изисквания](#изисквания)
- [Инсталация](#инсталация)
- [Конфигурация](#конфигурация)
- [Използване](#използване)
- [API Документация](#api-документация)
- [Deployment](#deployment)

## 🎯 Функционалности

### За инженери:
- ✅ Създаване на нови инциденти
- ✅ Преглед на лични инциденти
- ✅ Редактиране на собствени инциденти (докато не са прегледани)
- ✅ Статус: Прегледан / Непрегледан

### За мениджъри:
- ✅ Преглед на всички инциденти
- ✅ Филтриране по:
  - Дата (от/до)
  - Инженер
  - Статус на преглед
  - Сериозност
- ✅ Маркиране на инциденти като прегледани
- ✅ Преглед на детайли

### За администратори:
- ✅ Всички права на мениджър
- ✅ Изтриване на инциденти
- ✅ Пълен достъп до системата

### Допълнителни функции:
- ✅ Пагинация
- ✅ Сортиране по дата
- ✅ Audit log (история на промените)
- ✅ RESTful API
- ✅ JWT автентикация

## 🏗️ Архитектура

```
on-call_tracker/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # API endpoints
│   │   ├── models.py    # Database models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── auth.py      # Authentication
│   │   └── database.py  # DB connection
│   ├── requirements.txt
│   ├── Dockerfile
│   └── init_db.py       # Initialize sample users
├── frontend/             # HTML/JS frontend
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── Dockerfile
├── database/
│   └── schema.sql       # PostgreSQL schema
├── docker-compose.yml
└── README.md
```

## 📦 Изисквания

- Docker и Docker Compose (за Docker deployment)
- ИЛИ:
  - Python 3.11+
  - PostgreSQL 15+
  - Модерен уеб браузър

## 🚀 Инсталация

### Вариант 1: Docker (Препоръчителен)

1. **Клонирайте проекта** (или използвайте текущата директория)

2. **Стартирайте с Docker Compose:**
```bash
docker-compose up -d
```

3. **Инициализирайте базата данни с примерни потребители:**
```bash
docker-compose exec backend python init_db.py
```

4. **Отворете браузър:**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs
   - API: http://localhost:8000

### Вариант 2: Локална инсталация

1. **Инсталирайте PostgreSQL и създайте база данни:**
```bash
createdb oncall_tracker
psql oncall_tracker < database/schema.sql
```

2. **Настройте backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Настройте environment променливи:**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oncall_tracker"
export SECRET_KEY="your-secret-key"
```

4. **Инициализирайте базата данни:**
```bash
python init_db.py
```

5. **Стартирайте backend:**
```bash
uvicorn app.main:app --reload
```

6. **Стартирайте frontend:**
   - Отворете `frontend/index.html` в браузър
   - ИЛИ използвайте прост HTTP сървър:
```bash
cd frontend
python -m http.server 3000
```

## ⚙️ Конфигурация

### Environment променливи

Създайте `.env` файл в root директорията:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oncall_tracker
SECRET_KEY=your-secret-key-change-in-production
```

### Промяна на API URL в frontend

В `frontend/app.js`, променете:
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

## 👤 Използване

### Генериране на демо данни

За да попълните базата данни с примерни инциденти за последния месец:

```bash
# Използвайки Docker
./generate_demo.sh

# Или директно
docker-compose exec backend python /app/generate_demo_incidents.py
```

Скриптът:
- ✅ Генерира по един инцидент на ден за последните 30 дни
- ✅ Използва произволни инженери, типове инциденти и приоритети
- ✅ Пропуска дати, които вече имат инциденти (безопасно за многократно изпълнение)
- ✅ Създава инциденти с реалистични описания и решения
- ✅ 60% от инцидентите са автоматично маркирани като прегледани

**Важно:** Скриптът може да се изпълнява многократно - той автоматично пропуска дати, които вече имат инциденти.

### Демо потребители

След инициализация на базата данни, използвайте:

- **Инженер:** `engineer1` / `engineer123`
- **Мениджър:** `manager1` / `manager123`
- **Администратор:** `admin1` / `admin123`

### Работен процес

1. **Инженер създава инцидент:**
   - Влиза с инженерски акаунт
   - Попълва формата за нов инцидент
   - Запазва

2. **Мениджър преглежда:**
   - Влиза с мениджърски акаунт
   - Вижда всички инциденти
   - Филтрира по "Непрегледани"
   - Маркира като прегледан

3. **Администратор управлява:**
   - Има пълен достъп
   - Може да изтрива инциденти
   - Вижда всички данни

## 📚 API Документация

### Endpoints

#### Автентикация
- `POST /auth/login` - Вход и получаване на токен
- `GET /auth/me` - Информация за текущия потребител

#### Инциденти
- `POST /incidents` - Създаване на инцидент
- `GET /incidents` - Списък с филтри и пагинация
- `GET /incidents/{id}` - Детайли за инцидент
- `PUT /incidents/{id}` - Обновяване на инцидент
- `PATCH /incidents/{id}/review` - Маркиране като прегледан
- `DELETE /incidents/{id}` - Изтриване (admin only)
- `GET /incidents/{id}/audit` - Audit log за инцидент

### Query параметри за GET /incidents

- `skip` - Брой пропуснати записи (за пагинация)
- `limit` - Брой записи на страница (max 1000)
- `date_from` - Филтър от дата (YYYY-MM-DD)
- `date_to` - Филтър до дата (YYYY-MM-DD)
- `on_call_engineer` - Филтър по инженер
- `manager_reviewed` - Филтър по статус (true/false)
- `severity` - Филтър по сериозност (1-5)
- `sort_by` - Сортиране по (incident_start, created_at, severity)
- `sort_order` - Посока (asc, desc)

### Примерни заявки

```bash
# Вход
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "engineer1", "password": "engineer123"}'

# Създаване на инцидент
curl -X POST http://localhost:8000/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_start": "2024-01-15T10:00:00",
    "on_call_engineer": "engineer1",
    "incident_type": "outage",
    "severity": 3,
    "description": "Service outage"
  }'

# Списък с филтри
curl "http://localhost:8000/incidents?manager_reviewed=false&severity=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Интерактивна документация

След стартиране на backend, отворете:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🐳 Deployment

### Production Docker Setup

1. **Обновете секретните ключове:**
   - Променете `SECRET_KEY` в `docker-compose.yml`
   - Променете паролите за PostgreSQL

2. **Настройте CORS:**
   В `backend/app/main.py`, променете:
   ```python
   allow_origins=["https://your-domain.com"]
   ```

3. **Стартирайте:**
```bash
docker-compose up -d
```

4. **Проверете логове:**
```bash
docker-compose logs -f
```

### Production Best Practices

- ✅ Използвайте environment променливи за секрети
- ✅ Настройте SSL/TLS (HTTPS)
- ✅ Ограничете CORS origins
- ✅ Използвайте production-ready PostgreSQL настройки
- ✅ Настройте backup за базата данни
- ✅ Мониторинг и логиране
- ✅ Rate limiting за API

## 🗄️ База данни

### Схема

Основната таблица `incidents` съдържа:
- `id` - UUID идентификатор
- `incident_start` - Начало на инцидента
- `incident_end` - Край на инцидента
- `on_call_engineer` - Име на инженер
- `incident_type` - Тип (outage, alert, performance, etc.)
- `severity` - Сериозност (1-5)
- `description` - Описание
- `resolution` - Решение
- `manager_reviewed` - Статус на преглед
- `manager_reviewed_at` - Дата на преглед
- `manager_name` - Име на мениджър
- `created_at` - Дата на създаване
- `updated_at` - Дата на обновяване

### Audit Log

Таблицата `incident_audit_log` записва всички промени:
- `action` - Действие (CREATE, UPDATE, DELETE, REVIEW)
- `changed_by` - Кой е направил промяната
- `old_values` - Стари стойности (JSON)
- `new_values` - Нови стойности (JSON)

## 🔒 Сигурност

- JWT токен базирана автентикация
- Ролева авторизация (engineer, manager, admin)
- Пароли се хешират с bcrypt
- SQL injection защита (SQLAlchemy ORM)
- CORS настройки

## 🛠️ Разработка

### Добавяне на нов endpoint

1. Добавете schema в `app/schemas.py`
2. Добавете endpoint в `app/main.py`
3. Тествайте в Swagger UI

### Добавяне на нова роля

1. Обновете `models.User.role` constraint
2. Добавете проверка в endpoint-ите
3. Обновете frontend логиката

## 📝 Лиценз

Вътрешно корпоративно приложение.

## 🤝 Поддръжка

За въпроси и проблеми, моля свържете се с екипа за разработка.

---

**Версия:** 1.0.0  
**Последна актуализация:** 2024

