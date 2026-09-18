import { createPosStationItemHandlers, EXTERNAL_PAY_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(EXTERNAL_PAY_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/external-pays/:id Get external pay master
 * @apiName GetExternalPay
 * @apiGroup ExternalPays
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `externalPayId` or string `externalPayCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data External pay master record
 * @apiSuccess {String}  data.externalPayId External pay ID (string)
 * @apiSuccess {String}  data.externalPayCode Unique external pay code
 * @apiSuccess {String}  [data.externalPayName] External pay name
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound External pay not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/external-pays/:id Update external pay master
 * @apiName UpdateExternalPay
 * @apiGroup ExternalPays
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `externalPayId` or string `externalPayCode`
 *
 * @apiBody {String}  [externalPayCode] Unique external pay code
 * @apiBody {String}  [externalPayName] External pay name
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "externalPayName": "Uber Eats",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated external pay master
 * @apiSuccess {String}  data.externalPayId External pay ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound External pay not found
 * @apiError (409) Conflict External pay code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/external-pays/:id Delete external pay master
 * @apiName DeleteExternalPay
 * @apiGroup ExternalPays
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the external pay master (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `externalPayId` or string `externalPayCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.externalPayCode External pay code
 * @apiSuccess {String}  data.externalPayId External pay ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound External pay not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
