import { createPosStationCollectionHandlers, STATION_SETTING_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(STATION_SETTING_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/station-settings List station settings
 * @apiName GetStationSettings
 * @apiGroup StationSettings
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns per-station settings (`tbl_station_setting`), including General, Liquor,
 * Printer, and Cash Drawer values saved from the dashboard. Soft-deleted records
 * are excluded. Supports incremental sync.
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
 * @apiSuccess {Object[]} data Station settings
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
 * @apiSuccess {Boolean} [data.isDelete] Soft delete flag
 * @apiSuccess {Number}  [data.createdBy] Created-by user ID
 * @apiSuccess {String}  data.createdOn Created timestamp (ISO)
 * @apiSuccess {Number}  [data.updatedBy] Updated-by user ID
 * @apiSuccess {String}  [data.updatedOn] Updated timestamp (ISO)
 * @apiSuccess {Number}  data.isSyncToWeb Sync-to-web flag
 * @apiSuccess {Number}  data.isSyncToLocal Sync-to-local flag
 * @apiSuccess {String}  [data.storeCode] Store code
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  [data.syncSource] Sync source (e.g. "POS", "location")
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {post} /api/pos/sync/:storeCode/station-settings Create station setting
 * @apiName CreateStationSetting
 * @apiGroup StationSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} stationCode Unique station code
 * @apiBody {String}  [theme=Dark] Theme (`Dark` or `Light`)
 * @apiBody {Boolean} [isBurg=false] Burgundy / liquor hardware enabled
 * @apiBody {String}  [burgComPort] Burgundy COM port
 * @apiBody {String}  [localPrinterCode] Local printer code
 * @apiBody {String}  [backupPrinterCode] Backup printer code
 * @apiBody {Boolean} [isCashDrawer=false] Cash drawer enabled
 * @apiBody {String}  [cashDrawerCode] Selected cash drawer code
 * @apiBody {String}  [cashDrawerComport] Cash drawer COM port
 * @apiBody {Boolean} [isBarcodeScanner=false] Barcode scanner enabled
 * @apiBody {String}  [liquorDispenserCode] Liquor dispenser code
 * @apiBody {Boolean} [tabSelectionReqDin=false] Tab selection required for dine-in
 * @apiBody {Boolean} [enableMobileKeyboard=false] Mobile keyboard enabled
 * @apiBody {Boolean} [isAutoPicked=false] Auto-picked flag
 * @apiBody {Boolean} [isAutoDelivered=false] Auto-delivered flag
 * @apiBody {String}  [openCheckSelection=Dine-In] Default open-check order type
 * @apiBody {String}  [idealTimeLogout=0] Idle logout minutes
 * @apiBody {Boolean} [isTipAdjustmentReceipt=true] Print tip-adjustment receipt
 * @apiBody {Number}  [fontSize=13] Font size
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "stationCode": "WMLOC001STA1",
 *   "theme": "Dark",
 *   "isCashDrawer": true,
 *   "cashDrawerCode": "WLLOC001CDW1",
 *   "localPrinterCode": "WLLOC001PRT1",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created station setting
 * @apiSuccess (201) {String}  data.stationSettingId Station setting ID (string)
 * @apiSuccess (201) {String}  data.stationCode Unique station code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Station setting already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
