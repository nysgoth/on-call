# Стъпки след изпълнение на setup скрипта

## Стъпка 1: Скриптът ще покаже информация

След като скриптът приключи, той ще покаже:
- Resource names (App Service, SQL Server, Storage Account)
- GitHub Secrets които трябва да добавиш
- Azure credentials JSON
- Database connection string

**ВАЖНО:** Запиши всичко това!

## Стъпка 2: Добави GitHub Secrets

Отиди в GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Добави следните secrets (от изхода на скрипта):

### 1. AZURE_CREDENTIALS
Копирай **цялото съдържание** на файла `azure_credentials.json`:
- Отвори файла `azure_credentials.json` в проекта
- Копирай целия JSON (включително всички кавички и скоби)
- Постави го като стойност на secret `AZURE_CREDENTIALS`

### 2. SQL_ADMIN_PASSWORD
Паролата за SQL Server admin (показана в изхода на скрипта)

### 3. SECRET_KEY
Secret key за JWT tokens (показан в изхода на скрипта)

### 4. STORAGE_ACCOUNT_NAME
Името на Storage Account (показано в изхода на скрипта)

### 5. STORAGE_ACCOUNT_KEY
Ключът на Storage Account (показан в изхода на скрипта)

## Стъпка 3: Обнови Workflow файла

Отвори `.github/workflows/azure-deploy-codecloud.yml` и обнови environment variables:

```yaml
env:
  AZURE_WEBAPP_NAME: oncall-api-xxxxx    # От скрипта
  AZURE_RESOURCE_GROUP: oncall-tracker-rg  # От скрипта
  AZURE_LOCATION: westeurope             # От скрипта
  SQL_SERVER_NAME: oncall-sql-xxxxx     # От скрипта
  SQL_DATABASE_NAME: oncall_tracker
  STORAGE_ACCOUNT_NAME: oncallxxxxx      # От скрипта
```

## Стъпка 4: ⚠️ Адаптирай кода за Azure SQL Database

**ВАЖНО:** Приложението използва PostgreSQL, но Code Cloud не разрешава PostgreSQL. Трябва да адаптираш кода за Azure SQL Database.

### 4.1 Обнови requirements.txt

Добави `pyodbc` и може да оставиш `psycopg2-binary` за local development:

```txt
pyodbc==5.0.1
```

### 4.2 Обнови backend/app/models.py

Промени UUID типове:

```python
# Преди (PostgreSQL):
from sqlalchemy.dialects.postgresql import UUID
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

# След (SQL Server):
from sqlalchemy import String
id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
```

Това трябва да се направи за всички таблици:
- User.id
- Incident.id
- IncidentAuditLog.id
- PasswordResetRequest.id
- IncidentAuditLog.incident_id
- PasswordResetRequest.user_id

### 4.3 Обнови backend/app/database.py

Промени connection string format (но може да остане като environment variable):

```python
# SQL Server connection string format:
# mssql+pyodbc://user:password@server.database.windows.net:1433/database?driver=ODBC+Driver+17+for+SQL+Server
```

### 4.4 Обнови всички места където се използва UUID

В `backend/app/main.py` и други файлове, където се използва `uuid.UUID()`, промени на `str()`.

## Стъпка 5: Commit и Push

```bash
git add .
git commit -m "Add Azure Code Cloud deployment configuration"
git push origin main
```

## Стъпка 6: Проверка на Deployment

1. Отиди в GitHub → **Actions** tab
2. Виж workflow run-а "Deploy to Azure (Code Cloud)"
3. След успешен deployment:
   - Backend: `https://YOUR_WEBAPP_NAME.azurewebsites.net`
   - Frontend: `https://YOUR_STORAGE_ACCOUNT_NAME.z13.web.core.windows.net`

## Стъпка 7: Инициализация на Database

След първия deployment, трябва да инициализираш database schema.

### Вариант A: Чрез Azure Cloud Shell

```bash
# Connect to database
az sql db show-connection-string \
  --server YOUR_SQL_SERVER_NAME \
  --name oncall_tracker \
  --client ado.net

# Използвай connection string за да се свържеш и изпълниш schema.sql
```

### Вариант B: Чрез Python скрипт

Създай скрипт който използва SQL Server connection и изпълнява schema.

## Troubleshooting

### "Resource name already exists"
Избери друго име за ресурса при следващо изпълнение на скрипта.

### "Authentication failed"
Провери че credentials-ите от Code Cloud са правилни.

### "Database connection fails"
- Провери firewall rules в SQL Server
- Провери connection string format
- Провери че database е създаден

### "Frontend не се показва"
- Провери static website hosting е enabled
- Провери файловете са upload-нати в `$web` container

## Нужна помощ?

Ако имаш проблеми, провери:
- GitHub Actions logs
- Azure Portal → App Service → Log stream
- Azure Portal → SQL Database → Query editor

