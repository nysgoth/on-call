#!/bin/bash
# Test connections between Frontend, Backend, and Database

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Testing Connections ===${NC}"
echo ""

# Get resource group
RESOURCE_GROUP=$(az group list --query "[0].name" -o tsv 2>/dev/null || echo "")
if [ -z "$RESOURCE_GROUP" ]; then
    echo -e "${RED}No resource group found${NC}"
    exit 1
fi

# Get resources
WEBAPP_NAME=$(az webapp list --resource-group "$RESOURCE_GROUP" --query "[?contains(name, 'oncall-api')].name" -o tsv | head -1)
STORAGE_NAME=$(az storage account list --resource-group "$RESOURCE_GROUP" --query "[?contains(name, 'oncall')].name" -o tsv | head -1)
CONTAINER_NAME=$(az container list --resource-group "$RESOURCE_GROUP" --query "[?contains(name, 'postgres')].name" -o tsv | head -1)

if [ -z "$WEBAPP_NAME" ]; then
    echo -e "${RED}Backend not found${NC}"
    exit 1
fi

if [ -z "$STORAGE_NAME" ]; then
    echo -e "${RED}Frontend not found${NC}"
    exit 1
fi

if [ -z "$CONTAINER_NAME" ]; then
    echo -e "${YELLOW}Database container not found${NC}"
fi

BACKEND_URL="https://$WEBAPP_NAME.azurewebsites.net"
FRONTEND_URL=$(az storage account show --name "$STORAGE_NAME" --resource-group "$RESOURCE_GROUP" --query "primaryEndpoints.web" -o tsv | sed 's|/$||')
CONTAINER_IP=$(az container show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_NAME" --query ipAddress.ip -o tsv 2>/dev/null || echo "")

echo -e "${GREEN}Backend:${NC} $BACKEND_URL"
echo -e "${GREEN}Frontend:${NC} $FRONTEND_URL"
if [ -n "$CONTAINER_IP" ]; then
    echo -e "${GREEN}Database:${NC} $CONTAINER_IP:5432"
fi
echo ""

# Test 1: Backend is accessible
echo -e "${YELLOW}[1/3] Testing Backend...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/docs" | grep -q "200"; then
    echo -e "${GREEN}  ✓ Backend is accessible${NC}"
else
    echo -e "${RED}  ✗ Backend is not accessible${NC}"
    echo "  Status: $(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/docs")"
fi

# Test 2: Frontend is accessible
echo -e "${YELLOW}[2/3] Testing Frontend...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}  ✓ Frontend is accessible${NC}"
else
    echo -e "${RED}  ✗ Frontend is not accessible${NC}"
    echo "  Status: $(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")"
fi

# Test 3: Backend -> Database
echo -e "${YELLOW}[3/3] Testing Backend -> Database...${NC}"
if [ -n "$CONTAINER_IP" ]; then
    # Check if backend can connect to database
    DB_STATUS=$(az webapp log tail --name "$WEBAPP_NAME" --resource-group "$RESOURCE_GROUP" 2>&1 | grep -i "database\|connection\|error" | head -5 || echo "")
    if [ -n "$DB_STATUS" ]; then
        echo "  Database connection logs:"
        echo "$DB_STATUS"
    else
        echo -e "${YELLOW}  ⚠ Check backend logs manually${NC}"
    fi
    
    # Test direct connection
    if nc -z -w 5 "$CONTAINER_IP" 5432 2>/dev/null; then
        echo -e "${GREEN}  ✓ Database port is open${NC}"
    else
        echo -e "${YELLOW}  ⚠ Cannot test database connection directly (may be firewall restricted)${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ Database container not found${NC}"
fi

echo ""
echo -e "${YELLOW}=== CORS Check ===${NC}"
echo "Backend CORS settings:"
az webapp config appsettings list --resource-group "$RESOURCE_GROUP" --name "$WEBAPP_NAME" --query "[?name=='CORS_ORIGINS'].{Name:name, Value:value}" -o table 2>/dev/null || echo "  CORS_ORIGINS not set (using default *)"

echo ""
echo -e "${YELLOW}=== Frontend Config ===${NC}"
echo "Frontend config.js should point to: $BACKEND_URL"
curl -s "$FRONTEND_URL/config.js" | head -3 || echo "  Cannot fetch config.js"

echo ""
echo -e "${YELLOW}=== Summary ===${NC}"
echo "1. Open Frontend: $FRONTEND_URL"
echo "2. Check browser console for CORS errors"
echo "3. Check backend logs: az webapp log tail --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP"
echo ""

