import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/suggestions List reasons/requests
 * @apiName GetSuggestions
 * @apiGroup ReasonRequestMaster
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
 * @apiSuccess {Number}  count Number of reason/request records returned
 * @apiSuccess {Object[]} data List of reason/request records
 * @apiSuccess {String}  data.suggestionId Reason/Request ID (string)
 * @apiSuccess {String}  data.suggestionCode Reason/Request code
 * @apiSuccess {String}  data.suggestionText Reason/Request text
 * @apiSuccess {String}  [data.category] Category
 * @apiSuccess {Number}  data.isActive Active status (0/1)
 * @apiSuccess {String}  [data.prepZoneCode] Prep zone code
 * @apiSuccess {String}  [data.suggestionDesc] Description
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  [data.createdAt] Creation timestamp
 * @apiSuccess {String}  [data.updatedAt] Last update timestamp
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "server")
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

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'

    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedAt = { gte: new Date(lastSyncAt) }
    }

    const suggestions = await locationPrisma.suggestion.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: suggestions.length,
      data: suggestions.map(suggestion => ({
        ...suggestion,
        suggestionId: suggestion.suggestionId.toString(),
        createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : null,
        updatedAt: suggestion.updatedAt ? suggestion.updatedAt.toISOString() : null
      }))
    })
  } catch (error: any) {
    console.error('Error fetching suggestions (POS sync):', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/suggestions Create reason/request
 * @apiName CreateSuggestion
 * @apiGroup ReasonRequestMaster
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam  {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} suggestionCode Unique reason/request code
 * @apiBody {String} suggestionText Reason/Request text
 * @apiBody {String} [category] Category
 * @apiBody {Number} [isActive=1] Active status (0/1)
 * @apiBody {String} [prepZoneCode] Prep zone code
 * @apiBody {String} [suggestionDesc] Description
 * @apiBody {Boolean} [isDelete=false] Soft delete flag
 * @apiBody {String} [syncId] Unique sync identifier (auto-generated if not provided)
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created reason/request record
 * @apiSuccess (201) {String}  data.suggestionId Reason/Request ID (string)
 * @apiSuccess (201) {String}  data.suggestionCode Reason/Request code
 *
 * @apiError (400) BadRequest Missing or invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Reason/Request with this code already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

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

    const {
      suggestionCode,
      suggestionText,
      category,
      isActive,
      prepZoneCode,
      suggestionDesc,
      isDelete,
      syncId
    } = body

    if (!suggestionCode || !suggestionText) {
      return NextResponse.json(
        { error: 'suggestionCode and suggestionText are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.suggestion.findUnique({
      where: { suggestionCode }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Reason/Request with this code already exists' },
        { status: 409 }
      )
    }

    const suggestion = await locationPrisma.suggestion.create({
      data: {
        suggestionCode,
        suggestionText,
        category: category || null,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        prepZoneCode: prepZoneCode || null,
        suggestionDesc: suggestionDesc || null,
        storeCode,
        isDelete: isDelete !== undefined ? !!isDelete : false,
        syncSource: 'POS',
        syncId: syncId || undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Reason/Request created successfully',
      data: {
        ...suggestion,
        suggestionId: suggestion.suggestionId.toString(),
        createdAt: suggestion.createdAt ? suggestion.createdAt.toISOString() : null,
        updatedAt: suggestion.updatedAt ? suggestion.updatedAt.toISOString() : null
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating suggestion (POS sync):', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Reason/Request with this code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
