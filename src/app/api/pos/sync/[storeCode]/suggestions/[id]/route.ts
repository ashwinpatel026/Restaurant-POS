import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/suggestions/:id Get reason/request
 * @apiName GetSuggestion
 * @apiGroup ReasonRequestMaster
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Reason/Request identifier (numeric `suggestionId` or string `suggestionCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Reason/Request record
 * @apiSuccess {String}  data.suggestionId Reason/Request ID (string)
 * @apiSuccess {String}  data.suggestionCode Reason/Request code
 * @apiSuccess {String}  data.suggestionText Reason/Request text
 * @apiSuccess {Number}  data.isActive Active status (0/1)
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "server")
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Reason/Request not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let suggestion = null
    const numericId = Number(id)

    if (!Number.isNaN(numericId)) {
      suggestion = await locationPrisma.suggestion.findFirst({
        where: {
          suggestionId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!suggestion) {
      suggestion = await locationPrisma.suggestion.findFirst({
        where: { suggestionCode: id, storeCode }
      })
    }

    if (!suggestion) {
      return NextResponse.json(
        { error: 'Reason/Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...suggestion,
        suggestionId: suggestion.suggestionId.toString(),
        createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : null,
        updatedAt: suggestion.updatedAt ? suggestion.updatedAt.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching suggestion (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/suggestions/:id Update reason/request
 * @apiName UpdateSuggestion
 * @apiGroup ReasonRequestMaster
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Reason/Request identifier (numeric `suggestionId` or string `suggestionCode`)
 *
 * @apiBody {String} [suggestionText] Reason/Request text
 * @apiBody {String} [category] Category
 * @apiBody {Number} [isActive] Active status (0/1)
 * @apiBody {String} [prepZoneCode] Prep zone code
 * @apiBody {String} [suggestionDesc] Description
 * @apiBody {Boolean} [isDelete] Soft delete flag
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated reason/request record
 * @apiSuccess {String}  data.suggestionId Reason/Request ID (string)
 * @apiSuccess {String}  data.suggestionCode Reason/Request code
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Reason/Request not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

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
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { suggestionText, category, isActive, prepZoneCode, suggestionDesc, isDelete } = body

    const numericId = Number(id)
    let existingSuggestion = null

    if (!Number.isNaN(numericId)) {
      existingSuggestion = await locationPrisma.suggestion.findFirst({
        where: {
          suggestionId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingSuggestion) {
      existingSuggestion = await locationPrisma.suggestion.findFirst({
        where: { suggestionCode: id, storeCode }
      })
    }

    if (!existingSuggestion) {
      return NextResponse.json(
        { error: 'Reason/Request not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      storeCode,
      syncSource: 'POS',
      syncId: existingSuggestion.syncId
    }

    if (suggestionText !== undefined) updateData.suggestionText = suggestionText
    if (category !== undefined) updateData.category = category || null
    if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0
    if (prepZoneCode !== undefined) updateData.prepZoneCode = prepZoneCode || null
    if (suggestionDesc !== undefined) updateData.suggestionDesc = suggestionDesc || null
    if (isDelete !== undefined) updateData.isDelete = !!isDelete

    const updatedSuggestion = await locationPrisma.suggestion.update({
      where: { suggestionId: existingSuggestion.suggestionId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Reason/Request updated successfully',
      data: {
        ...updatedSuggestion,
        suggestionId: updatedSuggestion.suggestionId.toString(),
        createdAt: updatedSuggestion.createdAt
          ? updatedSuggestion.createdAt.toISOString()
          : null,
        updatedAt: updatedSuggestion.updatedAt
          ? updatedSuggestion.updatedAt.toISOString()
          : null
      }
    })
  } catch (error: any) {
    console.error('Error updating suggestion (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/suggestions/:id Delete reason/request
 * @apiName DeleteSuggestion
 * @apiGroup ReasonRequestMaster
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Reason/Request identifier (numeric `suggestionId` or string `suggestionCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted reason/request identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Reason/Request not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const numericId = Number(id)
    let existingSuggestion = null

    if (!Number.isNaN(numericId)) {
      existingSuggestion = await locationPrisma.suggestion.findFirst({
        where: {
          suggestionId: BigInt(numericId),
          storeCode
        }
      })
    }

    if (!existingSuggestion) {
      existingSuggestion = await locationPrisma.suggestion.findFirst({
        where: { suggestionCode: id, storeCode }
      })
    }

    if (!existingSuggestion) {
      return NextResponse.json(
        { error: 'Reason/Request not found' },
        { status: 404 }
      )
    }

    await locationPrisma.suggestion.delete({
      where: { suggestionId: existingSuggestion.suggestionId }
    })

    return NextResponse.json({
      success: true,
      message: 'Reason/Request deleted successfully',
      data: {
        suggestionCode: existingSuggestion.suggestionCode,
        suggestionId: existingSuggestion.suggestionId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting suggestion (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
