import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/prep-zones/[id]
 * Get a specific prep zone by ID or code
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

    // Try to find by ID first, then by prepZoneCode
    let prepZone = null
    const zoneId = BigInt(id)
    
    try {
      prepZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!prepZone) {
      prepZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!prepZone || prepZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...prepZone,
        prepZoneId: prepZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/prep-zones/[id]
 * Update a prep zone
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

    // Find existing prep zone
    let existingZone = null
    const zoneId = BigInt(id)
    
    try {
      existingZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingZone) {
      existingZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!existingZone || existingZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? parseInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingZone.syncId

    // Update allowed fields
    if (body.prepZoneName !== undefined) updateData.prepZoneName = body.prepZoneName
    if (body.stationCode !== undefined) updateData.stationCode = body.stationCode
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.sendToExpediter !== undefined) updateData.sendToExpediter = body.sendToExpediter ? 1 : 0
    if (body.alwaysPrintTicket !== undefined) updateData.alwaysPrintTicket = body.alwaysPrintTicket ? 1 : 0
    if (body.printerCode !== undefined) updateData.printerCode = body.printerCode
    if (body.backupPrinterCode !== undefined) updateData.backupPrinterCode = body.backupPrinterCode

    // Update prep zone
    const updatedZone = await locationPrisma.prepZone.update({
      where: { prepZoneId: existingZone.prepZoneId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone updated successfully',
      data: {
        ...updatedZone,
        prepZoneId: updatedZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/prep-zones/[id]
 * Delete a prep zone
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

    // Find existing prep zone
    let existingZone = null
    const zoneId = BigInt(id)
    
    try {
      existingZone = await locationPrisma.prepZone.findFirst({
        where: {
          prepZoneId: zoneId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingZone) {
      existingZone = await locationPrisma.prepZone.findUnique({
        where: { prepZoneCode: id }
      })
    }

    if (!existingZone || existingZone.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Prep zone not found' },
        { status: 404 }
      )
    }

    // Delete prep zone
    await locationPrisma.prepZone.delete({
      where: { prepZoneId: existingZone.prepZoneId }
    })

    return NextResponse.json({
      success: true,
      message: 'Prep zone deleted successfully',
      data: {
        prepZoneCode: existingZone.prepZoneCode,
        prepZoneId: existingZone.prepZoneId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting prep zone:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

