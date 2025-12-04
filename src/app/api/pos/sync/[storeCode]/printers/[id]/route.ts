import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/[storeCode]/printers/[id]
 * Get a specific printer by ID or code
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

    // Try to find by ID first, then by printerCode
    let printer = null
    const printerId = BigInt(id)
    
    try {
      printer = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode
        }
      })
    } catch {
      // If BigInt conversion fails, try by code
    }

    if (!printer) {
      printer = await locationPrisma.printer.findUnique({
        where: { printerCode: id }
      })
    }

    if (!printer || printer.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...printer,
        printerId: printer.printerId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/pos/sync/[storeCode]/printers/[id]
 * Update a printer
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

    // Find existing printer
    let existingPrinter = null
    const printerId = BigInt(id)
    
    try {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingPrinter) {
      existingPrinter = await locationPrisma.printer.findUnique({
        where: { printerCode: id }
      })
    }

    if (!existingPrinter || existingPrinter.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    // Prepare update data with POS sync metadata
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingPrinter.syncId

    // Update allowed fields
    if (body.printerName !== undefined) updateData.printerName = body.printerName
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0

    // Update printer
    const updatedPrinter = await locationPrisma.printer.update({
      where: { printerId: existingPrinter.printerId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Printer updated successfully',
      data: {
        ...updatedPrinter,
        printerId: updatedPrinter.printerId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/pos/sync/[storeCode]/printers/[id]
 * Delete a printer
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

    // Find existing printer
    let existingPrinter = null
    const printerId = BigInt(id)
    
    try {
      existingPrinter = await locationPrisma.printer.findFirst({
        where: {
          printerId: printerId,
          storeCode
        }
      })
    } catch {
      // Try by code if BigInt fails
    }

    if (!existingPrinter) {
      existingPrinter = await locationPrisma.printer.findUnique({
        where: { printerCode: id }
      })
    }

    if (!existingPrinter || existingPrinter.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    // Delete printer
    await locationPrisma.printer.delete({
      where: { printerId: existingPrinter.printerId }
    })

    return NextResponse.json({
      success: true,
      message: 'Printer deleted successfully',
      data: {
        printerCode: existingPrinter.printerCode,
        printerId: existingPrinter.printerId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting printer:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

