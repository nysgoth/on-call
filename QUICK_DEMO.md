# Бърз Azure Demo Setup (2 часа валидност)

Това е бърза версия за demo акаунти с ограничена валидност.

## ⚡ Бърз процес (~5-10 минути):

1. **Login (30 секунди):**
   ```bash
   ./scripts/azure-demo-setup-with-login.sh
   ```
   - Скриптът ще покаже код
   - Отиди на https://microsoft.com/devicelogin
   - Въведи кода и се впиши
   - Скриптът ще продължи автоматично

2. **Скриптът автоматично създава (3-5 минути):**
   - Resource Group
   - Storage Account (frontend)
   - Container Instance с PostgreSQL
   - App Service (backend)
   - Конфигурира всичко
   - Upload-ва frontend

3. **След това (2-3 минути):**
   - Deploy backend код
   - Initialize database

## ⏱️ Общо време: ~5-10 минути

## Важно за demo акаунти:

- ✅ Login отнема ~30 секунди
- ✅ Създаването на ресурси отнема ~3-5 минути
- ✅ Всичко е автоматизирано след login
- ⚠️ Ако акаунтът изтече, просто логни се отново с `az login`

## След setup:

Скриптът ще покаже:
- Frontend URL
- Backend URL  
- Database connection info

След това deploy-ни backend и initialize database - готово за демо!

