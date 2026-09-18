import { createPosStationCollectionHandlers, CASH_DRAWER_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(CASH_DRAWER_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/cash-drawers List cash drawers
 * @apiName GetCashDrawers
 * @apiGroup CashDrawers
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns cash drawer masters (`tbl_cash_drawer_master`).
 * Soft-deleted records are excluded. Supports incremental sync.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Cash drawers
 * @apiSuccess {String}  data.cashDrawerId Cash drawer ID (string)
 * @apiSuccess {String}  data.cashDrawerCode Unique cash drawer code
 * @apiSuccess {String}  [data.cashDrawerName] Cash drawer name
 * @apiSuccess {String}  [data.comPort] COM port
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  [data.connectionType] Connection type (`Printer` or `Comport`)
 * @apiSuccess {String}  [data.printerCode] Printer code when connection type is Printer
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {Number}  [data.createdBy] Created-by user ID
 * @apiSuccess {String}  data.createdOn Created timestamp (ISO)
 * @apiSuccess {Number}  [data.updatedBy] Updated-by user ID
 * @apiSuccess {String}  [data.updatedOn] Updated timestamp (ISO)
 * @apiSuccess {Number}  data.isSyncToWeb Sync-to-web flag
 * @apiSuccess {Number}  data.isSyncToLocal Sync-to-local flag
 * @apiSuccess {String}  data.storeCode Store code
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  [data.syncSource] Sync source (e.g. "POS", "location")
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {post} /api/pos/sync/:storeCode/cash-drawers Create cash drawer
 * @apiName CreateCashDrawer
 * @apiGroup CashDrawers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} cashDrawerCode Unique cash drawer code
 * @apiBody {String}  [cashDrawerName] Cash drawer name
 * @apiBody {String}  [comPort] COM port
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {String}  [connectionType] Connection type (`Printer` or `Comport`)
 * @apiBody {String}  [printerCode] Printer code when connection type is Printer
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "cashDrawerCode": "WLLOC001CDW1",
 *   "cashDrawerName": "Front Drawer",
 *   "connectionType": "Printer",
 *   "printerCode": "WLLOC001PRT1",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created cash drawer
 * @apiSuccess (201) {String}  data.cashDrawerId Cash drawer ID (string)
 * @apiSuccess (201) {String}  data.cashDrawerCode Unique cash drawer code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Cash drawer code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
