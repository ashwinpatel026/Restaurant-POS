import { createPosStationCollectionHandlers, EXTERNAL_PAY_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(EXTERNAL_PAY_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/external-pays List external pay masters
 * @apiName GetExternalPays
 * @apiGroup ExternalPays
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns external pay masters (`tbl_external_pay_master`) used by External Pay tenders.
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
 * @apiSuccess {Object[]} data External pay masters
 * @apiSuccess {String}  data.externalPayId External pay ID (string)
 * @apiSuccess {String}  data.externalPayCode Unique external pay code
 * @apiSuccess {String}  [data.externalPayName] External pay name
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {Boolean} data.isActive Active flag
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
 * @api {post} /api/pos/sync/:storeCode/external-pays Create external pay master
 * @apiName CreateExternalPay
 * @apiGroup ExternalPays
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} externalPayCode Unique external pay code
 * @apiBody {String}  [externalPayName] External pay name
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "externalPayCode": "WLLOC001EPM1",
 *   "externalPayName": "Uber Eats",
 *   "stationCode": "WMLOC001STA1",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created external pay master
 * @apiSuccess (201) {String}  data.externalPayId External pay ID (string)
 * @apiSuccess (201) {String}  data.externalPayCode Unique external pay code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict External pay code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
