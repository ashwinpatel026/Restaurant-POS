import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/modifier-groups/:id Get modifier group
 * @apiName GetModifierGroup
 * @apiGroup ModifierGroups
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier group identifier (BigInt `id` or `modifierGroupCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Modifier group record
 * @apiSuccess {String}  data.id Modifier group ID (string)
 * @apiSuccess {String}  data.modifierGroupCode Modifier group code
 * @apiSuccess {String}  data.groupName Display name
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier group not found
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

    // Try to find by ID first, then by modifierGroupCode
    let modifierGroup = null
    const groupId = BigInt(id)
    
    try {
      modifierGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          id: groupId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!modifierGroup) {
      modifierGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          modifierGroupCode: id,
          storeCode
        }
      })
    }

    if (!modifierGroup || modifierGroup.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...modifierGroup,
        id: modifierGroup.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching modifier group:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/modifier-groups/:id Update modifier group
 * @apiName UpdateModifierGroup
 * @apiGroup ModifierGroups
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier group identifier (BigInt `id` or `modifierGroupCode`)
 *
 * @apiBody {String} [groupName] Group display name
 * @apiBody {String} [labelName] Label name
 * @apiBody {Boolean} [isRequired] Whether selection is required
 * @apiBody {Boolean} [isMultiselect] Allow multiple selections
 * @apiBody {Number} [minSelection] Minimum selections
 * @apiBody {Number} [maxSelection] Maximum selections
 * @apiBody {Number} [priceStrategy] Pricing strategy
 * @apiBody {Number} [price] Additional price
 * @apiBody {String} [prefix] Display prefix
 * @apiBody {Number|Boolean} [isActive] Active flag (1/0 or true/false)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "groupName": "Add-ons",
 *   "isRequired": true,
 *   "maxSelection": 2
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated modifier group
 * @apiSuccess {String}  data.id Modifier group ID (string)
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier group not found
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

    // Find existing modifier group
    let existingGroup = null
    const groupId = BigInt(id)
    
    try {
      existingGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          id: groupId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingGroup) {
      existingGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          modifierGroupCode: id,
          storeCode
        }
      })
    }

    if (!existingGroup || existingGroup.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({}, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingGroup.syncId

    // Update allowed fields
    if (body.groupName !== undefined) updateData.groupName = body.groupName
    if (body.labelName !== undefined) updateData.labelName = body.labelName
    if (body.isRequired !== undefined) updateData.isRequired = body.isRequired ? 1 : 0
    if (body.isMultiselect !== undefined) updateData.isMultiselect = body.isMultiselect ? 1 : 0
    if (body.minSelection !== undefined) updateData.minSelection = body.minSelection
    if (body.maxSelection !== undefined) updateData.maxSelection = body.maxSelection
    if (body.priceStrategy !== undefined) updateData.priceStrategy = body.priceStrategy
    if (body.price !== undefined) updateData.price = body.price ? parseFloat(body.price) : null
    if (body.prefix !== undefined) updateData.prefix = body.prefix
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0

    // Update modifier group
    const updatedGroup = await locationPrisma.modifierGroup.update({
      where: { id: existingGroup.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Modifier group updated successfully',
      data: {
        ...updatedGroup,
        id: updatedGroup.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating modifier group:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/modifier-groups/:id Delete modifier group
 * @apiName DeleteModifierGroup
 * @apiGroup ModifierGroups
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Modifier group identifier (BigInt `id` or `modifierGroupCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.modifierGroupCode Modifier group code
 * @apiSuccess {String}  data.id Modifier group ID (string)
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Modifier group not found
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

    // Find existing modifier group
    let existingGroup = null
    const groupId = BigInt(id)
    
    try {
      existingGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          id: groupId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingGroup) {
      existingGroup = await locationPrisma.modifierGroup.findFirst({
        where: {
          modifierGroupCode: id,
          storeCode
        }
      })
    }

    if (!existingGroup || existingGroup.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    // Delete modifier group
    await locationPrisma.modifierGroup.delete({
      where: { id: existingGroup.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Modifier group deleted successfully',
      data: {
        modifierGroupCode: existingGroup.modifierGroupCode,
        id: existingGroup.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting modifier group:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

