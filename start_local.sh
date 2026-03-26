#!/bin/bash

# Local startup script (without Docker)
# This script helps you start the application locally

echo "🚀 Starting On-Call Tracker (Local Mode)"
echo ""

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не е инсталиран или не е в PATH"
    echo "Инсталирайте PostgreSQL: https://www.postgresql.org/download/"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 не е намерен"
    exit 1
fi

echo "📦 Проверка на зависимости..."
echo ""

# Check database
DB_NAME="oncall_tracker"
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w $DB_NAME | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "📊 Създаване на база данни..."
    createdb $DB_NAME 2>/dev/null || psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Базата данни е създадена"
        echo "📝 Инициализиране на схема..."
        psql -U postgres -d $DB_NAME -f database/schema.sql
    else
        echo "❌ Грешка при създаване на базата данни"
        echo "Опитайте ръчно: createdb oncall_tracker"
        exit 1
    fi
else
    echo "✅ Базата данни вече съществува"
fi

# Setup backend
echo ""
echo "🔧 Настройване на backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "📦 Създаване на virtual environment..."
    python3 -m venv venv
fi

echo "📥 Инсталиране на зависимости..."
source venv/bin/activate
pip install -q -r requirements.txt

# Set environment variables
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/oncall_tracker}"
export SECRET_KEY="${SECRET_KEY:-your-secret-key-change-in-production}"

# Initialize users if needed
echo ""
echo "👤 Проверка на потребители..."
python init_db.py

echo ""
echo "✅ Backend е готов!"
echo ""
echo "🌐 Стартиране на backend сървър..."
echo "   Backend ще работи на: http://localhost:8000"
echo "   API документация: http://localhost:8000/docs"
echo ""
echo "📝 В друг терминал, стартирайте frontend:"
echo "   cd frontend"
echo "   python3 -m http.server 3000"
echo ""
echo "   След това отворете: http://localhost:3000"
echo ""
echo "⚠️  За да спрете сървъра, натиснете Ctrl+C"
echo ""

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

