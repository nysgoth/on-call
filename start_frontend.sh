#!/bin/bash

# Start frontend server
echo "🌐 Стартиране на frontend сървър..."
echo ""
echo "Frontend ще работи на: http://localhost:3000"
echo ""
echo "⚠️  За да спрете сървъра, натиснете Ctrl+C"
echo ""

cd frontend
python3 -m http.server 3000

