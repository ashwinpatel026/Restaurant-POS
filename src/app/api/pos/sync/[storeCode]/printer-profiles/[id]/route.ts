import { createPosStationItemHandlers, PRINTER_PROFILE_SYNC } from '@/lib/posStationSync'

const handlers = createPosStationItemHandlers(PRINTER_PROFILE_SYNC)

/**
 * @api {get} /api/pos/sync/:storeCode/printer-profiles/:id Get printer profile
 * @apiName GetPrinterProfile
 * @apiGroup PrinterProfiles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileId` or string `profileCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Printer profile record
 * @apiSuccess {String}  data.profileId Profile ID (string)
 * @apiSuccess {String}  data.profileCode Unique profile code
 * @apiSuccess {String}  data.name Profile name
 * @apiSuccess {String}  data.printerType Printer type
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer profile not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const GET = handlers.GET

/**
 * @api {put} /api/pos/sync/:storeCode/printer-profiles/:id Update printer profile
 * @apiName UpdatePrinterProfile
 * @apiGroup PrinterProfiles
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileId` or string `profileCode`
 *
 * @apiBody {String}  [profileCode] Unique printer profile code
 * @apiBody {String}  [name] Profile name
 * @apiBody {String}  [printerType] Printer type
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "name": "Kitchen Profile",
 *   "printerType": "Kitchen",
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated printer profile
 * @apiSuccess {String}  data.profileId Profile ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer profile not found
 * @apiError (409) Conflict Printer profile code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export const PUT = handlers.PUT

/**
 * @api {delete} /api/pos/sync/:storeCode/printer-profiles/:id Delete printer profile
 * @apiName DeletePrinterProfile
 * @apiGroup PrinterProfiles
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the printer profile (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `profileId` or string `profileCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.profileCode Profile code
 * @apiSuccess {String}  data.profileId Profile ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Printer profile not found
 * @apiError (500) InternalServerError Unexpected error
 */
export const DELETE = handlers.DELETE
