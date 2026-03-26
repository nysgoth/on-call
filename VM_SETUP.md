# Azure VM Setup Guide

Това ръководство обяснява как да създадеш 2 виртуални машини в Azure - една за PostgreSQL база данни и една за Backend + Frontend приложение.

## Стъпки

### 1. Създаване на VMs

Изпълни скрипта за създаване на виртуалните машини:

```bash
bash scripts/azure-vm-setup.sh
```

Скриптът ще:
- Провери Azure login
- Създаде VNet и Network Security Groups
- Създаде 2 VMs:
  - `oncall-postgres-vm` - за PostgreSQL база данни
  - `oncall-app-vm` - за Backend + Frontend приложение
- Инсталира PostgreSQL на първата VM
- Генерира пароли за VMs и PostgreSQL

**Важно:** Запиши паролите които се показват! Ще ги използваш за deployment.

### 2. Изчакване на PostgreSQL инсталация

Изчакай 2-3 минути след създаването на VMs, за да завърши инсталацията на PostgreSQL.

### 3. Deployment на приложението

След като VMs са готови, изпълни deployment скрипта:

```bash
./scripts/deploy-to-vm.sh \
  <APP_VM_IP> \
  <VM_ADMIN_USER> \
  <VM_ADMIN_PASSWORD> \
  <POSTGRES_IP> \
  <POSTGRES_PASSWORD>
```

**Пример:**
```bash
./scripts/deploy-to-vm.sh \
  20.123.45.67 \
  oncalladmin \
  'MySecurePassword123!' \
  20.123.45.68 \
  'PostgresPassword123!'
```

Скриптът ще:
- Копира backend и frontend файлове на App VM
- Инсталира Python 3.11, nginx, и други зависимости
- Създаде systemd service за backend
- Конфигурира nginx като reverse proxy
- Инициализира базата данни
- Стартира всички услуги

### 4. Доступ до приложението

След deployment, приложението ще бъде достъпно на:

- **Frontend:** `http://<APP_VM_IP>`
- **Backend API Docs:** `http://<APP_VM_IP>/api/docs`
- **Backend API:** `http://<APP_VM_IP>/api`

## Структура

```
VM 1 (PostgreSQL):
  - IP: <POSTGRES_IP>
  - Port: 5432
  - Database: oncall_tracker
  - User: postgres
  - Password: <POSTGRES_PASSWORD>

VM 2 (App):
  - IP: <APP_VM_IP>
  - Backend: Port 8000 (вътрешно)
  - Frontend: Port 80 (публично)
  - Nginx: Reverse proxy
```

## Проверка на статуса

### Проверка на PostgreSQL VM:
```bash
ssh <VM_ADMIN_USER>@<POSTGRES_IP>
sudo systemctl status postgresql
```

### Проверка на App VM:
```bash
ssh <VM_ADMIN_USER>@<APP_VM_IP>
sudo systemctl status oncall-backend
sudo systemctl status nginx
```

### Проверка на логове:
```bash
# Backend logs
sudo journalctl -u oncall-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Backend не стартира:
1. Провери дали PostgreSQL е достъпен:
   ```bash
   psql -h <POSTGRES_IP> -U postgres -d oncall_tracker
   ```

2. Провери логове:
   ```bash
   sudo journalctl -u oncall-backend -n 50
   ```

3. Провери environment variables:
   ```bash
   cat /opt/oncall/backend/.env
   ```

### Frontend не зарежда:
1. Провери nginx конфигурация:
   ```bash
   sudo nginx -t
   ```

2. Провери дали файловете са на правилното място:
   ```bash
   ls -la /opt/oncall/frontend/
   ```

3. Провери nginx логове:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### База данни не работи:
1. Провери дали PostgreSQL слуша на правилния порт:
   ```bash
   sudo netstat -tlnp | grep 5432
   ```

2. Провери pg_hba.conf:
   ```bash
   sudo cat /etc/postgresql/*/main/pg_hba.conf | grep 10.0.0
   ```

## Изтриване на ресурси

За да изтриеш всички създадени ресурси:

```bash
az vm delete --resource-group kml_rg_main-8c28ed8811d04c0e --name oncall-postgres-vm --yes
az vm delete --resource-group kml_rg_main-8c28ed8811d04c0e --name oncall-app-vm --yes
az network public-ip delete --resource-group kml_rg_main-8c28ed8811d04c0e --name ip-postgres
az network public-ip delete --resource-group kml_rg_main-8c28ed8811d04c0e --name ip-app
az network nsg delete --resource-group kml_rg_main-8c28ed8811d04c0e --name nsg-postgres
az network nsg delete --resource-group kml_rg_main-8c28ed8811d04c0e --name nsg-app
az network vnet delete --resource-group kml_rg_main-8c28ed8811d04c0e --name oncall-vnet
```

## Бележки

- VMs използват Standard_B1s (PostgreSQL) и Standard_B2s (App) - достатъчно за демо
- PostgreSQL е конфигуриран да приема връзки от VNet (10.0.0.0/24)
- Nginx служи като reverse proxy за backend API
- Backend работи като systemd service за автоматично рестартиране
- Всички пароли се генерират автоматично и се показват в output-а

