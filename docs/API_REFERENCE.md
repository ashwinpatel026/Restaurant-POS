# API Reference

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Master Dashboard APIs](#master-dashboard-apis)
4. [Location Dashboard APIs](#location-dashboard-apis)
5. [POS Sync APIs](#pos-sync-apis)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

## Overview

The Restaurant POS System provides three main API categories:

1. **Master Dashboard APIs** (`/api/master/*`): Manage master templates and tenant configuration
2. **Location Dashboard APIs** (`/api/dashboard/*`): Manage store-specific operational data
3. **POS Sync APIs** (`/api/pos/sync/*`): External POS client synchronization

### Base URLs

- **Development**: `http://localhost:3000`
- **Production**: Configured via `NEXT_PUBLIC_API_URL`

### Request Format

All APIs accept and return JSON:

```http
Content-Type: application/json
```

### Response Format

Standard response structure:

```json
{
  "data": {...},
  "message": "Success message",
  "error": null
}
```

Error response:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

## Authentication

### Master Dashboard Authentication

**Endpoint**: `POST /api/master/auth/login`

**Request**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response**:
```json
{
  "token": "jwt_token_here",
  "admin": {
    "adminId": "1",
    "email": "admin@example.com",
    "username": "admin",
    "role": "SUPER_ADMIN"
  }
}
```

**Usage**: Include token in Authorization header:
```http
Authorization: Bearer <token>
```

### Location Dashboard Authentication

Uses NextAuth.js session-based authentication. See [Authentication Documentation](./AUTHENTICATION_AUTHORIZATION.md).

### POS Sync API Authentication

**Endpoint**: `POST /api/pos/auth/generate-token`

**Headers**:
```http
x-api-key: <store_api_key>
```

**Response**:
```json
{
  "token": "jwt_token_here",
  "expiresIn": 3600
}
```

## Master Dashboard APIs

### Tenant Management

#### Companies

**List Companies**
- `GET /api/master/companies`
- **Auth**: Master admin token
- **Response**: Array of companies

**Get Company**
- `GET /api/master/companies/[id]`
- **Response**: Single company object

**Create Company**
- `POST /api/master/companies`
- **Body**:
```json
{
  "companyCode": "COMP001",
  "companyName": "Company Name",
  "addressLine1": "123 Main St",
  "city": "City",
  "state": "State",
  "country": "Country",
  "phone": "1234567890",
  "email": "company@example.com"
}
```

**Update Company**
- `PUT /api/master/companies/[id]`
- **Body**: Partial company object

#### Dealers

**List Dealers**
- `GET /api/master/dealers`
- **Query Params**: `companyId` (optional filter)

**Get Dealer**
- `GET /api/master/dealers/[id]`

**Create Dealer**
- `POST /api/master/dealers`
- **Body**: Dealer object with `dealerCode`, `dealerName`, `companyId`, etc.

**Update Dealer**
- `PUT /api/master/dealers/[id]`

#### Locations

**List Locations**
- `GET /api/master/locations`
- **Query Params**: `companyId`, `dealerId` (optional filters)

**Get Location**
- `GET /api/master/locations/[id]`

**Create Location**
- `POST /api/master/locations`
- **Body**:
```json
{
  "locationName": "Store Name",
  "storeCode": "STORE001",
  "companyId": 1,
  "dealerId": 1,
  "addressLine1": "123 Main St",
  "city": "City",
  "phone": "1234567890",
  "email": "store@example.com"
}
```

**Update Location**
- `PUT /api/master/locations/[id]`

### Master Menu Management

#### Menu Masters

**List Menu Masters**
- `GET /api/master/menu-masters`

**Get Menu Master**
- `GET /api/master/menu-masters/[id]`

**Create Menu Master**
- `POST /api/master/menu-masters`
- **Body**:
```json
{
  "menuMasterCode": "MASTER001",
  "name": "Main Menu",
  "labelName": "Main Menu",
  "colorCode": "#FF0000",
  "deptCode": "DEPT001",
  "isActive": 1
}
```

**Update Menu Master**
- `PUT /api/master/menu-masters/[id]`

**Get Menu Master Events**
- `GET /api/master/menu-masters/[id]/events`

**Assign Events to Menu Master**
- `POST /api/master/menu-masters/[id]/events`
- **Body**:
```json
{
  "eventCodes": ["EVENT001", "EVENT002"]
}
```

#### Menu Categories

**List Menu Categories**
- `GET /api/master/menu-categories`
- **Query Params**: `menuMasterCode` (optional filter)

**Get Menu Category**
- `GET /api/master/menu-categories/[id]`

**Create Menu Category**
- `POST /api/master/menu-categories`
- **Body**:
```json
{
  "menuMasterCode": "MASTER001",
  "menuCategoryCode": "CAT001",
  "name": "Appetizers",
  "colorCode": "#00FF00",
  "deptCode": "DEPT001",
  "isActive": 1
}
```

**Update Menu Category**
- `PUT /api/master/menu-categories/[id]`

#### Menu Items

**List Menu Items**
- `GET /api/master/menu-items`
- **Query Params**: `menuMasterCode`, `menuCategoryCode` (optional filters)

**Get Menu Item**
- `GET /api/master/menu-items/[id]`

**Create Menu Item**
- `POST /api/master/menu-items`
- **Body**: Complete menu item object

**Update Menu Item**
- `PUT /api/master/menu-items/[id]`

**Get Menu Item Time Events**
- `GET /api/master/menu-items/[id]/time-events`

**Bulk Apply Time Events**
- `POST /api/master/menu-items/[id]/time-events/bulk`
- **Body**:
```json
{
  "timeEvents": [
    {
      "eventCode": "EVENT001",
      "formulaValue": 15.99,
      "isOverride": false
    }
  ]
}
```

**Get Event Price Calculation**
- `GET /api/master/menu-items/time-events`
- **Query Params**: `deptCode`, `basePrice`
- **Response**: Array of event prices

### Master Time Events

**List Time Events**
- `GET /api/master/time-event`

**Get Time Event**
- `GET /api/master/time-event/[id]`

**Create Time Event**
- `POST /api/master/time-event`
- **Body**:
```json
{
  "eventCode": "EVENT001",
  "eventName": "Happy Hour",
  "deptCode": ["DEPT001", "DEPT002"],
  "globalPriceAmountAdd": 0,
  "globalPriceAmountDisc": 2.00,
  "globalPricePerAdd": 0,
  "globalPricePerDisc": 0,
  "monday": "Monday",
  "monStartTime": "17:00",
  "monEndTime": "19:00",
  "byFixedValue": false,
  "overrideAllEvents": false,
  "isActive": 1
}
```

**Update Time Event**
- `PUT /api/master/time-event/[id]`

### Sync Management

**Manual Sync**
- `POST /api/master/sync/manual`
- **Body**:
```json
{
  "locationCode": "LOC001",
  "tableName": "tbl_master_menu_item",
  "fullSync": false
}
```

**Get Sync Status**
- `GET /api/master/sync/status`
- **Query Params**: `locationCode`, `tableName` (optional)

**Get Sync Log**
- `GET /api/master/sync/log`
- **Query Params**: `locationCode`, `status`, `limit`, `offset`

**Location-to-Location Sync**
- `POST /api/master/sync/location-to-location`
- **Body**:
```json
{
  "sourceStoreCode": "STORE001",
  "targetStoreCode": "STORE002",
  "tableName": "tbl_menu_item"
}
```

### User Management

**List Users**
- `GET /api/master/users`

**Get User**
- `GET /api/master/users/[id]`

**Create User**
- `POST /api/master/users`
- **Body**: User object with email, username, password, role, etc.

**Update User**
- `PUT /api/master/users/[id]`

### Roles & Permissions

**List Roles**
- `GET /api/master/roles`

**Get Role**
- `GET /api/master/roles/[code]`

**Create Role**
- `POST /api/master/roles`
- **Body**:
```json
{
  "roleCode": "MANAGER",
  "roleName": "Manager",
  "description": "Store Manager Role"
}
```

**Get Role Permissions**
- `GET /api/master/roles/[code]/permissions`

**Update Role Permissions**
- `PUT /api/master/roles/[code]/permissions`
- **Body**:
```json
{
  "permissionCodes": ["menu.view", "menu.create", "orders.view"]
}
```

**List Permissions**
- `GET /api/master/permissions`

## Location Dashboard APIs

### Menu Management

#### Menu Masters

**List Menu Masters**
- `GET /api/dashboard/menu/masters`
- **Auth**: NextAuth session
- **Query Params**: `storeCode` (optional, uses user's default store if not provided)

**Get Menu Master**
- `GET /api/dashboard/menu/masters/[id]`
- **Query Params**: `storeCode`

**Create Menu Master**
- `POST /api/dashboard/menu/masters`
- **Body**: Menu master object with `storeCode`

**Update Menu Master**
- `PUT /api/dashboard/menu/masters/[id]`

**Get Menu Master Events**
- `GET /api/dashboard/menu/masters/[id]/events`
- **Query Params**: `storeCode`

#### Menu Categories

**List Menu Categories**
- `GET /api/dashboard/menu/categories`
- **Query Params**: `menuMasterCode`, `storeCode`

**Get Menu Category**
- `GET /api/dashboard/menu/categories/[id]`
- **Query Params**: `storeCode`

**Create Menu Category**
- `POST /api/dashboard/menu/categories`
- **Body**: Menu category object

**Update Menu Category**
- `PUT /api/dashboard/menu/categories/[id]`

#### Menu Items

**List Menu Items**
- `GET /api/dashboard/menu/items`
- **Query Params**: `menuMasterCode`, `menuCategoryCode`, `storeCode`, `isActive`

**Get Menu Item**
- `GET /api/dashboard/menu/items/[id]`
- **Query Params**: `storeCode`

**Create Menu Item**
- `POST /api/dashboard/menu/items`
- **Body**: Complete menu item object

**Update Menu Item**
- `PUT /api/dashboard/menu/items/[id]`

**Get Menu Item Time Events**
- `GET /api/dashboard/menu-items/[id]/time-events`
- **Query Params**: `storeCode`

**Bulk Apply Time Events**
- `POST /api/dashboard/menu-items/[id]/time-events/bulk`
- **Query Params**: `storeCode`
- **Body**:
```json
{
  "menuItemCode": "ITEM001",
  "timeEvents": [
    {
      "eventCode": "EVENT001",
      "formulaValue": 15.99,
      "isOverride": false
    }
  ]
}
```

**Get Event Price Calculation**
- `GET /api/dashboard/menu-items/time-events`
- **Query Params**: `deptCode`, `basePrice`, `storeCode`
- **Response**: Array of event prices

### Time Events

**List Time Events**
- `GET /api/dashboard/events`
- **Query Params**: `storeCode`

**Get Time Event**
- `GET /api/dashboard/events/[id]`
- **Query Params**: `storeCode`

**Create Time Event**
- `POST /api/dashboard/events`
- **Body**: Time event object with `storeCode`

**Update Time Event**
- `PUT /api/dashboard/events/[id]`

### Orders

**List Orders**
- `GET /api/dashboard/orders`
- **Query Params**: `storeCode`, `status`, `orderType`, `startDate`, `endDate`

**Get Order**
- `GET /api/dashboard/orders/[id]`
- **Query Params**: `storeCode`
- **Response**: Order with order items

**Create Order**
- `POST /api/dashboard/orders`
- **Body**:
```json
{
  "tableId": 1,
  "orderType": "DINE_IN",
  "customerName": "John Doe",
  "orderItems": [
    {
      "menuItemCode": "ITEM001",
      "quantity": 2,
      "price": 10.99
    }
  ],
  "storeCode": "STORE001"
}
```

**Update Order Status**
- `PATCH /api/dashboard/orders/[id]`
- **Body**:
```json
{
  "status": "CONFIRMED"
}
```

### Tables

**List Tables**
- `GET /api/dashboard/tables`
- **Query Params**: `storeCode`, `status`

**Get Table**
- `GET /api/dashboard/tables/[id]`
- **Query Params**: `storeCode`

**Create Table**
- `POST /api/dashboard/tables`
- **Body**:
```json
{
  "tableNumber": "T01",
  "seatingCapacity": 4,
  "location": "Main Hall",
  "storeCode": "STORE001"
}
```

**Update Table**
- `PUT /api/dashboard/tables/[id]`

**Update Table Status**
- `PATCH /api/dashboard/tables/[id]`
- **Body**:
```json
{
  "status": 1
}
```

### Modifiers

**List Modifier Groups**
- `GET /api/dashboard/modifier-groups`
- **Query Params**: `storeCode`

**Get Modifier Group**
- `GET /api/dashboard/modifier-groups/[id]`

**Create Modifier Group**
- `POST /api/dashboard/modifier-groups`

**Update Modifier Group**
- `PUT /api/dashboard/modifier-groups/[id]`

**List Modifier Items**
- `GET /api/dashboard/modifier-items`
- **Query Params**: `modifierGroupCode`, `storeCode`

**Get Modifier Item**
- `GET /api/dashboard/modifier-items/[id]`

**Create Modifier Item**
- `POST /api/dashboard/modifier-items`

**Update Modifier Item**
- `PUT /api/dashboard/modifier-items/[id]`

### Departments

**List Departments**
- `GET /api/dashboard/department`
- **Query Params**: `storeCode`

**Get Department**
- `GET /api/dashboard/department/[id]`

**Create Department**
- `POST /api/dashboard/department`

**Update Department**
- `PUT /api/dashboard/department/[id]`

### Tax

**List Taxes**
- `GET /api/dashboard/tax`
- **Query Params**: `storeCode`

**Get Tax**
- `GET /api/dashboard/tax/[id]`

**Create Tax**
- `POST /api/dashboard/tax`
- **Body**:
```json
{
  "taxCode": "TAX001",
  "taxname": "Sales Tax",
  "taxrate": 8.5,
  "storeCode": "STORE001"
}
```

**Update Tax**
- `PUT /api/dashboard/tax/[id]`

### Users

**List Users**
- `GET /api/dashboard/users`
- **Query Params**: `storeCode`

**Get User**
- `GET /api/dashboard/users/[id]`

**Update User**
- `PATCH /api/dashboard/users/[id]`

### Reports

**Get Reports**
- `GET /api/dashboard/reports`
- **Query Params**: `storeCode`, `startDate`, `endDate`, `reportType`

**Response**:
```json
{
  "sales": {
    "total": 10000.00,
    "count": 150
  },
  "topItems": [...],
  "ordersByType": {...}
}
```

### Statistics

**Get Statistics**
- `GET /api/dashboard/stats`
- **Query Params**: `storeCode`

**Response**:
```json
{
  "totalOrders": 150,
  "activeOrders": 5,
  "totalRevenue": 10000.00,
  "todayRevenue": 500.00
}
```

## POS Sync APIs

### Base URL Pattern

All POS Sync APIs follow: `/api/pos/sync/[storeCode]/[entity]`

### Authentication

**Headers**:
```http
x-api-key: <store_api_key>
Authorization: Bearer <jwt_token>
```

### Menu Items

**List Menu Items**
- `GET /api/pos/sync/[storeCode]/menu-items`
- **Query Params**: `incremental=true`, `lastSyncAt=2024-01-15T10:00:00Z`, `limit`, `offset`

**Get Menu Item**
- `GET /api/pos/sync/[storeCode]/menu-items/[id]`
- **Note**: `[id]` can be `menuItemId` (BigInt) or `menuItemCode` (string)

**Create Menu Item**
- `POST /api/pos/sync/[storeCode]/menu-items`
- **Body**: Menu item object

**Update Menu Item**
- `PUT /api/pos/sync/[storeCode]/menu-items/[id]`

**Delete Menu Item**
- `DELETE /api/pos/sync/[storeCode]/menu-items/[id]`

### Orders

**List Orders**
- `GET /api/pos/sync/[storeCode]/orders`
- **Query Params**: `incremental=true`, `lastSyncAt`, `status`, `orderType`, `limit`, `offset`

**Get Order**
- `GET /api/pos/sync/[storeCode]/orders/[id]`
- **Response**: Order with order items included

**Create Order**
- `POST /api/pos/sync/[storeCode]/orders`
- **Body**: Order object with order items

**Update Order**
- `PUT /api/pos/sync/[storeCode]/orders/[id]`

**Update Order Status**
- `PATCH /api/pos/sync/[storeCode]/orders/[id]`
- **Body**:
```json
{
  "status": "CONFIRMED"
}
```

### Time Events

**List Time Events**
- `GET /api/pos/sync/[storeCode]/time-events`
- **Query Params**: `incremental=true`, `lastSyncAt`

**Get Time Event**
- `GET /api/pos/sync/[storeCode]/time-events/[id]`

**Create Time Event**
- `POST /api/pos/sync/[storeCode]/time-events`

**Update Time Event**
- `PUT /api/pos/sync/[storeCode]/time-events/[id]`

### Tax

**List Taxes**
- `GET /api/pos/sync/[storeCode]/tax`

**Get Tax**
- `GET /api/pos/sync/[storeCode]/tax/[id]`

**Create Tax**
- `POST /api/pos/sync/[storeCode]/tax`

**Update Tax**
- `PUT /api/pos/sync/[storeCode]/tax/[id]`

### Departments

**List Departments**
- `GET /api/pos/sync/[storeCode]/departments`

**Get Department**
- `GET /api/pos/sync/[storeCode]/departments/[id]`

**Create Department**
- `POST /api/pos/sync/[storeCode]/departments`

**Update Department**
- `PUT /api/pos/sync/[storeCode]/departments/[id]`

### Tables

**List Tables**
- `GET /api/pos/sync/[storeCode]/tables`

**Get Table**
- `GET /api/pos/sync/[storeCode]/tables/[id]`

**Create Table**
- `POST /api/pos/sync/[storeCode]/tables`

**Update Table**
- `PUT /api/pos/sync/[storeCode]/tables/[id]`

**Update Table Status**
- `PATCH /api/pos/sync/[storeCode]/tables/[id]`
- **Body**:
```json
{
  "status": 1,
  "currentOccupancy": 2
}
```

### Modifiers

**List Modifier Groups**
- `GET /api/pos/sync/[storeCode]/modifier-groups`

**Get Modifier Group**
- `GET /api/pos/sync/[storeCode]/modifier-groups/[id]`

**Create Modifier Group**
- `POST /api/pos/sync/[storeCode]/modifier-groups`

**Update Modifier Group**
- `PUT /api/pos/sync/[storeCode]/modifier-groups/[id]`

**List Modifier Items**
- `GET /api/pos/sync/[storeCode]/modifier-items`
- **Query Params**: `modifierGroupCode`

**Get Modifier Item**
- `GET /api/pos/sync/[storeCode]/modifier-items/[id]`

**Create Modifier Item**
- `POST /api/pos/sync/[storeCode]/modifier-items`

**Update Modifier Item**
- `PUT /api/pos/sync/[storeCode]/modifier-items/[id]`

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate code)
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation error"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `DUPLICATE_CODE`: Duplicate code value
- `SYNC_ERROR`: Synchronization error
- `DATABASE_ERROR`: Database operation error

## Rate Limiting

### Current Implementation

- No explicit rate limiting implemented
- Recommended: Implement rate limiting for production

### Recommended Limits

- **Master APIs**: 100 requests/minute per IP
- **Dashboard APIs**: 200 requests/minute per user
- **POS Sync APIs**: 500 requests/minute per store

## Related Documentation

- [Authentication & Authorization](./AUTHENTICATION_AUTHORIZATION.md) - Detailed auth documentation
- [POS Integration](./POS_INTEGRATION.md) - POS API integration guide
- [Sync System](./SYNC_SYSTEM_COMPLETE.md) - Sync system details
