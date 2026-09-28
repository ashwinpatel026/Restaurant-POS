import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeFee(record: any) {
  return {
    ...record,
    feeId: record.feeId.toString(),
    feeValue: record.feeValue != null ? Number(record.feeValue) : null,
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null
  }
}

function posFeeMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  return result
}

async function findFee(storeCode: string, id: string) {
  if (/^\d+$/.test(id)) {
    const byId = await locationPrisma.feeMaster.findFirst({
      where: { feeId: BigInt(id), storeCode, isDelete: false }
    })
    if (byId) return byId
  }

  return locationPrisma.feeMaster.findFirst({
    where: { feeCode: id, storeCode, isDelete: false }
  })
}

/**
 * @api {get} /api/pos/sync/:storeCode/fees/:id Get fee
 * @apiName GetFee
 * @apiGroup Fees
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `feeId` or string `feeCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Fee record
 * @apiSuccess {String}  data.feeId Fee ID (string)
 * @apiSuccess {String}  data.feeCode Unique fee code
 * @apiSuccess {String}  [data.feeName] Fee name
 * @apiSuccess {String}  data.feeType Fee type
 * @apiSuccess {String}  [data.dollarPer] Value mode (`Percent` or `Dollar`)
 * @apiSuccess {Number}  [data.feeValue] Fee value
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Fee not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const fee = await findFee(storeCode, id)
    if (!fee || fee.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeFee(fee)
    })
  } catch (error: any) {
    console.error('Error fetching fee:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/fees/:id Update fee
 * @apiName UpdateFee
 * @apiGroup Fees
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `feeId` or string `feeCode`
 *
 * @apiBody {String}  [feeCode] Unique fee code
 * @apiBody {String}  [feeName] Fee name
 * @apiBody {String}  [feeType] Fee type
 * @apiBody {String}  [dollarPer] Value mode (`Percent` or `Dollar`)
 * @apiBody {Number}  [feeValue] Fee value
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "feeName": "Service Charge",
 *   "dollarPer": "Percent",
 *   "feeValue": 12,
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated fee
 * @apiSuccess {String}  data.feeId Fee ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Fee not found
 * @apiError (409) Conflict Fee code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const existing = await findFee(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }

    const nextCode = body.feeCode || body.fee_code
    if (nextCode && nextCode !== existing.feeCode) {
      const conflict = await locationPrisma.feeMaster.findUnique({
        where: { feeCode: nextCode }
      })
      if (conflict && String(conflict.feeId) !== String(existing.feeId)) {
        return NextResponse.json(
          { error: 'Fee with this code already exists' },
          { status: 409 }
        )
      }
    }

    const payload: any = {
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }

    if (nextCode !== undefined) payload.feeCode = nextCode
    if (body.feeName !== undefined || body.fee_name !== undefined) {
      payload.feeName = body.feeName || body.fee_name || null
    }
    if (body.feeType !== undefined || body.fee_type !== undefined) {
      payload.feeType = body.feeType || body.fee_type
    }
    if (body.dollarPer !== undefined || body.dollar_per !== undefined) {
      payload.dollarPer = body.dollarPer || body.dollar_per || 'Percent'
    }
    if (body.feeValue !== undefined) {
      payload.feeValue =
        body.feeValue === null || body.feeValue === ''
          ? 0
          : parseFloat(String(body.feeValue))
    }
    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true

    const updateData = posFeeMeta(payload, storeCode)
    updateData.syncId = existing.syncId

    const updated = await locationPrisma.feeMaster.update({
      where: { feeId: existing.feeId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Fee updated successfully',
      data: serializeFee(updated)
    })
  } catch (error: any) {
    console.error('Error updating fee:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/fees/:id Delete fee
 * @apiName DeleteFee
 * @apiGroup Fees
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the fee (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `feeId` or string `feeCode`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.feeCode Fee code
 * @apiSuccess {String}  data.feeId Fee ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Fee not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existing = await findFee(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Fee not found' },
        { status: 404 }
      )
    }

    await locationPrisma.feeMaster.update({
      where: { feeId: existing.feeId },
      data: posFeeMeta(
        {
          isDelete: true,
          isActive: false,
          syncId: existing.syncId
        },
        storeCode
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Fee deleted successfully',
      data: {
        feeCode: existing.feeCode,
        feeId: existing.feeId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting fee:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
