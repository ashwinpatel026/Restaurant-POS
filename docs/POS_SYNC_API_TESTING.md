# POS Location Sync API Testing Scenarios

This document provides comprehensive testing scenarios for the POS Location Sync APIs.

## Prerequisites

1. **Environment Setup**

   - Set up API keys in `.env` file:
     ```env
     POS_API_KEYS=LOC001:api_key_123,LOC002:api_key_456
     POS_JWT_SECRET=your-jwt-secret-key
     ```
   - Ensure test location exists in Master DB with `storeCode` (e.g., "LOC001")
   - Location must be active (`isActive = 1`) and sync enabled (`syncEnabled = 1`)

2. **Test Store Code**

   - Use a valid `storeCode` from your database (e.g., "LOC001")

3. **Authentication Methods**
   - **API Key**: Use header `x-api-key` or `api-key`, or query param `api_key`
   - **JWT Token**: Use `Authorization: Bearer <token>`

---

## Test Scenarios

### 1. Authentication Tests

#### 1.1 Test Valid API Key Authentication

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 200 OK with location data

#### 1.2 Test Invalid API Key

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: invalid_key" \
  -H "Content-Type: application/json"
```

**Expected**: 401 Unauthorized with error message

#### 1.3 Test Missing Authentication

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "Content-Type: application/json"
```

**Expected**: 401 Unauthorized

#### 1.4 Test API Key in Query Parameter

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001?api_key=api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 200 OK

#### 1.5 Test JWT Token Authentication

**Step 1: Generate JWT Token**

```bash
curl -X POST "http://localhost:3000/api/pos/auth/generate-token" \
  -H "Content-Type: application/json" \
  -d '{
    "storeCode": "LOC001",
    "expiresIn": "24h"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "storeCode": "LOC001",
  "locationId": "1",
  "expiresIn": "24h",
  "expiresAt": "2024-01-16T10:30:00Z"
}
```

**Step 2: Use JWT Token in Request**

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "Authorization: Bearer <jwt_token_from_step_1>" \
  -H "Content-Type: application/json"
```

**Expected**: 200 OK

---

## Postman Testing Guide

### Quick Start (5 Minutes)

1. **Import Postman Collection**

   - Open Postman
   - Click "Import" → Select `docs/POS_SYNC_API.postman_collection.json`
   - Collection will be imported with all requests pre-configured

2. **Create Environment**

   - Click "Environments" → "+" to create new
   - Add variables:
     - `base_url`: `http://localhost:3000`
     - `store_code`: `LOC001`
     - `api_key`: `api_key_123`
   - Save environment

3. **Generate JWT Token**

   - Run "Generate JWT Token" request from collection
   - Token will be auto-saved to `jwt_token` variable

4. **Start Testing**
   - Select your environment from dropdown
   - Run any request from the collection

### Setup Postman Environment

1. **Create a New Environment in Postman**

   - Click on "Environments" in the left sidebar
   - Click "+" to create a new environment
   - Name it "POS Sync API - Local"

2. **Add Environment Variables**

   - `base_url`: `http://localhost:3000`
   - `store_code`: `LOC001`
   - `api_key`: `api_key_123`
   - `jwt_token`: (will be set after generating token)

3. **Save the Environment**

### JWT Token Generation Methods

#### Method 1: Using API Endpoint (Recommended for Postman)

**Endpoint**: `POST /api/pos/auth/generate-token`

**Request Body**:

```json
{
  "storeCode": "LOC001",
  "expiresIn": "24h"
}
```

**Response**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "storeCode": "LOC001",
  "locationId": "1",
  "expiresIn": "24h",
  "expiresAt": "2024-01-16T10:30:00Z"
}
```

#### Method 2: Using Command Line Script

```bash
# Install dependencies if needed
npm install jsonwebtoken dotenv

# Generate token
node scripts/generate-pos-jwt-token.js LOC001 24h
```

**Output**:

```
========================================
POS JWT Token Generated Successfully
========================================

Store Code: LOC001
Expires In: 24h
Expires At: 2024-01-16T10:30:00Z

Token:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

========================================

Use this token in your requests:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Method 3: Using Node.js Script

Create a file `generate-token.js`:

```javascript
const jwt = require("jsonwebtoken");
require("dotenv").config();

const storeCode = "LOC001";
const expiresIn = "24h";
const secret = process.env.POS_JWT_SECRET || process.env.NEXTAUTH_SECRET;

const token = jwt.sign(
  {
    type: "pos_client",
    storeCode: storeCode,
    iat: Math.floor(Date.now() / 1000),
  },
  secret,
  { expiresIn }
);

console.log("Token:", token);
```

Run: `node generate-token.js`

### Step-by-Step: Generate JWT Token in Postman

#### Step 1: Create Token Generation Request

1. **Create New Request**

   - Click "New" → "HTTP Request"
   - Name it: "Generate JWT Token"

2. **Configure Request**

   - **Method**: `POST`
   - **URL**: `{{base_url}}/api/pos/auth/generate-token`
   - **Headers**:
     - `Content-Type`: `application/json`
   - **Body** (raw JSON):
     ```json
     {
       "storeCode": "{{store_code}}",
       "expiresIn": "24h"
     }
     ```

3. **Send Request**
   - Click "Send"
   - You should receive a response with a `token` field

#### Step 2: Save Token to Environment Variable

1. **Add Test Script** (in the "Tests" tab of the token generation request):

   ```javascript
   if (pm.response.code === 200) {
     const response = pm.response.json();
     pm.environment.set("jwt_token", response.token);
     console.log("JWT Token saved to environment variable");
   }
   ```

2. **Send Request Again**
   - The token will now be automatically saved to `jwt_token` variable

### Postman Collection Setup

#### Create Collection Structure

1. **Create Collection**: "POS Location Sync API"
2. **Create Folders**:
   - `1. Authentication`
   - `2. Location Info`
   - `3. Comprehensive Data Sync`
   - `4. Table-Specific Sync`
   - `5. Conflict Resolution`

#### Request Examples

### 1. Authentication Requests

#### Request: Get Location Info (API Key)

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}`
- **Headers**:
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Tests** (optional):

  ```javascript
  pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
  });

  pm.test("Response has location data", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property("location");
  });
  ```

#### Request: Get Location Info (JWT Token)

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}`
- **Headers**:
  - `Authorization`: `Bearer {{jwt_token}}`
  - `Content-Type`: `application/json`

### 2. Location Info Requests

#### Request: GET Location Info

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}`
- **Headers**:
  - `x-api-key`: `{{api_key}}`

#### Request: POST Location Update

- **Method**: `POST`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}`
- **Headers**:
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
  ```json
  {
    "phone": "+1987654321",
    "email": "updated@example.com",
    "addressLine1": "456 Updated St"
  }
  ```

### 3. Comprehensive Data Sync Requests

#### Request: GET All Store Data (Full Sync)

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/data`
- **Headers**:
  - `x-api-key`: `{{api_key}}`

#### Request: GET All Store Data (Incremental)

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/data?incremental=true&lastSyncAt=2024-01-15T10:00:00Z`
- **Headers**:
  - `x-api-key`: `{{api_key}}`

#### Request: POST Bulk Data Update

- **Method**: `POST`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/data`
- **Headers**:
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
  ```json
  {
    "data": {
      "menu_items": [
        {
          "menuItemCode": "MI001",
          "name": "Updated Burger",
          "cashPrice": 12.99,
          "cardPrice": 13.99,
          "storeCode": "{{store_code}}"
        }
      ]
    },
    "conflictStrategy": "last-write-wins"
  }
  ```

### 4. Table-Specific Sync Requests

#### Request: GET Menu Items

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/menu_items`
- **Headers**:
  - `x-api-key`: `{{api_key}}`

#### Request: GET Menu Items with Pagination

- **Method**: `GET`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/menu_items?limit=10&offset=0`
- **Headers**:
  - `x-api-key`: `{{api_key}}`

#### Request: POST Menu Item (Upsert)

- **Method**: `POST`
- **URL**: `{{base_url}}/api/pos/sync/location/{{store_code}}/menu_items`
- **Headers**:
  - `x-api-key`: `{{api_key}}`
  - `Content-Type`: `application/json`
- **Body** (raw JSON):
  ```json
  {
    "data": {
      "menuItemCode": "MI999",
      "name": "New Item from POS",
      "cashPrice": 9.99,
      "cardPrice": 10.99,
      "isActive": 1,
      "storeCode": "{{store_code}}"
    },
    "operation": "upsert"
  }
  ```

### Postman Pre-request Scripts

#### Auto-generate Token Before Each Request (Optional)

Add this to Collection-level "Pre-request Script":

```javascript
// Only generate token if it doesn't exist or is expired
const token = pm.environment.get("jwt_token");
const tokenExpiry = pm.environment.get("jwt_token_expiry");

if (!token || (tokenExpiry && new Date(tokenExpiry) < new Date())) {
  pm.sendRequest(
    {
      url: pm.environment.get("base_url") + "/api/pos/auth/generate-token",
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      body: {
        mode: "raw",
        raw: JSON.stringify({
          storeCode: pm.environment.get("store_code"),
          expiresIn: "24h",
        }),
      },
    },
    function (err, res) {
      if (res.code === 200) {
        const response = res.json();
        pm.environment.set("jwt_token", response.token);
        pm.environment.set("jwt_token_expiry", response.expiresAt);
        console.log("JWT Token auto-generated and saved");
      }
    }
  );
}
```

### Postman Test Scripts Examples

#### Test Script for Location Info Request

```javascript
// Status code test
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Response time test
pm.test("Response time is less than 500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// Response structure test
pm.test("Response has location object", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property("location");
  pm.expect(jsonData.location).to.have.property("storeCode");
  pm.expect(jsonData.location.storeCode).to.eql(
    pm.environment.get("store_code")
  );
});

// Data validation
pm.test("Location is active", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.location.isActive).to.be.true;
});
```

#### Test Script for Data Sync Request

```javascript
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Sync was successful", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.success).to.be.true;
});

pm.test("Records were processed", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.summary.totalRecordsProcessed).to.be.above(0);
});

// Save lastSyncAt for incremental sync
if (pm.response.code === 200) {
  const jsonData = pm.response.json();
  if (jsonData.lastSyncAt) {
    pm.environment.set("last_sync_at", jsonData.lastSyncAt);
  }
}
```

### Postman Collection Variables

Add these at the Collection level:

- `conflict_strategy`: `last-write-wins` (default)
- `default_limit`: `50`
- `default_offset`: `0`

### Import/Export Postman Collection

1. **Export Collection**:

   - Right-click on collection → "Export"
   - Save as JSON file

2. **Import Collection**:
   - Click "Import" button
   - Select the JSON file

### Quick Testing Workflow in Postman

1. **Setup** (One-time):

   - Create environment with variables
   - Generate JWT token and save to environment
   - Import/create collection

2. **Test Authentication**:

   - Run "Generate JWT Token" request
   - Verify token is saved
   - Test API key authentication

3. **Test Location Info**:

   - GET location info
   - POST location update
   - Verify responses

4. **Test Data Sync**:

   - GET all store data
   - POST bulk update
   - Verify sync results

5. **Test Table-Specific**:

   - GET specific table
   - POST table updates
   - Test pagination

6. **Test Conflict Resolution**:
   - Create conflicts
   - Test different strategies
   - Verify resolution

---

### 2. Location Information Sync Tests

#### 2.1 GET Location Info - Valid Request

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected Response**:

```json
{
  "location": {
    "locationId": "1",
    "locationName": "Main Store",
    "storeCode": "LOC001",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "phone": "+1234567890",
    "email": "store@example.com",
    "isActive": true,
    "syncEnabled": true,
    "lastSyncAt": "2024-01-15T10:30:00Z"
  },
  "company": { ... },
  "dealer": { ... }
}
```

#### 2.2 GET Location Info - Invalid Store Code

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/INVALID" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 404 Not Found

#### 2.3 POST Location Update - Valid Request

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1987654321",
    "email": "updated@example.com",
    "addressLine1": "456 Updated St"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "locationId": "1",
    "storeCode": "LOC001",
    "lastSyncAt": "2024-01-15T11:00:00Z"
  }
}
```

#### 2.4 POST Location Update - Partial Update

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1555555555"
  }'
```

**Expected**: 200 OK with updated phone only

---

### 3. Comprehensive Store Data Sync Tests

#### 3.1 GET All Store Data - Full Sync

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected Response**:

```json
{
  "success": true,
  "storeCode": "LOC001",
  "lastSyncAt": "2024-01-15T10:30:00Z",
  "syncTimestamp": "2024-01-15T11:00:00Z",
  "incremental": false,
  "data": {
    "menu_items": [...],
    "modifier_groups": [...],
    "orders": [...],
    ...
  },
  "metadata": {
    "menu_items": { "count": 50, "lastUpdated": "..." },
    ...
  },
  "summary": {
    "totalTables": 13,
    "tablesWithData": 10,
    "totalRecords": 500
  }
}
```

#### 3.2 GET All Store Data - Incremental Sync

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data?incremental=true&lastSyncAt=2024-01-15T10:00:00Z" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: Only records updated after `lastSyncAt`

#### 3.3 GET Specific Table Data

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data?table=menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: Only `menu_items` data in response

#### 3.4 POST Store Data - Bulk Update

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menu_items": [
        {
          "menuItemCode": "MI001",
          "name": "Updated Burger",
          "cashPrice": 12.99,
          "cardPrice": 13.99,
          "storeCode": "LOC001"
        }
      ],
      "orders": [
        {
          "orderNumber": "ORD001",
          "orderType": "DINE_IN",
          "status": "PENDING",
          "subtotal": 25.50,
          "storeCode": "LOC001"
        }
      ]
    },
    "conflictStrategy": "last-write-wins"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "storeCode": "LOC001",
  "summary": {
    "totalTables": 2,
    "totalRecordsProcessed": 2,
    "totalRecordsSucceeded": 2,
    "totalRecordsFailed": 0
  },
  "results": {
    "menu_items": {
      "success": true,
      "recordsProcessed": 1,
      "recordsSucceeded": 1,
      "recordsFailed": 0
    },
    "orders": {
      "success": true,
      "recordsProcessed": 1,
      "recordsSucceeded": 1,
      "recordsFailed": 0
    }
  }
}
```

#### 3.5 POST Store Data - With Conflicts

```bash
# First, create a record from Master (syncSource = "server")
# Then try to update from POS (syncSource = "POS")
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menu_items": [
        {
          "menuItemCode": "MI001",
          "name": "POS Updated Name",
          "cashPrice": 15.99,
          "syncId": "existing-sync-id-from-server"
        }
      ]
    },
    "conflictStrategy": "last-write-wins"
  }'
```

**Expected**: Conflict resolution based on strategy, conflicts array in response

---

### 4. Table-Specific Sync Tests

#### 4.1 GET Specific Table - Menu Items

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: All menu items for LOC001

#### 4.2 GET Specific Table - With Pagination

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/menu_items?limit=10&offset=0" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: First 10 menu items with pagination metadata

#### 4.3 GET Specific Table - Incremental

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/orders?incremental=true&lastSyncAt=2024-01-15T10:00:00Z" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: Only orders updated after lastSyncAt

#### 4.4 POST Table Data - Insert New Record

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI999",
      "name": "New Item from POS",
      "cashPrice": 9.99,
      "cardPrice": 10.99,
      "isActive": 1,
      "storeCode": "LOC001"
    },
    "operation": "insert"
  }'
```

**Expected**: New record created with syncSource = "POS"

#### 4.5 POST Table Data - Update Existing Record

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "cashPrice": 14.99,
      "cardPrice": 15.99
    },
    "operation": "update",
    "conflictStrategy": "pos-wins"
  }'
```

**Expected**: Record updated successfully

#### 4.6 POST Table Data - Bulk Upsert

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {
        "menuItemCode": "MI001",
        "name": "Updated Item 1",
        "cashPrice": 11.99
      },
      {
        "menuItemCode": "MI002",
        "name": "Updated Item 2",
        "cashPrice": 12.99
      }
    ],
    "operation": "upsert"
  }'
```

**Expected**: Both records upserted

#### 4.7 POST Table Data - Delete Record

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "syncId": "uuid-to-delete"
    },
    "operation": "delete"
  }'
```

**Expected**: Record deleted

---

### 5. Conflict Resolution Tests

#### 5.1 Test Last-Write-Wins Strategy

```bash
# Scenario: Server updated record at 10:00, POS updates at 11:00
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "name": "POS Update",
      "updatedOn": "2024-01-15T11:00:00Z"
    },
    "conflictStrategy": "last-write-wins"
  }'
```

**Expected**: POS update wins if timestamp is newer

#### 5.2 Test POS-Wins Strategy

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "name": "POS Always Wins"
    },
    "conflictStrategy": "pos-wins"
  }'
```

**Expected**: POS update always applied

#### 5.3 Test Server-Wins Strategy

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "name": "POS Update"
    },
    "conflictStrategy": "server-wins"
  }'
```

**Expected**: POS update rejected, existing server record kept

#### 5.4 Test Manual Resolution Strategy

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "name": "POS Update"
    },
    "conflictStrategy": "manual"
  }'
```

**Expected**: Conflict flagged for manual review, update not applied

---

### 6. Error Handling Tests

#### 6.1 Invalid Store Code

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/INVALID_CODE" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 404 Not Found

#### 6.2 Inactive Location

```bash
# Use storeCode of an inactive location
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC_INACTIVE" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 404 or 403 with error message

#### 6.3 Sync Disabled Location

```bash
# Use storeCode of location with syncEnabled = 0
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC_NO_SYNC" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 403 or 400 with "Sync is disabled" message

#### 6.4 Invalid Table Name

```bash
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/invalid_table" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json"
```

**Expected**: 400 Bad Request with error message

#### 6.5 Invalid Data Format

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "invalid format"
  }'
```

**Expected**: 400 Bad Request

#### 6.6 Missing Required Fields

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "name": "Item without code"
    }
  }'
```

**Expected**: Error or validation failure

---

### 7. Edge Cases

#### 7.1 Empty Data Array

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menu_items": []
    }
  }'
```

**Expected**: Success with 0 records processed

#### 7.2 Large Batch Update

```bash
# Test with 100+ records
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [/* 100+ menu items */]
  }'
```

**Expected**: All records processed, may take longer

#### 7.3 Concurrent Updates

```bash
# Run multiple requests simultaneously
# Test 1
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -d '{"data": {"menuItemCode": "MI001", "name": "Update 1"}}' &

# Test 2
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -d '{"data": {"menuItemCode": "MI001", "name": "Update 2"}}' &
```

**Expected**: Both updates handled, conflict resolution applied

#### 7.4 Special Characters in Data

```bash
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/menu_items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "menuItemCode": "MI001",
      "name": "Item with émojis 🍔 & special chars: <>&\"'"
    }
  }'
```

**Expected**: Data properly escaped and stored

---

### 8. Performance Tests

#### 8.1 Response Time Test

```bash
time curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123"
```

**Expected**: Response time < 2 seconds for typical data

#### 8.2 Incremental Sync Performance

```bash
time curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data?incremental=true&lastSyncAt=2024-01-15T10:00:00Z" \
  -H "x-api-key: api_key_123"
```

**Expected**: Faster than full sync

---

### 9. Integration Test Scenarios

#### 9.1 Complete Sync Workflow

```bash
# Step 1: Get location info
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001" \
  -H "x-api-key: api_key_123"

# Step 2: Pull all data
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123"

# Step 3: Make changes locally in POS

# Step 4: Push updates back
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/data" \
  -H "x-api-key: api_key_123" \
  -d '{"data": {...}}'

# Step 5: Verify with incremental sync
curl -X GET "http://localhost:3000/api/pos/sync/location/LOC001/data?incremental=true&lastSyncAt=..." \
  -H "x-api-key: api_key_123"
```

#### 9.2 Order Creation Workflow

```bash
# Step 1: Create order in POS
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/orders" \
  -H "x-api-key: api_key_123" \
  -d '{
    "data": {
      "orderNumber": "ORD001",
      "orderType": "DINE_IN",
      "status": "PENDING",
      "subtotal": 25.50,
      "total": 27.50
    }
  }'

# Step 2: Update order status
curl -X POST "http://localhost:3000/api/pos/sync/location/LOC001/orders" \
  -H "x-api-key: api_key_123" \
  -d '{
    "data": {
      "orderNumber": "ORD001",
      "status": "COMPLETED"
    },
    "operation": "update"
  }'
```

---

## Test Data Setup

### Sample Menu Item

```json
{
  "menuItemCode": "MI001",
  "name": "Classic Burger",
  "kitchenName": "Burger",
  "cashPrice": 12.99,
  "cardPrice": 13.99,
  "isActive": 1,
  "storeCode": "LOC001",
  "syncSource": "POS"
}
```

### Sample Order

```json
{
  "orderNumber": "ORD001",
  "orderType": "DINE_IN",
  "status": "PENDING",
  "subtotal": 25.5,
  "tax": 2.04,
  "total": 27.54,
  "storeCode": "LOC001"
}
```

---

## Expected Response Codes

- **200 OK**: Successful request
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication failed
- **403 Forbidden**: Access denied (sync disabled, etc.)
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

---

## Testing Checklist

- [ ] Authentication with API key
- [ ] Authentication with JWT token
- [ ] Authentication failure cases
- [ ] GET location info
- [ ] POST location update
- [ ] GET all store data (full sync)
- [ ] GET all store data (incremental sync)
- [ ] POST bulk data update
- [ ] GET specific table
- [ ] POST table-specific update
- [ ] Conflict resolution strategies
- [ ] Error handling
- [ ] Edge cases
- [ ] Performance tests
- [ ] Integration workflows

---

## Notes

1. Replace `LOC001` and `api_key_123` with actual values from your database
2. Adjust timestamps in examples to match your test data
3. Some tests require pre-existing data in the database
4. For JWT token tests, implement token generation first
5. Monitor database changes to verify sync operations
6. Check `syncSource` field to verify POS-originated changes
