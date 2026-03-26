# Автоматизиран Azure Setup

Това ръководство обяснява как да използваш напълно автоматизирания setup скрипт.

## Какво прави скриптът автоматично:

✅ Създава всички Azure ресурси  
✅ Генерира всички имена и пароли  
✅ Конфигурира GitHub secrets (ако GitHub CLI е инсталиран)  
✅ Обновява workflow файла с правилните имена  
✅ Показва всички необходими URLs  

## Предварителни изисквания:

1. **Azure CLI** инсталиран
2. **GitHub CLI** (опционално, за автоматично конфигуриране на secrets)
   ```bash
   # macOS
   brew install gh
   gh auth login
   
   # Linux
   # See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
   ```

## Стъпка 1: Изпълни скрипта

```bash
chmod +x scripts/azure-setup-auto.sh
./scripts/azure-setup-auto.sh
```

## Стъпка 2: Въведи само 4-те credentials

Скриптът ще попита за:
1. **IAM Username** - от Code Cloud playground
2. **IAM Password** - от Code Cloud playground  
3. **Application Client ID** - от Code Cloud playground
4. **Client Secret** - от Code Cloud playground

**Това е всичко!** Скриптът ще направи останалото автоматично.

## Стъпка 3: Скриптът автоматично:

1. ✅ Логва те в Azure
2. ✅ Генерира уникални имена за всички ресурси
3. ✅ Създава Resource Group
4. ✅ Създава App Service Plan (F1 - безплатно)
5. ✅ Създава Web App за backend
6. ✅ Създава SQL Server и Database
7. ✅ Създава Storage Account за frontend
8. ✅ Конфигурира static website hosting
9. ✅ Генерира всички secrets и пароли
10. ✅ Обновява workflow файла автоматично
11. ✅ Конфигурира GitHub secrets (ако GitHub CLI е инсталиран)

## Стъпка 4: Проверка

След като скриптът приключи, той ще покаже:
- Всички създадени ресурси
- URLs за backend и frontend
- Информация за GitHub secrets (ако не са конфигурирани автоматично)

## Ако GitHub CLI не е инсталиран:

Скриптът ще покаже готовите команди за ръчно добавяне на secrets в GitHub.

Или инсталирай GitHub CLI:
```bash
brew install gh
gh auth login
```

След това изпълни скрипта отново - той ще конфигурира secrets автоматично!

## След setup:

1. **Commit промените:**
   ```bash
   git add .github/workflows/azure-deploy-codecloud.yml
   git commit -m "Configure Azure deployment"
   git push
   ```

2. **Адаптирай кода за Azure SQL Database** (виж CODE_CLOUD_SETUP.md)

3. **Push към GitHub** - deployment ще започне автоматично!

## Troubleshooting

### "Resource name already exists"
Скриптът генерира уникални имена автоматично, но ако все пак получиш тази грешка, просто изпълни скрипта отново - той ще генерира нови имена.

### "GitHub CLI not authenticated"
```bash
gh auth login
```

### "Workflow file not found"
Увери се че си в root директорията на проекта.

## Готово! 🎉

Скриптът направи всичко автоматично. Просто commit и push промените!

