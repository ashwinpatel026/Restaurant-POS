import { createPosStationCollectionHandlers, PRINTER_PROFILE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(PRINTER_PROFILE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/printer-profiles List printer profiles
 * @apiName GetPrinterProfiles
 * @apiGroup PrinterProfiles
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns printer profiles for the store (`tbl_printer_profile`).
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
 * @apiSuccess {Object[]} data Printer profiles
 * @apiSuccess {String}  data.profileId Profile ID (string)
 * @apiSuccess {String}  data.profileCode Unique profile code
 * @apiSuccess {String}  data.name Profile name
 * @apiSuccess {String}  data.printerType Printer type (e.g. Receipt, Kitchen)
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
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
 * @api {post} /api/pos/sync/:storeCode/printer-profiles Create printer profile
 * @apiName CreatePrinterProfile
 * @apiGroup PrinterProfiles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} profileCode Unique printer profile code
 * @apiBody {String} name Profile name
 * @apiBody {String} printerType Printer type
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "profileCode": "WLLOC001PRF1",
 *   "name": "Kitchen Profile",
 *   "printerType": "Kitchen",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created printer profile
 * @apiSuccess (201) {String}  data.profileId Profile ID (string)
 * @apiSuccess (201) {String}  data.profileCode Unique profile code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Printer profile code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
