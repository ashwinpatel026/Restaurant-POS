import { createPosStationItemHandlers, PAYMENT_DEVICE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(PAYMENT_DEVICE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/payment-devices/:id Get payment device config
 * @apiName GetPaymentDevice
 * @apiGroup PaymentDevices
 * @apiVersion 1.0.0
 *
 * @apiDescription Channel Id (`chennelId`) and ISV Key are returned in full so POS can process payments.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `configId` or string `payDeviceCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Payment device config record
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
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Payment device config not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/payment-devices/:id Update payment device config
 * @apiName UpdatePaymentDevice
 * @apiGroup PaymentDevices
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `configId` or string `payDeviceCode`
 *
 * @apiBody {String}  [payDeviceCode] Unique payment device code
 * @apiBody {String}  [payDeviceName] Payment device name
 * @apiBody {String}  [apiUrl] API URL
 * @apiBody {String}  [apiKey] API key
 * @apiBody {String}  [appId] App ID
 * @apiBody {String}  [appKey] App key
 * @apiBody {String}  [epi] EPI
 * @apiBody {String}  [chennelId] Channel Id
 * @apiBody {String}  [ipAddress] Device IP address
 * @apiBody {Number}  [portNo] Device port
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {String}  [payDeviceType] Device type (`Valor Pay` or `Pax`)
 * @apiBody {String}  [isvKey] ISV key
 * @apiBody {Boolean} [isDeviceLive] Live environment flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "payDeviceName": "Valor Live",
 *   "payDeviceType": "Valor Pay",
 *   "isDeviceLive": true,
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated payment device config
 * @apiSuccess {String}  data.configId Config ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Payment device config not found
 * @apiError (409) Conflict Payment device code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/payment-devices/:id Delete payment device config
 * @apiName DeletePaymentDevice
 * @apiGroup PaymentDevices
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the payment device config (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `configId` or string `payDeviceCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.payDeviceCode Payment device code
 * @apiSuccess {String}  data.configId Config ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Payment device config not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
