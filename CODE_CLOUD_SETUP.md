# Azure Setup за Code Cloud Playground

Това ръководство обяснява как да деплойнеш приложението в Azure Code Cloud playground, използвайки само разрешените ресурси.

## ⚠️ Важно: Промени в архитектурата

Code Cloud playground **НЕ разрешава**:
- ❌ PostgreSQL Flexible Server
- ❌ Static Web Apps

Затова използваме:
- ✅ **Azure SQL Database** (Basic или S0) вместо PostgreSQL
- ✅ **Storage Account** за frontend hosting вместо Static Web Apps
- ✅ **App Service** (F1 или B1) за backend

## ⚠️ Необходими промени в кода

Тъй като приложението използва PostgreSQL, а ние използваме Azure SQL Database, **трябва да адаптираме кода**:

1. Промени в `backend/app/models.py` - UUID типове
2. Промени в `backend/requirements.txt` - добави `pyodbc` вместо `psycopg2-binary`
3. Промени в connection string format

**Алтернатива:** Може да използваш Container Instance с PostgreSQL, но това е по-сложно.

## Стъпка 1: Изпълни Setup Script

```bash
chmod +x scripts/azure-setup-codecloud.sh
./scripts/azure-setup-codecloud.sh
```

Скриптът ще попита за:
1. IAM Username от Code Cloud
2. IAM Password от Code Cloud
3. Application Client ID от Code Cloud
4. Client Secret от Code Cloud
5. Tenant ID (опционално)

След това ще създаде:
- Resource Group
- App Service Plan (F1 или B1)
- App Service за backend
- Azure SQL Server и Database
- Storage Account за frontend

## Стъпка 2: Адаптирай кода за Azure SQL Database

### 2.1 Обнови requirements.txt

Добави `pyodbc` и премахни `psycopg2-binary`:

```txt
pyodbc==5.0.1
```

### 2.2 Обнови models.py

Промени UUID типове от PostgreSQL на SQL Server:

```python
# Преди:
from sqlalchemy.dialects.postgresql import UUID
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

# След:
from sqlalchemy import String
id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
```

### 2.3 Обнови database.py

Промени connection string format за SQL Server.

## Стъпка 3: GitHub Secrets

Добави в GitHub repository → Settings → Secrets:

1. **AZURE_CREDENTIALS** - от `azure_credentials.json`
2. **SQL_ADMIN_PASSWORD** - генерирана парола
3. **SECRET_KEY** - генериран secret key
4. **STORAGE_ACCOUNT_NAME** - име на storage account
5. **STORAGE_ACCOUNT_KEY** - ключ на storage account

## Стъпка 4: Обнови Workflow

Използвай `.github/workflows/azure-deploy-codecloud.yml` вместо `azure-deploy.yml`.

Обнови environment variables с имената от setup скрипта.

## Стъпка 5: Deploy

Push към GitHub и workflow-ът ще деплойне автоматично.

## URLs след deployment

- **Backend:** `https://YOUR_WEBAPP_NAME.azurewebsites.net`
- **Frontend:** `https://YOUR_STORAGE_ACCOUNT_NAME.z13.web.core.windows.net`
- **Database:** `YOUR_SQL_SERVER_NAME.database.windows.net`

## Troubleshooting

### Database connection fails
- Провери firewall rules в SQL Server
- Провери connection string format
- Провери че database е създаден

### Frontend не се показва
- Провери static website hosting е enabled в Storage Account
- Провери файловете са upload-нати в `$web` container

### Backend не работи
- Провери App Service logs
- Провери environment variables
- Провери database connection string

## Cost Estimation

За Code Cloud playground:
- **App Service F1:** Безплатно (с ограничения)
- **App Service B1:** ~$13/месец
- **SQL Database Basic:** ~$5/месец
- **Storage Account:** ~$0.02/GB/месец
- **Total:** ~$5-18/месец

## Допълнителни ресурси

- [Azure SQL Database Documentation](https://docs.microsoft.com/azure/azure-sql/)
- [Storage Account Static Website](https://docs.microsoft.com/azure/storage/blobs/storage-blob-static-website)
- [App Service Documentation](https://docs.microsoft.com/azure/app-service/)

