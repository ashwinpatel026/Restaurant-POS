import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/modifier-groups/[id]
 * Get a specific modifier group by ID or code
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
 * PUT /api/pos/sync/[storeCode]/modifier-groups/[id]
 * Update a modifier group
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
 * DELETE /api/pos/sync/[storeCode]/modifier-groups/[id]
 * Delete a modifier group
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

