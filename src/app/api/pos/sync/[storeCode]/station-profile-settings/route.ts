import { createPosStationCollectionHandlers, STATION_PROFILE_SETTING_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationCollectionHandlers(STATION_PROFILE_SETTING_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/station-profile-settings List station profile settings
 * @apiName GetStationProfileSettings
 * @apiGroup StationProfileSettings
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns station-to-printer-profile mappings (`tbl_station_profile_setting`).
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
 * @apiSuccess {Object[]} data Station profile settings
 * @apiSuccess {String}  data.profileSettingId Setting ID (string)
 * @apiSuccess {String}  data.profileSettingCode Unique setting code
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.profileCode Printer profile code
 * @apiSuccess {String}  [data.localPrinterCode] Local printer code
 * @apiSuccess {String}  [data.backupPrinterCode] Backup printer code
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
 * @api {post} /api/pos/sync/:storeCode/station-profile-settings Create station profile setting
 * @apiName CreateStationProfileSetting
 * @apiGroup StationProfileSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} profileSettingCode Unique setting code
 * @apiBody {String} stationCode Station code
 * @apiBody {String} profileCode Printer profile code
 * @apiBody {String}  [localPrinterCode] Local printer code
 * @apiBody {String}  [backupPrinterCode] Backup printer code
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "profileSettingCode": "WLLOC001SPS1",
 *   "stationCode": "WMLOC001STA1",
 *   "profileCode": "WLLOC001PRF1",
 *   "localPrinterCode": "WLLOC001PRT1",
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created station profile setting
 * @apiSuccess (201) {String}  data.profileSettingId Setting ID (string)
 * @apiSuccess (201) {String}  data.profileSettingCode Unique setting code
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Setting code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const POST = handlers.POST
