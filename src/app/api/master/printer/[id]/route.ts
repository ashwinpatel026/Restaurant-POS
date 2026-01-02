import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map printer response
function mapPrinterResponse(printer: any) {
  return {
    ...printer,
    printerId: printer.printerId.toString(),
    createdBy: printer.createdBy ? printer.createdBy.toString() : null,
    createdOn: printer.createdOn ? printer.createdOn.toISOString() : null,
    updatedBy: printer.updatedBy ? printer.updatedBy.toString() : null,
    updatedOn: printer.updatedOn ? printer.updatedOn.toISOString() : null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const printerId = BigInt(idParam)

    const printer = await masterPrisma.masterPrinter.findUnique({
      where: { printerId: printerId }
    })

    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    }

    return NextResponse.json(mapPrinterResponse(printer))
  } catch (error) {
    console.error('Error fetching printer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const printerId = BigInt(idParam)
    const body = await request.json()

    const { printerName, isActive, isreceipt, isdocument, isKitchen } = body

    if (!printerName) {
      return NextResponse.json(
        { error: 'Printer name is required' },
        { status: 400 }
      )
    }

    const printer = await masterPrisma.masterPrinter.update({
      where: { printerId: printerId },
      data: {
        printerName,
        isActive: isActive ? 1 : 0,
        isreceipt: isreceipt ?? false,
        isdocument: isdocument ?? false,
        isKitchen: isKitchen ?? false,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapPrinterResponse(printer))
  } catch (error: any) {
    console.error('Error updating printer:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const printerId = BigInt(idParam)

    await masterPrisma.masterPrinter.delete({
      where: { printerId: printerId }
    })

    return NextResponse.json({ message: 'Printer deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting printer:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

