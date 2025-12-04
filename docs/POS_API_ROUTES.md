# POS Sync API Routes Reference

This document lists all available POS Sync API routes organized by entity.

## Base URL Structure

All routes follow the pattern: `/api/pos/sync/[storeCode]/[entity]`

- `[storeCode]` - The store/location code (e.g., "LOC001")
- `[entity]` - The entity name (e.g., "tax", "menu-items", "orders")

## Authentication

All routes require authentication via:

- **API Key**: Header `x-api-key` or query param `api_key`
- **JWT Token**: Header `Authorization: Bearer <token>`

## Available Entity Routes

### 1. Tax

#### List All Taxes

- **GET** `/api/pos/sync/[storeCode]/tax`
- **Query Params**:
  - `incremental=true` - Only get updated records
  - `lastSyncAt=2024-01-15T10:00:00Z` - Get records updated after this time

#### Get Single Tax

- **GET** `/api/pos/sync/[storeCode]/tax/[id]`
- `[id]` can be `tblTaxId` (integer) or `taxCode` (string)

#### Create Tax

- **POST** `/api/pos/sync/[storeCode]/tax`
- **Body**: `{ taxCode, taxname, taxrate, createdBy? }`

#### Update Tax

- **PUT** `/api/pos/sync/[storeCode]/tax/[id]`
- **Body**: `{ taxname?, taxrate?, updatedBy? }`

#### Delete Tax

- **DELETE** `/api/pos/sync/[storeCode]/tax/[id]`

---

### 2. Menu Items

#### List All Menu Items

- **GET** `/api/pos/sync/[storeCode]/menu-items`
- **Query Params**:
  - `incremental=true`
  - `lastSyncAt=...`
  - `limit=50` - Pagination limit
  - `offset=0` - Pagination offset

#### Get Single Menu Item

- **GET** `/api/pos/sync/[storeCode]/menu-items/[id]`
- `[id]` can be `menuItemId` (BigInt) or `menuItemCode` (string)

#### Create Menu Item

- **POST** `/api/pos/sync/[storeCode]/menu-items`
- **Body**: `{ menuItemCode, name, cashPrice?, cardPrice?, isActive?, ... }`

#### Update Menu Item

- **PUT** `/api/pos/sync/[storeCode]/menu-items/[id]`
- **Body**: `{ name?, cashPrice?, cardPrice?, isActive?, ... }`

#### Delete Menu Item

- **DELETE** `/api/pos/sync/[storeCode]/menu-items/[id]`

---

### 3. Orders

#### List All Orders

- **GET** `/api/pos/sync/[storeCode]/orders`
- **Query Params**:
  - `incremental=true`
  - `lastSyncAt=...`
  - `status=PENDING` - Filter by status
  - `orderType=DINE_IN` - Filter by order type
  - `limit=50`, `offset=0` - Pagination

#### Get Single Order

- **GET** `/api/pos/sync/[storeCode]/orders/[id]`
- `[id]` can be `orderId` (BigInt) or `orderNumber` (string)
- Returns order with `orderItems` included

#### Create Order

- **POST** `/api/pos/sync/[storeCode]/orders`
- **Body**:
  ```json
  {
    "orderNumber": "ORD001",
    "orderType": "DINE_IN",
    "status": "PENDING",
    "tableId": 1,
    "orderItems": [
      {
        "menuItemCode": "MI001",
        "name": "Burger",
        "quantity": 2,
        "price": 12.99
      }
    ],
    "subtotal": 25.98,
    "tax": 2.08,
    "total": 28.06
  }
  ```

#### Update Order

- **PUT** `/api/pos/sync/[storeCode]/orders/[id]`
- **Body**: `{ status?, subtotal?, tax?, total?, ... }`

#### Cancel Order (Soft Delete)

- **DELETE** `/api/pos/sync/[storeCode]/orders/[id]`
- Sets status to "CANCELLED"

---

### 4. Modifier Groups

#### List All Modifier Groups

- **GET** `/api/pos/sync/[storeCode]/modifier-groups`

#### Get Single Modifier Group

- **GET** `/api/pos/sync/[storeCode]/modifier-groups/[id]`
- `[id]` can be `id` (BigInt) or `modifierGroupCode` (string)

#### Create Modifier Group

- **POST** `/api/pos/sync/[storeCode]/modifier-groups`
- **Body**: `{ modifierGroupCode, groupName, isRequired?, isMultiselect?, ... }`

#### Update Modifier Group

- **PUT** `/api/pos/sync/[storeCode]/modifier-groups/[id]`

#### Delete Modifier Group

- **DELETE** `/api/pos/sync/[storeCode]/modifier-groups/[id]`

---

### 5. Prep Zones

#### List All Prep Zones

- **GET** `/api/pos/sync/[storeCode]/prep-zones`

#### Get Single Prep Zone

- **GET** `/api/pos/sync/[storeCode]/prep-zones/[id]`
- `[id]` can be `prepZoneId` (BigInt) or `prepZoneCode` (string)

#### Create Prep Zone

- **POST** `/api/pos/sync/[storeCode]/prep-zones`
- **Body**: `{ prepZoneCode, prepZoneName, stationCode?, printerCode?, ... }`

#### Update Prep Zone

- **PUT** `/api/pos/sync/[storeCode]/prep-zones/[id]`

#### Delete Prep Zone

- **DELETE** `/api/pos/sync/[storeCode]/prep-zones/[id]`

---

### 6. Stations

#### List All Stations

- **GET** `/api/pos/sync/[storeCode]/stations`

#### Get Single Station

- **GET** `/api/pos/sync/[storeCode]/stations/[id]`
- `[id]` can be `tblStationId` (BigInt) or `stationCode` (string)

#### Create Station

- **POST** `/api/pos/sync/[storeCode]/stations`
- **Body**: `{ stationCode, stationname, isKitchen?, isBar?, isBill?, isReport?, ipAddress?, stationGroups?, isActive?, createdBy? }`
- **Note**: `createdBy` (Int) is optional. `createdOn` is automatically set to current date.

#### Update Station

- **PUT** `/api/pos/sync/[storeCode]/stations/[id]`
- **Body**: `{ stationname?, isActive?, stationGroups?, isKitchen?, isBar?, isBill?, isReport?, ipAddress?, updatedBy? }`
- **Note**: `updatedBy` (BigInt) is optional. `updatedOn` is automatically set to current date.

#### Delete Station

- **DELETE** `/api/pos/sync/[storeCode]/stations/[id]`

---

### 7. Printers

#### List All Printers

- **GET** `/api/pos/sync/[storeCode]/printers`

#### Get Single Printer

- **GET** `/api/pos/sync/[storeCode]/printers/[id]`
- `[id]` can be `printerId` (BigInt) or `printerCode` (string)

#### Create Printer

- **POST** `/api/pos/sync/[storeCode]/printers`
- **Body**: `{ printerCode, printerName, isActive? }`

#### Update Printer

- **PUT** `/api/pos/sync/[storeCode]/printers/[id]`

#### Delete Printer

- **DELETE** `/api/pos/sync/[storeCode]/printers/[id]`

---

### 8. Tables

#### List All Tables

- **GET** `/api/pos/sync/[storeCode]/tables`
- **Query Params**: `status=0` - Filter by status

#### Get Single Table

- **GET** `/api/pos/sync/[storeCode]/tables/[id]`
- `[id]` can be `tableId` (integer) or `tableNumber` (string)

#### Create Table

- **POST** `/api/pos/sync/[storeCode]/tables`
- **Body**: `{ tableNumber, seatingCapacity, location?, status? }`

#### Update Table

- **PUT** `/api/pos/sync/[storeCode]/tables/[id]`
- **Body**: `{ seatingCapacity?, currentOccupancy?, location?, status? }`

#### Delete Table

- **DELETE** `/api/pos/sync/[storeCode]/tables/[id]`

---

## Location Information (Still Available)

### Get Location Info

- **GET** `/api/pos/sync/location/[storeCode]`
- Returns location details, company, and dealer information

### Update Location Info

- **POST** `/api/pos/sync/location/[storeCode]`
- **Body**: `{ phone?, email?, addressLine1?, ... }`

---

## Deprecated Routes

The following routes are deprecated and will be removed in a future version:

- ❌ `/api/pos/sync/location/[storeCode]/data` - Use specific entity routes instead
- ❌ `/api/pos/sync/location/[storeCode]/[tableName]` - Use specific entity routes instead

---

## Common Query Parameters

Most GET endpoints support:

- `incremental=true` - Only return records updated since last sync
- `lastSyncAt=2024-01-15T10:00:00Z` - ISO timestamp for incremental sync
- `limit=50` - Pagination limit (where supported)
- `offset=0` - Pagination offset (where supported)

---

## Response Format

### Success Response

```json
{
  "success": true,
  "storeCode": "LOC001",
  "count": 10,
  "data": [...]
}
```

### Error Response

```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

---

## Status Codes

- **200 OK**: Successful GET/PUT/DELETE
- **201 Created**: Successful POST (create)
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication failed
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **500 Internal Server Error**: Server error

---

## Examples

### Get All Taxes

```bash
curl -X GET "http://localhost:3000/api/pos/sync/LOC001/tax" \
  -H "x-api-key: api_key_123"
```

### Create Menu Item

```bash
curl -X POST "http://localhost:3000/api/pos/sync/LOC001/menu-items" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemCode": "MI001",
    "name": "Classic Burger",
    "cashPrice": 12.99,
    "cardPrice": 13.99,
    "isActive": 1
  }'
```

### Update Order Status

```bash
curl -X PUT "http://localhost:3000/api/pos/sync/LOC001/orders/ORD001" \
  -H "x-api-key: api_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED"
  }'
```

### Get Orders with Filters

```bash
curl -X GET "http://localhost:3000/api/pos/sync/LOC001/orders?status=PENDING&orderType=DINE_IN" \
  -H "x-api-key: api_key_123"
```

---

## Notes

1. All routes are store-wise - data is automatically filtered by `storeCode`
2. All POST/PUT operations set `syncSource = "POS"` automatically
3. All timestamps are in ISO 8601 format
4. BigInt IDs are returned as strings in JSON responses
5. Use incremental sync for better performance when syncing frequently
