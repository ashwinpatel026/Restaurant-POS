import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique printer code
async function generatePrinterCode(): Promise<string> {
  // Get the latest printer code from master database
  const latestPrinter = await masterPrisma.masterPrinter.findFirst({
    orderBy: { printerId: 'desc' },
    select: { printerCode: true }
  })

  let nextNumber = 1
  
  if (latestPrinter?.printerCode) {
    // Extract number from code like "P001"
    const match = latestPrinter.printerCode.match(/^P(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as P + padded 3-digit number
  return `P${String(nextNumber).padStart(3, '0')}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const printers = await masterPrisma.masterPrinter.findMany({
      orderBy: { printerName: 'asc' }
    })

    const printersWithStringId = printers.map(mapPrinterResponse)

    return NextResponse.json(printersWithStringId)
  } catch (error) {
    console.error('Error fetching printers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { printerName, isActive } = body

    if (!printerName) {
      return NextResponse.json(
        { error: 'Printer name is required' },
        { status: 400 }
      )
    }

    // Generate unique printer code
    const printerCode = await generatePrinterCode()

    const printer = await masterPrisma.masterPrinter.create({
      data: {
        printerCode: printerCode,
        printerName,
        isActive: isActive ? 1 : 0,
        createdBy: admin.adminId
      }
    })

    return NextResponse.json(mapPrinterResponse(printer), { status: 201 })
  } catch (error: any) {
    console.error('Error creating printer:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Printer code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

