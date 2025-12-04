import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/tables/[id]
 * Get a specific table by ID or table number
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

    // Try to find by ID first, then by tableNumber
    let table = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      table = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!table) {
      table = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!table || table.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...table,
        tableId: table.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/tables/[id]
 * Update a table
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

    // Find existing table
    let existingTable = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      existingTable = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!existingTable) {
      existingTable = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!existingTable || existingTable.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}

    if (body.seatingCapacity !== undefined) updateData.seatingCapacity = parseInt(body.seatingCapacity)
    if (body.currentOccupancy !== undefined) updateData.currentOccupancy = parseInt(body.currentOccupancy)
    if (body.location !== undefined) updateData.location = body.location
    if (body.status !== undefined) updateData.status = parseInt(body.status)

    // Update table
    const updatedTable = await locationPrisma.table.update({
      where: { tableId: existingTable.tableId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Table updated successfully',
      data: {
        ...updatedTable,
        tableId: updatedTable.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/tables/[id]
 * Delete a table
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

    // Find existing table
    let existingTable = null
    const tableId = parseInt(id)
    
    if (!isNaN(tableId)) {
      existingTable = await locationPrisma.table.findFirst({
        where: {
          tableId: tableId,
          storeCode
        }
      })
    }

    if (!existingTable) {
      existingTable = await locationPrisma.table.findUnique({
        where: { tableNumber: id }
      })
    }

    if (!existingTable || existingTable.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Delete table
    await locationPrisma.table.delete({
      where: { tableId: existingTable.tableId }
    })

    return NextResponse.json({
      success: true,
      message: 'Table deleted successfully',
      data: {
        tableNumber: existingTable.tableNumber,
        tableId: existingTable.tableId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

