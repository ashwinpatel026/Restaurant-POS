import { createPosStationCollectionHandlers, TENDER_TYPE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(TENDER_TYPE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/tenders List tender types
 * @apiName GetTenders
 * @apiGroup Tenders
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns tender types (`tbl_tender_type`) such as Cash, Card, Gift Card, and External Pay.
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
 * @apiSuccess {Object[]} data Tender types
 * @apiSuccess {String}  data.tenderTypeId Tender type ID (string)
 * @apiSuccess {String}  data.tenderCode Unique tender code
 * @apiSuccess {String}  data.tenderName Tender display name
 * @apiSuccess {String}  [data.tenderType] Tender type (`Cash`, `Card`, `Gift Card`, `External Pay`)
 * @apiSuccess {String}  [data.deviceSelectionCode] Payment device selection code
 * @apiSuccess {String}  [data.cashDrawerCode] Cash drawer code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Number}  data.displayOrder Display order
 * @apiSuccess {String}  [data.stationCode] Station code
 * @apiSuccess {String}  [data.externalPayCode] External pay code (External Pay tenders)
 * @apiSuccess {Boolean} data.requiresDevice Requires payment device
 * @apiSuccess {Boolean} data.allowTip Allow tip
 * @apiSuccess {String}  [data.feeCode] Fee code
 * @apiSuccess {Number}  data.surchargePer Surcharge percent
 * @apiSuccess {Number}  data.preAuthAmount Pre-auth amount
 * @apiSuccess {Boolean} data.preAuthAllow Pre-auth allowed
 * @apiSuccess {Boolean} data.signatureAllow Signature allowed
 * @apiSuccess {Boolean} data.taxExempt Tax exempt flag
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
 * @api {post} /api/pos/sync/:storeCode/tenders Create tender type
 * @apiName CreateTender
 * @apiGroup Tenders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} tenderCode Unique tender code
 * @apiBody {String} tenderName Tender display name
 * @apiBody {String}  [tenderType] Tender type (`Cash`, `Card`, `Gift Card`, `External Pay`)
 * @apiBody {String}  [deviceSelectionCode] Payment device selection code
 * @apiBody {String}  [cashDrawerCode] Cash drawer code
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [displayOrder=0] Display order
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {String}  [externalPayCode] External pay code
 * @apiBody {Boolean} [requiresDevice=false] Requires payment device
 * @apiBody {Boolean} [allowTip=false] Allow tip
 * @apiBody {String}  [feeCode] Fee code
 * @apiBody {Number}  [surchargePer=0] Surcharge percent
 * @apiBody {Number}  [preAuthAmount=0] Pre-auth amount
 * @apiBody {Boolean} [preAuthAllow=false] Pre-auth allowed
 * @apiBody {Boolean} [signatureAllow=false] Signature allowed
 * @apiBody {Boolean} [taxExempt=false] Tax exempt flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "tenderCode": "WLLOC001TND1",
 *   "tenderName": "Cash",
 *   "tenderType": "Cash",
 *   "cashDrawerCode": "WLLOC001CDW1",
 *   "isActive": true,
 *   "displayOrder": 1
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created tender type
 * @apiSuccess (201) {String}  data.tenderTypeId Tender type ID (string)
 * @apiSuccess (201) {String}  data.tenderCode Unique tender code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Tender code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
