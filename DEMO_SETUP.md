# Прост Azure Demo Setup

Това е най-простият начин да подкараш приложението за демо в Azure.

## Стъпка 1: Изпълни скрипта

```bash
./scripts/azure-demo-setup.sh
```

Въведи само 4-те credentials от Code Cloud.

## Стъпка 2: Скриптът ще създаде:

- ✅ Container Instance с PostgreSQL (без промени в кода!)
- ✅ App Service за backend (F1 - безплатно)
- ✅ Storage Account за frontend

## Стъпка 3: Deploy backend

```bash
# Deploy backend code
cd backend
az webapp deployment source config-zip \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_WEBAPP_NAME \
  --src ../backend.zip
```

## Стъпка 4: Initialize database

```bash
# Connect to database and run schema
psql -h CONTAINER_IP -U postgres -d oncall_tracker -f ../database/schema.sql
```

Или използвай init_db.py скрипта с правилния DATABASE_URL.

## Готово!

Отвори frontend URL-а в браузъра.

## Важно:

- Container Instance спира след 1 час неактивност
- За production използвай правилна база данни
- Това е само за демо!

