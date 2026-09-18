import { createPosStationItemHandlers, TENDER_TYPE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(TENDER_TYPE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/tenders/:id Get tender type
 * @apiName GetTender
 * @apiGroup Tenders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `tenderTypeId` or string `tenderCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Tender type record
 * @apiSuccess {String}  data.tenderTypeId Tender type ID (string)
 * @apiSuccess {String}  data.tenderCode Unique tender code
 * @apiSuccess {String}  data.tenderName Tender display name
 * @apiSuccess {String}  [data.tenderType] Tender type (`Cash`, `Card`, `Gift Card`, `External Pay`)
 * @apiSuccess {String}  [data.deviceSelectionCode] Payment device selection code
 * @apiSuccess {String}  [data.cashDrawerCode] Cash drawer code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Number}  data.displayOrder Display order
 * @apiSuccess {String}  [data.externalPayCode] External pay code
 * @apiSuccess {Boolean} data.requiresDevice Requires payment device
 * @apiSuccess {Boolean} data.allowTip Allow tip
 * @apiSuccess {String}  [data.feeCode] Fee code
 * @apiSuccess {Number}  data.surchargePer Surcharge percent
 * @apiSuccess {Number}  data.preAuthAmount Pre-auth amount
 * @apiSuccess {Boolean} data.preAuthAllow Pre-auth allowed
 * @apiSuccess {Boolean} data.signatureAllow Signature allowed
 * @apiSuccess {Boolean} data.taxExempt Tax exempt flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tender type not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/tenders/:id Update tender type
 * @apiName UpdateTender
 * @apiGroup Tenders
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `tenderTypeId` or string `tenderCode`
 *
 * @apiBody {String}  [tenderCode] Unique tender code
 * @apiBody {String}  [tenderName] Tender display name
 * @apiBody {String}  [tenderType] Tender type (`Cash`, `Card`, `Gift Card`, `External Pay`)
 * @apiBody {String}  [deviceSelectionCode] Payment device selection code
 * @apiBody {String}  [cashDrawerCode] Cash drawer code
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number}  [displayOrder] Display order
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {String}  [externalPayCode] External pay code
 * @apiBody {Boolean} [requiresDevice] Requires payment device
 * @apiBody {Boolean} [allowTip] Allow tip
 * @apiBody {String}  [feeCode] Fee code
 * @apiBody {Number}  [surchargePer] Surcharge percent
 * @apiBody {Number}  [preAuthAmount] Pre-auth amount
 * @apiBody {Boolean} [preAuthAllow] Pre-auth allowed
 * @apiBody {Boolean} [signatureAllow] Signature allowed
 * @apiBody {Boolean} [taxExempt] Tax exempt flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "tenderName": "Cash",
 *   "tenderType": "Cash",
 *   "isActive": true,
 *   "displayOrder": 1
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated tender type
 * @apiSuccess {String}  data.tenderTypeId Tender type ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tender type not found
 * @apiError (409) Conflict Tender code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/tenders/:id Delete tender type
 * @apiName DeleteTender
 * @apiGroup Tenders
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the tender type (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `tenderTypeId` or string `tenderCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.tenderCode Tender code
 * @apiSuccess {String}  data.tenderTypeId Tender type ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tender type not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
