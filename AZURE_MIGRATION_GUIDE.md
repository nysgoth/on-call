# Azure Migration Guide - On-Call Tracker

Това ръководство обяснява как да мигрираш приложението On-Call Tracker в Azure App Service с PostgreSQL база данни.

## 📋 Съдържание

1. [Подготовка в Azure Portal](#1-подготовка-в-azure-portal)
2. [Промени в кода](#2-промени-в-кода)
3. [Connection String формат](#3-connection-string-формат)
4. [Environment Variables в Azure App Service](#4-environment-variables-в-azure-app-service)
5. [Промени във frontend](#5-промени-във-frontend)
6. [Деплой на Backend](#6-деплой-на-backend)
7. [Деплой на Frontend](#7-деплой-на-frontend)
8. [Инициализация на базата](#8-инициализация-на-базата)
9. [Настройки за PostgreSQL](#9-настройки-за-postgresql)
10. [Проверка](#10-проверка)
11. [Резюме на промените](#11-резюме-на-промените)
12. [Допълнителни съвети](#12-допълнителни-съвети)

---

## 1. Подготовка в Azure Portal

### 1.1 Създаване на PostgreSQL база данни

1. Отиди в **Azure Portal** → **Create a resource**
2. Търси **Azure Database for PostgreSQL**
3. Избери **Flexible Server** (препоръчително) или **Single Server**
4. Попълни формата:
   - **Subscription**: Избери твоя subscription
   - **Resource Group**: Създай нов или използвай съществуващ
   - **Server name**: Напр. `oncall-tracker-db` (трябва да е уникално)
   - **Region**: Избери най-близкия регион
   - **PostgreSQL version**: 15 (препоръчително)
   - **Workload type**: Development (за тестване) или Production
   - **Compute + storage**: Избери подходящ план (Basic_B1ms е достатъчно за начало)

5. В **Administrator account**:
   - **Admin username**: Напр. `adminuser` (не може да бъде `postgres`, `azure_superuser`, `azure_pg_admin`, `admin`, `administrator`, `root`, `guest`, или `public`)
   - **Password**: Създай силна парола (запиши я!)

6. В **Networking**:
   - **Public access**: Allow public access from any Azure service within Azure's IP range
   - Или добави конкретни IP адреси

7. Създай базата и **запиши**:
   - Server name (напр. `oncall-tracker-db.postgres.database.azure.com`)
   - Admin username
   - Password
   - Database name (ще създадеш по-късно или използвай `postgres` за начало)

### 1.2 Създаване на база данни

1. След като сървърът е създаден, отиди в **Azure Database for PostgreSQL** → **Databases**
2. Кликни **+ Add** и създай база с име: `oncall_tracker`

### 1.3 Създаване на App Service

1. Отиди в **Azure Portal** → **Create a resource**
2. Търси **Web App**
3. Попълни формата:
   - **Subscription**: Избери твоя subscription
   - **Resource Group**: Използвай същия като за PostgreSQL
   - **Name**: Напр. `oncall-tracker-api` (трябва да е уникално)
   - **Publish**: Code
   - **Runtime stack**: Python 3.11
   - **Operating System**: Linux
   - **Region**: Избери същия регион като PostgreSQL (за по-ниска латентност)
   - **App Service Plan**: Създай нов или използвай съществуващ

4. Създай App Service и **запиши**:
   - App Service name (напр. `oncall-tracker-api.azurewebsites.net`)

---

## 2. Промени в кода

**Добра новина:** Приложението вече е конфигурирано да използва environment variables, така че **няма нужда от промени в кода**!

Приложението автоматично чете:
- `DATABASE_URL` от environment variable (виж `backend/app/database.py`)
- `CORS_ORIGINS` от environment variable (виж `backend/app/main.py`)
- `SECRET_KEY` от environment variable

---

## 3. Connection String формат

### 3.1 Формат на Connection String

В Azure App Service → Configuration → Application Settings, добави:

```
DATABASE_URL=postgresql://[username]:[password]@[server-name].postgres.database.azure.com:5432/[database-name]?sslmode=require
```

### 3.2 Пример

Ако имаш:
- Server name: `oncall-tracker-db.postgres.database.azure.com`
- Username: `adminuser`
- Password: `MySecurePassword123!`
- Database name: `oncall_tracker`

Connection string-ът ще бъде:

```
DATABASE_URL=postgresql://adminuser:MySecurePassword123!@oncall-tracker-db.postgres.database.azure.com:5432/oncall_tracker?sslmode=require
```

**⚠️ ВАЖНО:** 
- Винаги добавяй `?sslmode=require` в края за SSL връзка
- Не използвай специални символи в паролата без да ги encode-неш (напр. `@` трябва да стане `%40`)

### 3.3 URL Encoding на специални символи

Ако паролата ти съдържа специални символи, трябва да ги encode-неш:

| Символ | Encoded |
|--------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| `:` | `%3A` |

**Пример:** Ако паролата е `P@ssw0rd#123`, connection string-ът ще бъде:
```
DATABASE_URL=postgresql://adminuser:P%40ssw0rd%23123@oncall-tracker-db.postgres.database.azure.com:5432/oncall_tracker?sslmode=require
```

---

## 4. Environment Variables в Azure App Service

### 4.1 Настройка на Application Settings

1. Отиди в **Azure Portal** → **App Service** → **Configuration** → **Application settings**
2. Кликни **+ New application setting** и добави следните:

#### DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://[username]:[password]@[server-name].postgres.database.azure.com:5432/[database-name]?sslmode=require
```

#### SECRET_KEY
```
Name: SECRET_KEY
Value: [генерирай-силна-секретна-ключ-тук]
```

За да генерираш SECRET_KEY, можеш да използваш:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### CORS_ORIGINS
```
Name: CORS_ORIGINS
Value: https://[your-frontend-url].azurewebsites.net,https://[your-custom-domain]
```

Ако frontend-ът е на друг домейн, добави всички домейни разделени със запетая.

**Пример:**
```
CORS_ORIGINS=https://oncall-tracker-frontend.azurewebsites.net,https://oncall-tracker.example.com
```

#### WEBSITES_PORT
```
Name: WEBSITES_PORT
Value: 8000
```

Това казва на Azure App Service на кой порт работи приложението.

### 4.2 Запазване на настройките

След като добавиш всички настройки, кликни **Save** в горната част на страницата. Azure ще рестартира приложението автоматично.

---

## 5. Промени във frontend

### 5.1 Промяна на API URL

Отвори файла `frontend/config.js` и промени `API_BASE_URL`:

**Преди:**
```javascript
const API_BASE_URL = "http://localhost:8000";
```

**След:**
```javascript
const API_BASE_URL = "https://[your-app-service-name].azurewebsites.net";
```

**Пример:**
```javascript
const API_BASE_URL = "https://oncall-tracker-api.azurewebsites.net";
```

### 5.2 Важно за CORS

Увери се, че `CORS_ORIGINS` в App Service включва URL-а на frontend-а ти. Ако frontend-ът е на друг домейн, трябва да го добавиш.

---

## 6. Деплой на Backend

### 6.1 Вариант 1: Azure CLI (Препоръчително)

#### Предварителни изисквания:
```bash
# Инсталирай Azure CLI ако нямаш
# macOS:
brew install azure-cli

# Windows:
# Изтегли от https://aka.ms/installazurecliwindows

# Linux:
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

#### Деплой:
```bash
# Login в Azure
az login

# Отиди в backend директорията
cd backend

# Деплой на приложението
az webapp up \
  --name [your-app-service-name] \
  --resource-group [your-resource-group] \
  --runtime "PYTHON:3.11" \
  --sku B1
```

**Пример:**
```bash
az webapp up \
  --name oncall-tracker-api \
  --resource-group oncall-tracker-rg \
  --runtime "PYTHON:3.11" \
  --sku B1
```

### 6.2 Вариант 2: Zip Deploy

```bash
# Отиди в backend директорията
cd backend

# Създай zip файл (без venv и cache)
zip -r deploy.zip . \
  -x "venv/*" \
  -x "__pycache__/*" \
  -x "*.pyc" \
  -x "*.log"

# Деплой
az webapp deployment source config-zip \
  --resource-group [your-resource-group] \
  --name [your-app-service-name] \
  --src deploy.zip
```

### 6.3 Вариант 3: GitHub Actions (CI/CD)

1. Push кода в GitHub repository
2. В Azure Portal → App Service → Deployment Center
3. Избери **GitHub** като source
4. Авторизирай и избери repository и branch
5. Azure автоматично ще деплойва при всеки push

### 6.4 Настройка на Startup Command

В Azure Portal → App Service → Configuration → General settings:

**Startup Command:**
```bash
gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

Или по-просто:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 7. Деплой на Frontend

### 7.1 Вариант 1: Azure Static Web Apps (Препоръчително)

1. В Azure Portal → Create a resource → Static Web App
2. Попълни формата:
   - **Name**: Напр. `oncall-tracker-frontend`
   - **Resource Group**: Използвай същия
   - **Region**: Избери регион
   - **Source**: GitHub, Azure DevOps, или Other
3. Ако използваш GitHub:
   - Авторизирай GitHub
   - Избери repository и branch
   - Build details:
     - **App location**: `/frontend`
     - **Api location**: (остави празно)
     - **Output location**: `/frontend`
4. След деплой, вземи URL-а и обнови `CORS_ORIGINS` в backend App Service

### 7.2 Вариант 2: Azure Storage Account (Static Website)

1. Създай Storage Account в Azure Portal
2. Отиди в **Data management** → **Static website**
3. Enable static website
4. **Index document name**: `index.html`
5. **Error document path**: `index.html`
6. Запиши **Primary endpoint** URL-а
7. Upload файловете от `frontend/` директорията:
   ```bash
   # Инсталирай Azure Storage Explorer или използвай Azure CLI
   az storage blob upload-batch \
     --account-name [storage-account-name] \
     --source ./frontend \
     --destination '$web' \
     --overwrite
   ```

### 7.3 Вариант 3: App Service (за SPA)

Ако искаш да използваш App Service за frontend:

1. Създай нов App Service (същите стъпки като за backend)
2. В **Configuration** → **General settings**:
   - **Startup Command**: 
     ```bash
     python3 -m http.server 8000
     ```
3. Upload файловете от `frontend/` директорията

---

## 8. Инициализация на базата

### 8.1 Вариант 1: Чрез App Service Console

1. В Azure Portal → App Service → **Console**
2. Изпълни:
   ```bash
   cd /home/site/wwwroot
   python init_db.py
   ```

### 8.2 Вариант 2: Локално с Azure connection string

```bash
# Експортирай connection string-а
export DATABASE_URL="postgresql://[username]:[password]@[server-name].postgres.database.azure.com:5432/[database-name]?sslmode=require"

# Отиди в backend директорията
cd backend

# Активирай virtual environment (ако имаш)
source venv/bin/activate  # macOS/Linux
# или
venv\Scripts\activate  # Windows

# Изпълни init скрипта
python init_db.py
```

### 8.3 Вариант 3: Чрез psql (ако имаш достъп)

```bash
# Свържи се към Azure PostgreSQL
psql -h [server-name].postgres.database.azure.com \
     -U [username] \
     -d [database-name] \
     -p 5432

# В psql конзолата, изпълни schema.sql
\i database/schema.sql

# Или изпълни init_db.py чрез Python
```

---

## 9. Настройки за PostgreSQL

### 9.1 Firewall Rules

1. В Azure Portal → PostgreSQL server → **Connection security**
2. **Allow access to Azure services**: ON
3. Ако App Service не може да се свърже, добави неговия outbound IP:
   - В App Service → **Properties** → **Outbound IP addresses**
   - Добави тези IP адреси в PostgreSQL → **Connection security** → **Firewall rules**

### 9.2 SSL Connection

Azure PostgreSQL изисква SSL връзки по подразбиране. Затова винаги добавяй `?sslmode=require` в connection string-а.

### 9.3 Performance Tiers

За production, препоръчително е да използваш поне:
- **General Purpose**: 2 vCores, 10GB storage (минимум)
- За по-голямо натоварване, увеличавай според нуждите

---

## 10. Проверка

### 10.1 Проверка на Backend

1. Отвори в браузър: `https://[your-app-service-name].azurewebsites.net/docs`
2. Трябва да видиш Swagger UI документацията
3. Тествай някой endpoint (напр. `/api/health` ако имаш такъв)

### 10.2 Проверка на Frontend

1. Отвори frontend URL-а
2. Опитай се да се логнеш
3. Провери конзолата на браузъра (F12) за грешки

### 10.3 Проверка на Логове

1. В Azure Portal → App Service → **Log stream**
2. Виж реално време логове
3. Или отиди в **Logs** → **Application Logging** за исторически логове

### 10.4 Проверка на Database Connection

В App Service Console:
```bash
cd /home/site/wwwroot
python -c "from app.database import engine; engine.connect(); print('Connection OK')"
```

---

## 11. Резюме на промените

### 11.1 Файлове, които ТРЯБВА да промениш:

1. **`frontend/config.js`**
   - Промени `API_BASE_URL` на Azure App Service URL
   - Пример: `const API_BASE_URL = "https://oncall-tracker-api.azurewebsites.net";`

### 11.2 Настройки в Azure Portal:

1. **App Service → Configuration → Application settings:**
   - `DATABASE_URL` - PostgreSQL connection string
   - `SECRET_KEY` - Секретен ключ за JWT токени
   - `CORS_ORIGINS` - Frontend URL-и (разделени със запетая)
   - `WEBSITES_PORT` - 8000

### 11.3 Файлове, които НЕ трябва да променяш:

- ✅ `backend/app/database.py` - Вече използва `DATABASE_URL` от environment
- ✅ `backend/app/main.py` - Вече използва `CORS_ORIGINS` от environment
- ✅ Всички други backend файлове

---

## 12. Допълнителни съвети

### 12.1 Безопасност

1. **Използвай Azure Key Vault** за секрети вместо да ги слагаш директно в Application Settings
2. **Използвай Managed Identity** за връзка с PostgreSQL (по-безопасно от пароли)
3. **Включи HTTPS** за всички връзки
4. **Регулярно обновявай** зависимостите

### 12.2 Мониторинг

1. **Application Insights**: Включи за детайлни метрики и логове
2. **Alerts**: Настрой alerts за грешки и високо натоварване
3. **Log Analytics**: Използвай за анализ на логове

### 12.3 Performance

1. **CDN**: Използвай Azure CDN за frontend статични файлове
2. **Caching**: Настрой кеширане за статични ресурси
3. **Database Connection Pooling**: SQLAlchemy вече използва connection pooling

### 12.4 Scaling

1. **Vertical Scaling**: Увеличавай App Service Plan tier при нужда
2. **Horizontal Scaling**: Използвай App Service Plan с multiple instances
3. **Auto-scaling**: Настрой auto-scaling според метрики

### 12.5 Backup

1. **Database Backups**: Azure PostgreSQL автоматично прави backups
2. **App Service Backups**: Настрой регулярни backups на App Service
3. **Configuration Backups**: Запази копие на Application Settings

### 12.6 Custom Domain

1. В App Service → **Custom domains**
2. Добави custom domain
3. Настрой DNS записи според инструкциите
4. Включи SSL/TLS certificate (Azure предоставя безплатни сертификати)

---

## 13. Често срещани проблеми

### 13.1 "Connection refused" или "Timeout"

**Решение:**
- Провери firewall rules в PostgreSQL
- Увери се, че `Allow access to Azure services` е ON
- Провери дали connection string-ът е правилен

### 13.2 "SSL connection required"

**Решение:**
- Добави `?sslmode=require` в края на `DATABASE_URL`

### 13.3 CORS грешки

**Решение:**
- Провери `CORS_ORIGINS` в App Service settings
- Увери се, че frontend URL-ът е включен
- Провери дали frontend използва правилния API URL

### 13.4 "Module not found" при деплой

**Решение:**
- Увери се, че `requirements.txt` е в root на backend директорията
- Провери дали всички зависимости са включени

### 13.5 App Service не стартира

**Решение:**
- Провери **Log stream** за грешки
- Провери **Startup Command** в Configuration
- Увери се, че `WEBSITES_PORT` е правилно настроен

---

## 14. Полезни команди

### 14.1 Azure CLI

```bash
# Проверка на App Service статус
az webapp show --name [app-name] --resource-group [rg-name] --query state

# Рестарт на App Service
az webapp restart --name [app-name] --resource-group [rg-name]

# Виж логове
az webapp log tail --name [app-name] --resource-group [rg-name]

# Виж Application Settings
az webapp config appsettings list --name [app-name] --resource-group [rg-name]

# Обнови Application Setting
az webapp config appsettings set \
  --name [app-name] \
  --resource-group [rg-name] \
  --settings DATABASE_URL="[new-connection-string]"
```

### 14.2 Проверка на връзката

```bash
# Тест на PostgreSQL връзка от локална машина
psql "postgresql://[username]:[password]@[server-name].postgres.database.azure.com:5432/[database-name]?sslmode=require"

# Тест на API endpoint
curl https://[app-name].azurewebsites.net/docs
```

---

## 15. Следващи стъпки

1. ✅ Настрой production environment
2. ✅ Настрой CI/CD pipeline
3. ✅ Добави monitoring и alerts
4. ✅ Настрой custom domain
5. ✅ Направи backup стратегия
6. ✅ Документирай deployment процеса за екипа

---

## 16. Поддръжка

Ако срещнеш проблеми:
1. Провери логовете в Azure Portal
2. Провери Application Insights (ако е включен)
3. Провери документацията на Azure
4. Провери GitHub issues на използваните библиотеки

---

**Последна актуализация:** 8 януари 2026

**Версия:** 1.0
