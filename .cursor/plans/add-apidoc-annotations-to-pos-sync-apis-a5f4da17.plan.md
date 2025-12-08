---
name: Add apiDoc Annotations to POS Sync API Routes
overview: ""
todos:
  - id: c5bdb865-e3de-4846-8f81-3f2d55f9d4f1
    content: Install apidoc package as dev dependency
    status: pending
  - id: 54526f8f-b216-4876-bb68-d4996f7bfac6
    content: Create apidoc.json configuration file with project settings and base URL from environment
    status: pending
  - id: 2618158b-765e-4d39-9cb4-8e1cc13be151
    content: Add apiDoc annotations to tax route files (route.ts and [id]/route.ts)
    status: pending
  - id: 2320e6b6-8f77-4ebc-85b5-9579068179e8
    content: Add apiDoc annotations to menu-items route files
    status: pending
  - id: 01b838c9-2a64-4949-bca3-246a386ea76f
    content: Add apiDoc annotations to orders route files
    status: pending
  - id: fbc04051-13be-4831-a82f-9897949df25b
    content: Add apiDoc annotations to modifier-groups route files
    status: pending
  - id: e46565af-5765-419d-a431-de5b3cdd81d0
    content: Add apiDoc annotations to prep-zones route files
    status: pending
  - id: cf392adc-89ad-4354-b7c0-6f175d660e36
    content: Add apiDoc annotations to stations route files
    status: pending
  - id: c4924154-cd3f-4a81-8eaf-216b694c0ea5
    content: Add apiDoc annotations to printers route files
    status: pending
  - id: c37dd03d-19df-4b35-8122-d159f3f85921
    content: Add apiDoc annotations to tables route files
    status: pending
  - id: 08bff3a6-415f-4652-896d-59e3e02efbda
    content: Add apiDoc annotations to location route files
    status: pending
  - id: 3348894b-e153-47d2-a7c0-0535f13f3451
    content: Add docs:generate script to package.json
    status: pending
  - id: 9e8e607b-f41c-4235-952a-bcef2d7dfaf7
    content: Add apidoc/ directory to .gitignore
    status: pending
---

# Add apiDoc Annotations to POS Sync API Routes

This plan adds apiDoc inline documentation annotations to all POS sync API routes and sets up the necessary configuration to generate interactive API documentation.

## Overview

- Install apiDoc as a dev dependency
- Create `apidoc.json` configuration file
- Add apiDoc annotations to all 19 route files in `src/app/api/pos/sync/`
- Add npm script to generate documentation
- Update `.gitignore` to exclude generated docs

## Implementation Steps

### 1. Install apiDoc

Add `apidoc` to `package.json` devDependencies.

### 2. Create Configuration File

Create `apidoc.json` in the project root with:

- Project name, version, description
- Base URL from environment variable
- Input directory: `src/app/api/pos/sync`
- Output directory: `apidoc`
- File filters for TypeScript files

### 3. Add apiDoc Annotations

Add comprehensive apiDoc annotations to all route files. Each route handler will include:

**For GET endpoints:**

- `@api` - HTTP method and route path
- `@apiName` - Unique endpoint name
- `@apiGroup` - Entity group (Tax, Menu Items, Orders, etc.)
- `@apiHeader` - Authentication requirements
- `@apiParam` - Path parameters (storeCode, id)
- `@apiQuery` - Query parameters (incremental, lastSyncAt, limit, offset, etc.)
- `@apiSuccess` - Response structure
- `@apiSuccessExample` - Example response
- `@apiError` - Error responses
- `@apiVersion` - API version

**For POST/PUT endpoints:**

- All above annotations plus:
- `@apiBody` - Request body parameters
- `@apiParamExample` - Example request body

**For DELETE endpoints:**

- Standard annotations with appropriate success/error responses

### 4. Files to Update

All route files in `src/app/api/pos/sync/`:

- `[storeCode]/tax/route.ts` - GET, POST
- `[storeCode]/tax/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/menu-items/route.ts` - GET, POST
- `[storeCode]/menu-items/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/orders/route.ts` - GET, POST
- `[storeCode]/orders/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/modifier-groups/route.ts` - GET, POST
- `[storeCode]/modifier-groups/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/prep-zones/route.ts` - GET, POST
- `[storeCode]/prep-zones/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/stations/route.ts` - GET, POST
- `[storeCode]/stations/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/printers/route.ts` - GET, POST
- `[storeCode]/printers/[id]/route.ts` - GET, PUT, DELETE
- `[storeCode]/tables/route.ts` - GET, POST
- `[storeCode]/tables/[id]/route.ts` - GET, PUT, DELETE
- `location/[storeCode]/route.ts` - GET, POST
- `location/[storeCode]/data/route.ts` - GET (if still in use)
- `location/[storeCode]/[tableName]/route.ts` - GET (if still in use)

### 5. Add npm Script

Add `"docs:generate": "apidoc -i src/app/api/pos/sync -o apidoc"` to `package.json` scripts.

### 6. Update .gitignore

Add `apidoc/` to `.gitignore` to exclude generated documentation.

## Annotation Structure Example

Each route will follow this pattern:

```typescript
/**
 * @api {get} /api/pos/sync/:storeCode/tax Get all taxes
 * @apiName GetTaxes
 * @apiGroup Tax
 * @apiVersion 1.0.0
 * 
 * @apiHeader {String} x-api-key API Key for authentication
 * @apiHeader {String} [Authorization] Bearer JWT token (alternative to API key)
 * 
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * 
 * @apiQuery {Boolean} [incremental=false] Only return updated records
 * @apiQuery {String} [lastSyncAt] ISO timestamp for incremental sync
 * 
 * @apiSuccess {Boolean} success Success status
 * @apiSuccess {String} storeCode Store code
 * @apiSuccess {Number} count Number of records returned
 * @apiSuccess {Object[]} data Array of tax objects
 * @apiSuccess {String} data.tblTaxId Tax ID (as string)
 * @apiSuccess {String} data.taxCode Tax code
 * @apiSuccess {String} data.taxname Tax name
 * @apiSuccess {Number} data.taxrate Tax rate
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "storeCode": "LOC001",
 *       "count": 2,
 *       "data": [
 *         {
 *           "tblTaxId": "1",
 *           "taxCode": "TAX001",
 *           "taxname": "Sales Tax",
 *           "taxrate": 8.5
 *         }
 *       ]
 *     }
 * 
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Server error
 */
```

## Notes

- All routes require authentication via API key or JWT token
- Path parameters use `:param` syntax in apiDoc (e.g., `:storeCode`, `:id`)
- Query parameters are documented with `@apiQuery`
- Request bodies use `@apiBody` for POST/PUT endpoints
- Error responses are documented with `@apiError`
- Examples use realistic data based on the existing route implementations