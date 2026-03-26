#!/bin/bash

# Stop script for On-Call Tracker
# Stops backend and frontend servers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping On-Call Tracker...${NC}"
echo ""

# Stop Backend
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔧 Stopping Backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
                break
            fi
            sleep 0.5
        done
        
        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Force killing backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null
        fi
        
        echo -e "${GREEN}✅ Backend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend process not found (may have already stopped)${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${YELLOW}⚠️  Backend PID file not found${NC}"
fi

# Also kill any remaining uvicorn processes on port 8000
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "🔧 Killing remaining processes on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Stop Frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🌐 Stopping Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
                break
            fi
            sleep 0.5
        done
        
        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Force killing frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null
        fi
        
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend process not found (may have already stopped)${NC}"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo -e "${YELLOW}⚠️  Frontend PID file not found${NC}"
fi

# Also kill any remaining http.server processes on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "🌐 Killing remaining processes on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Clean up PID directory if empty
if [ -d "$PID_DIR" ] && [ -z "$(ls -A "$PID_DIR" 2>/dev/null)" ]; then
    rmdir "$PID_DIR" 2>/dev/null
fi

echo ""
echo -e "${GREEN}✅ On-Call Tracker stopped${NC}"
