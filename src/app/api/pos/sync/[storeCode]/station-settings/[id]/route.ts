import { createPosStationItemHandlers, STATION_SETTING_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(STATION_SETTING_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/station-settings/:id Get station setting
 * @apiName GetStationSetting
 * @apiGroup StationSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `stationSettingId` or string `stationCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Station setting record
 * @apiSuccess {String}  data.stationSettingId Station setting ID (string)
 * @apiSuccess {String}  data.stationCode Unique station code
 * @apiSuccess {String}  [data.theme] Theme (`Dark` or `Light`)
 * @apiSuccess {Boolean} [data.isBurg] Burgundy / liquor hardware enabled
 * @apiSuccess {String}  [data.burgComPort] Burgundy COM port
 * @apiSuccess {String}  [data.localPrinterCode] Local printer code
 * @apiSuccess {String}  [data.backupPrinterCode] Backup printer code
 * @apiSuccess {Boolean} [data.isCashDrawer] Cash drawer enabled
 * @apiSuccess {String}  [data.cashDrawerCode] Selected cash drawer code
 * @apiSuccess {String}  [data.cashDrawerComport] Cash drawer COM port
 * @apiSuccess {Boolean} [data.isBarcodeScanner] Barcode scanner enabled
 * @apiSuccess {String}  [data.liquorDispenserCode] Liquor dispenser code
 * @apiSuccess {Boolean} [data.tabSelectionReqDin] Tab selection required for dine-in
 * @apiSuccess {Boolean} [data.enableMobileKeyboard] Mobile keyboard enabled
 * @apiSuccess {Boolean} [data.isAutoPicked] Auto-picked flag
 * @apiSuccess {Boolean} [data.isAutoDelivered] Auto-delivered flag
 * @apiSuccess {String}  [data.openCheckSelection] Default open-check order type
 * @apiSuccess {String}  [data.idealTimeLogout] Idle logout minutes
 * @apiSuccess {Boolean} [data.isTipAdjustmentReceipt] Print tip-adjustment receipt
 * @apiSuccess {Number}  [data.fontSize] Font size
 * @apiSuccess {Boolean} [data.isActive] Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station setting not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/station-settings/:id Update station setting
 * @apiName UpdateStationSetting
 * @apiGroup StationSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `stationSettingId` or string `stationCode`
 *
 * @apiBody {String}  [stationCode] Unique station code
 * @apiBody {String}  [theme] Theme (`Dark` or `Light`)
 * @apiBody {Boolean} [isBurg] Burgundy / liquor hardware enabled
 * @apiBody {String}  [burgComPort] Burgundy COM port
 * @apiBody {String}  [localPrinterCode] Local printer code
 * @apiBody {String}  [backupPrinterCode] Backup printer code
 * @apiBody {Boolean} [isCashDrawer] Cash drawer enabled
 * @apiBody {String}  [cashDrawerCode] Selected cash drawer code
 * @apiBody {String}  [cashDrawerComport] Cash drawer COM port
 * @apiBody {Boolean} [isBarcodeScanner] Barcode scanner enabled
 * @apiBody {String}  [liquorDispenserCode] Liquor dispenser code
 * @apiBody {Boolean} [tabSelectionReqDin] Tab selection required for dine-in
 * @apiBody {Boolean} [enableMobileKeyboard] Mobile keyboard enabled
 * @apiBody {Boolean} [isAutoPicked] Auto-picked flag
 * @apiBody {Boolean} [isAutoDelivered] Auto-delivered flag
 * @apiBody {String}  [openCheckSelection] Default open-check order type
 * @apiBody {String}  [idealTimeLogout] Idle logout minutes
 * @apiBody {Boolean} [isTipAdjustmentReceipt] Print tip-adjustment receipt
 * @apiBody {Number}  [fontSize] Font size
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "theme": "Dark",
 *   "isCashDrawer": true,
 *   "cashDrawerCode": "WLLOC001CDW1",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated station setting
 * @apiSuccess {String}  data.stationSettingId Station setting ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station setting not found
 * @apiError (409) Conflict Station code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/station-settings/:id Delete station setting
 * @apiName DeleteStationSetting
 * @apiGroup StationSettings
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the station setting (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `stationSettingId` or string `stationCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.stationSettingId Station setting ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station setting not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
