import { createPosStationCollectionHandlers, PAYMENT_DEVICE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(PAYMENT_DEVICE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/payment-devices List payment device configs
 * @apiName GetPaymentDevices
 * @apiGroup PaymentDevices
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns payment device configs (`tbl_payment_device_config`) such as Valor Pay and Pax.
 * Channel Id (`chennelId`) and ISV Key are returned in full so POS can process payments.
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
 * @apiSuccess {Object[]} data Payment device configs
 * @apiSuccess {String}  data.configId Config ID (string)
 * @apiSuccess {String}  data.payDeviceCode Unique payment device code
 * @apiSuccess {String}  data.payDeviceName Payment device name
 * @apiSuccess {String}  [data.apiUrl] API URL
 * @apiSuccess {String}  [data.apiKey] API key
 * @apiSuccess {String}  [data.appId] App ID
 * @apiSuccess {String}  [data.appKey] App key
 * @apiSuccess {String}  [data.epi] EPI
 * @apiSuccess {String}  [data.chennelId] Channel Id (full value)
 * @apiSuccess {String}  [data.ipAddress] Device IP address
 * @apiSuccess {Number}  [data.portNo] Device port
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {String}  [data.payDeviceType] Device type (`Valor Pay` or `Pax`)
 * @apiSuccess {String}  [data.isvKey] ISV key (full value)
 * @apiSuccess {Boolean} data.isDeviceLive Live environment flag
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
 * @api {post} /api/pos/sync/:storeCode/payment-devices Create payment device config
 * @apiName CreatePaymentDevice
 * @apiGroup PaymentDevices
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} payDeviceCode Unique payment device code
 * @apiBody {String} payDeviceName Payment device name
 * @apiBody {String}  [apiUrl] API URL
 * @apiBody {String}  [apiKey] API key
 * @apiBody {String}  [appId] App ID
 * @apiBody {String}  [appKey] App key
 * @apiBody {String}  [epi] EPI
 * @apiBody {String}  [chennelId] Channel Id
 * @apiBody {String}  [ipAddress] Device IP address
 * @apiBody {Number}  [portNo] Device port
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {String}  [payDeviceType] Device type (`Valor Pay` or `Pax`)
 * @apiBody {String}  [isvKey] ISV key
 * @apiBody {Boolean} [isDeviceLive=false] Live environment flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "payDeviceCode": "WLLOC001PDC1",
 *   "payDeviceName": "Valor Live",
 *   "payDeviceType": "Valor Pay",
 *   "isDeviceLive": true,
 *   "appId": "APP123",
 *   "appKey": "KEY123",
 *   "epi": "EPI123",
 *   "ipAddress": "192.168.1.10",
 *   "portNo": 10009,
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created payment device config
 * @apiSuccess (201) {String}  data.configId Config ID (string)
 * @apiSuccess (201) {String}  data.payDeviceCode Unique payment device code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Payment device code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
