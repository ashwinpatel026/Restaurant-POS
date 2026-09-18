import { createPosStationItemHandlers, CASH_DRAWER_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(CASH_DRAWER_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/cash-drawers/:id Get cash drawer
 * @apiName GetCashDrawer
 * @apiGroup CashDrawers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `cashDrawerId` or string `cashDrawerCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Cash drawer record
 * @apiSuccess {String}  data.cashDrawerId Cash drawer ID (string)
 * @apiSuccess {String}  data.cashDrawerCode Unique cash drawer code
 * @apiSuccess {String}  [data.cashDrawerName] Cash drawer name
 * @apiSuccess {String}  [data.comPort] COM port
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  [data.connectionType] Connection type (`Printer` or `Comport`)
 * @apiSuccess {String}  [data.printerCode] Printer code when connection type is Printer
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Cash drawer not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/cash-drawers/:id Update cash drawer
 * @apiName UpdateCashDrawer
 * @apiGroup CashDrawers
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `cashDrawerId` or string `cashDrawerCode`
 *
 * @apiBody {String}  [cashDrawerCode] Unique cash drawer code
 * @apiBody {String}  [cashDrawerName] Cash drawer name
 * @apiBody {String}  [comPort] COM port
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {String}  [connectionType] Connection type (`Printer` or `Comport`)
 * @apiBody {String}  [printerCode] Printer code when connection type is Printer
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "cashDrawerName": "Front Drawer",
 *   "connectionType": "Printer",
 *   "printerCode": "WLLOC001PRT1",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated cash drawer
 * @apiSuccess {String}  data.cashDrawerId Cash drawer ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Cash drawer not found
 * @apiError (409) Conflict Cash drawer code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/cash-drawers/:id Delete cash drawer
 * @apiName DeleteCashDrawer
 * @apiGroup CashDrawers
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the cash drawer (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `cashDrawerId` or string `cashDrawerCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.cashDrawerCode Cash drawer code
 * @apiSuccess {String}  data.cashDrawerId Cash drawer ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Cash drawer not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
