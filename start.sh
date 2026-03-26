#!/bin/bash

# Start script for On-Call Tracker
# Starts backend and frontend servers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Create PID directory
mkdir -p "$PID_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting On-Call Tracker${NC}"
echo ""

# Check if already running
if [ -f "$BACKEND_PID_FILE" ] && ps -p $(cat "$BACKEND_PID_FILE") > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend is already running (PID: $(cat "$BACKEND_PID_FILE"))${NC}"
    echo "   Use ./stop.sh to stop it first"
    exit 1
fi

if [ -f "$FRONTEND_PID_FILE" ] && ps -p $(cat "$FRONTEND_PID_FILE") > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Frontend is already running (PID: $(cat "$FRONTEND_PID_FILE"))${NC}"
    echo "   Use ./stop.sh to stop it first"
    exit 1
fi

# Check PostgreSQL
echo "📊 Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo "   Please start PostgreSQL first:"
    echo "   brew services start postgresql@15"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Check database exists
echo "📊 Checking database..."
DB_EXISTS=$(psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -w oncall_tracker | wc -l)
if [ $DB_EXISTS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Database 'oncall_tracker' does not exist, creating...${NC}"
    createdb oncall_tracker 2>/dev/null || {
        echo -e "${RED}❌ Failed to create database${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo -e "${GREEN}✅ Database exists${NC}"
fi

# Start Backend
echo ""
echo "🔧 Starting Backend..."
cd "$SCRIPT_DIR/backend"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found, creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi

# Set environment variables
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/oncall_tracker"
export SECRET_KEY="local-dev-secret-key"

# Initialize database if needed
python init_db.py > /dev/null 2>&1

# Start backend in background
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$SCRIPT_DIR/.pids/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$BACKEND_PID_FILE"
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Logs: $SCRIPT_DIR/.pids/backend.log"

# Wait a bit for backend to start
sleep 2

# Check if backend is actually running
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start!${NC}"
    echo "   Check logs: $SCRIPT_DIR/.pids/backend.log"
    rm -f "$BACKEND_PID_FILE"
    exit 1
fi

# Start Frontend
echo ""
echo "🌐 Starting Frontend..."
cd "$SCRIPT_DIR/frontend"

# Start frontend in background
nohup python3 -m http.server 3000 > "$SCRIPT_DIR/.pids/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$FRONTEND_PID_FILE"
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Logs: $SCRIPT_DIR/.pids/frontend.log"

# Wait a bit for frontend to start
sleep 1

# Check if frontend is actually running
if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend failed to start!${NC}"
    echo "   Check logs: $SCRIPT_DIR/.pids/frontend.log"
    rm -f "$FRONTEND_PID_FILE"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ On-Call Tracker is running!${NC}"
echo ""
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Frontend: http://localhost:3000"
echo ""
echo "   To stop: ./stop.sh"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
