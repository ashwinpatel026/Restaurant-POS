import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/tax/:id Get tax
 * @apiName GetTax
 * @apiGroup Tax
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Tax identifier (numeric `tblTaxId` or string `taxCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Tax record
 * @apiSuccess {String}  data.tblTaxId Tax ID (string)
 * @apiSuccess {String}  data.taxCode Tax code
 * @apiSuccess {String}  data.taxname Tax display name
 * @apiSuccess {Number}  data.taxrate Tax rate percentage
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "tblTaxId": "1",
 *     "taxCode": "TAX001",
 *     "taxname": "Sales Tax",
 *     "taxrate": 8.5
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tax not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by ID first, then by taxCode
    let tax = null
    const taxId = parseInt(id)
    
    if (!isNaN(taxId)) {
      tax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!tax) {
      tax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!tax || tax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...tax,
        tblTaxId: tax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/tax/:id Update tax
 * @apiName UpdateTax
 * @apiGroup Tax
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Tax identifier (numeric `tblTaxId` or string `taxCode`)
 *
 * @apiBody {String} [taxname] Tax display name
 * @apiBody {Number} [taxrate] Tax rate percentage
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the tax
 *
 * @apiParamExample {json} Request Body
 * {
 *   "taxname": "Updated Sales Tax",
 *   "taxrate": 8.75,
 *   "updatedBy": 1002
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated tax record
 * @apiSuccess {String}  data.tblTaxId Tax ID (string)
 * @apiSuccess {String}  data.taxCode Tax code
 * @apiSuccess {String}  data.taxname Tax display name
 * @apiSuccess {Number}  data.taxrate Tax rate percentage
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Tax updated successfully",
 *   "data": {
 *     "tblTaxId": "1",
 *     "taxCode": "TAX001",
 *     "taxname": "Updated Sales Tax",
 *     "taxrate": 8.75
 *   }
 * }
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tax not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

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

    // Find existing tax
    const taxId = parseInt(id)
    let existingTax = null

    if (!isNaN(taxId)) {
      existingTax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!existingTax) {
      existingTax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!existingTax || existingTax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingTax.syncId

    if (body.taxname !== undefined) updateData.taxname = body.taxname
    if (body.taxrate !== undefined) updateData.taxrate = parseFloat(body.taxrate)

    // Update tax
    const updatedTax = await locationPrisma.tax.update({
      where: { tblTaxId: existingTax.tblTaxId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Tax updated successfully',
      data: {
        ...updatedTax,
        tblTaxId: updatedTax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/tax/:id Delete tax
 * @apiName DeleteTax
 * @apiGroup Tax
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Tax identifier (numeric `tblTaxId` or string `taxCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.taxCode Tax code
 * @apiSuccess {String}  data.tblTaxId Tax ID (string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Tax deleted successfully",
 *   "data": {
 *     "taxCode": "TAX001",
 *     "tblTaxId": "1"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Tax not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing tax
    const taxId = parseInt(id)
    let existingTax = null

    if (!isNaN(taxId)) {
      existingTax = await locationPrisma.tax.findFirst({
        where: {
          tblTaxId: taxId,
          storeCode
        }
      })
    }

    if (!existingTax) {
      existingTax = await locationPrisma.tax.findUnique({
        where: { taxCode: id }
      })
    }

    if (!existingTax || existingTax.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Tax not found' },
        { status: 404 }
      )
    }

    // Delete tax
    await locationPrisma.tax.delete({
      where: { tblTaxId: existingTax.tblTaxId }
    })

    return NextResponse.json({
      success: true,
      message: 'Tax deleted successfully',
      data: {
        taxCode: existingTax.taxCode,
        tblTaxId: existingTax.tblTaxId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting tax:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

