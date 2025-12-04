#!/bin/bash

# POS Location Sync API Test Script
# Usage: ./test-pos-sync-api.sh <storeCode> <apiKey>

STORE_CODE=${1:-"LOC001"}
API_KEY=${2:-"api_key_123"}
BASE_URL=${3:-"http://localhost:3000"}

echo "=========================================="
echo "POS Location Sync API Test Script"
echo "=========================================="
echo "Store Code: $STORE_CODE"
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$BASE_URL$endpoint" \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$BASE_URL$endpoint" \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# 1. Authentication Tests
echo "=========================================="
echo "1. Authentication Tests"
echo "=========================================="

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE" "" "Valid API Key Authentication"

# Test invalid API key
echo -e "${YELLOW}Testing: Invalid API Key${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/pos/sync/location/$STORE_CODE" \
    -H "x-api-key: invalid_key" \
    -H "Content-Type: application/json")
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" -eq 401 ]; then
    echo -e "${GREEN}✓ Correctly rejected invalid API key${NC}"
else
    echo -e "${RED}✗ Should return 401 for invalid key${NC}"
fi
echo ""

# 2. Location Info Tests
echo "=========================================="
echo "2. Location Information Sync Tests"
echo "=========================================="

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE" "" "GET Location Info"

test_endpoint "POST" "/api/pos/sync/location/$STORE_CODE" \
    '{"phone": "+1987654321", "email": "test@example.com"}' \
    "POST Location Update"

# 3. Comprehensive Data Sync Tests
echo "=========================================="
echo "3. Comprehensive Store Data Sync Tests"
echo "=========================================="

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE/data" "" "GET All Store Data (Full Sync)"

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE/data?incremental=true&lastSyncAt=2024-01-01T00:00:00Z" "" "GET All Store Data (Incremental Sync)"

test_endpoint "POST" "/api/pos/sync/location/$STORE_CODE/data" \
    '{
        "data": {
            "menu_items": [
                {
                    "menuItemCode": "TEST001",
                    "name": "Test Item",
                    "cashPrice": 9.99,
                    "cardPrice": 10.99,
                    "isActive": 1,
                    "storeCode": "'$STORE_CODE'"
                }
            ]
        },
        "conflictStrategy": "last-write-wins"
    }' \
    "POST Bulk Data Update"

# 4. Table-Specific Sync Tests
echo "=========================================="
echo "4. Table-Specific Sync Tests"
echo "=========================================="

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE/menu_items" "" "GET Menu Items"

test_endpoint "GET" "/api/pos/sync/location/$STORE_CODE/menu_items?limit=5&offset=0" "" "GET Menu Items with Pagination"

test_endpoint "POST" "/api/pos/sync/location/$STORE_CODE/menu_items" \
    '{
        "data": {
            "menuItemCode": "TEST002",
            "name": "New Test Item",
            "cashPrice": 8.99,
            "isActive": 1,
            "storeCode": "'$STORE_CODE'"
        },
        "operation": "upsert"
    }' \
    "POST Menu Item (Upsert)"

# 5. Conflict Resolution Tests
echo "=========================================="
echo "5. Conflict Resolution Tests"
echo "=========================================="

test_endpoint "POST" "/api/pos/sync/location/$STORE_CODE/menu_items" \
    '{
        "data": {
            "menuItemCode": "TEST001",
            "name": "Updated from POS",
            "cashPrice": 11.99
        },
        "conflictStrategy": "pos-wins"
    }' \
    "POST with POS-Wins Strategy"

test_endpoint "POST" "/api/pos/sync/location/$STORE_CODE/menu_items" \
    '{
        "data": {
            "menuItemCode": "TEST001",
            "name": "Should be rejected",
            "cashPrice": 12.99
        },
        "conflictStrategy": "server-wins"
    }' \
    "POST with Server-Wins Strategy"

echo "=========================================="
echo "Test Script Completed"
echo "=========================================="

