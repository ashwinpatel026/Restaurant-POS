import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/tax List taxes
 * @apiName GetTaxes
 * @apiGroup Tax
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, only return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp to filter updated records (used with incremental)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of tax records returned
 * @apiSuccess {Object[]} data List of tax records
 * @apiSuccess {String}  data.tblTaxId Tax ID (string)
 * @apiSuccess {String}  data.taxCode Tax code
 * @apiSuccess {String}  data.taxname Tax display name
 * @apiSuccess {Number}  data.taxrate Tax rate percentage
 * @apiSuccess {String}  [data.updatedOn] Last update timestamp
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 2,
 *   "data": [
 *     { "tblTaxId": "1", "taxCode": "TAX001", "taxname": "Sales Tax", "taxrate": 8.5 }
 *   ]
 * }
 *
 * @apiError (400) BadRequest Invalid query parameters
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Get query parameters
    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'

    // Build where clause
    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    // Get taxes
    const taxes = await locationPrisma.tax.findMany({
      where,
      orderBy: { updatedOn: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: taxes.length,
      data: taxes.map(tax => ({
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching taxes:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/tax Create tax
 * @apiName CreateTax
 * @apiGroup Tax
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} taxCode Unique tax code
 * @apiBody {String} taxname Tax display name
 * @apiBody {Number} taxrate Tax rate percentage
 * @apiBody {Number} [createdBy] User ID (integer) who created the tax
 *
 * @apiParamExample {json} Request Body
 * {
 *   "taxCode": "TAX001",
 *   "taxname": "Sales Tax",
 *   "taxrate": 8.5,
 *   "createdBy": 1001
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created tax record
 * @apiSuccess (201) {String}  data.tblTaxId Tax ID (string)
 * @apiSuccess (201) {String}  data.taxCode Tax code
 * @apiSuccess (201) {String}  data.taxname Tax display name
 * @apiSuccess (201) {Number}  data.taxrate Tax rate percentage
 *
 * @apiSuccessExample {json} 201 Created
 * {
 *   "success": true,
 *   "message": "Tax created successfully",
 *   "data": {
 *     "tblTaxId": "1",
 *     "taxCode": "TAX001",
 *     "taxname": "Sales Tax",
 *     "taxrate": 8.5
 *   }
 * }
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Tax with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { taxCode, taxname, taxrate, createdBy } = body

    // Validate required fields
    if (!taxCode || !taxname || taxrate === undefined) {
      return NextResponse.json(
        { error: 'taxCode, taxname, and taxrate are required' },
        { status: 400 }
      )
    }

    // Check if tax code already exists
    const existing = await locationPrisma.tax.findUnique({
      where: { taxCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Tax with this code already exists' },
        { status: 409 }
      )
    }

    // Prepare data with POS sync metadata
    const taxData = addPOSSyncMetadata({
      taxCode,
      taxname,
      taxrate: parseFloat(taxrate),
      createdBy: createdBy ? parseInt(createdBy) : null,
      createdDate: new Date()
    }, storeCode)

    // Create tax
    const tax = await locationPrisma.tax.create({
      data: taxData
    })

    return NextResponse.json({
      success: true,
      message: 'Tax created successfully',
      data: {
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

