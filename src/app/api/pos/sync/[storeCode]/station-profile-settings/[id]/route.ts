import { createPosStationItemHandlers, STATION_PROFILE_SETTING_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(STATION_PROFILE_SETTING_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/station-profile-settings/:id Get station profile setting
 * @apiName GetStationProfileSetting
 * @apiGroup StationProfileSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileSettingId` or string `profileSettingCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Station profile setting record
 * @apiSuccess {String}  data.profileSettingId Setting ID (string)
 * @apiSuccess {String}  data.profileSettingCode Unique setting code
 * @apiSuccess {String}  data.stationCode Station code
 * @apiSuccess {String}  data.profileCode Printer profile code
 * @apiSuccess {String}  [data.localPrinterCode] Local printer code
 * @apiSuccess {String}  [data.backupPrinterCode] Backup printer code
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station profile setting not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/station-profile-settings/:id Update station profile setting
 * @apiName UpdateStationProfileSetting
 * @apiGroup StationProfileSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileSettingId` or string `profileSettingCode`
 *
 * @apiBody {String}  [profileSettingCode] Unique setting code
 * @apiBody {String}  [stationCode] Station code
 * @apiBody {String}  [profileCode] Printer profile code
 * @apiBody {String}  [localPrinterCode] Local printer code
 * @apiBody {String}  [backupPrinterCode] Backup printer code
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "profileCode": "WLLOC001PRF1",
 *   "localPrinterCode": "WLLOC001PRT1",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated station profile setting
 * @apiSuccess {String}  data.profileSettingId Setting ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station profile setting not found
 * @apiError (409) Conflict Setting code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/station-profile-settings/:id Delete station profile setting
 * @apiName DeleteStationProfileSetting
 * @apiGroup StationProfileSettings
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the station profile setting (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileSettingId` or string `profileSettingCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.profileSettingCode Setting code
 * @apiSuccess {String}  data.profileSettingId Setting ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Station profile setting not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
