import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  buildStoreFilter,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique printer code
async function generatePrinterCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}PRT`
  
  // Get all printer codes that match the WL pattern for this store
  const printers = await prisma.printer.findMany({
    where: {
      printerCode: {
        startsWith: prefix
      }
    },
    select: { printerCode: true },
    orderBy: { printerId: 'desc' }
  })

  let nextNumber = 1
  
  if (printers.length > 0) {
    // Extract number from codes like "WLLOC01PRT1", "WLLOC01PRT2", etc.
    const numbers = printers
      .map(printer => {
        const match = printer.printerCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter(num => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + PRT + number starting from 1
  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const printers = await prisma.printer.findMany({
      where: {
        ...storeFilter,
      },
      orderBy: { createdOn: 'desc' },
    })

    // Serialize BigInt to string
    const serializedPrinters = printers.map(printer => ({
      ...printer,
      printerId: printer.printerId.toString(),
      updatedBy: printer.updatedBy ? printer.updatedBy.toString() : null
    }))

    return NextResponse.json(serializedPrinters)
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { printerName, isActive } = body

    // Validate required fields
    if (!printerName) {
      return NextResponse.json(
        { error: 'Printer name is required' },
        { status: 400 }
      )
    }

    // Generate unique printer code for the selected store
    const printerCode = await generatePrinterCode(selectedStoreCode)

    const printer = await prisma.printer.create({
      data: {
        printerCode,
        printerName,
        isActive: isActive ? 1 : 0,
        createdBy: parseInt(session.user.id),
        storeCode: selectedStoreCode,
        // Mark records created from dashboard/location
        syncSource: 'location',
      }
    })

    // Serialize BigInt to string
    const serializedPrinter = {
      ...printer,
      printerId: printer.printerId.toString(),
      updatedBy: printer.updatedBy ? printer.updatedBy.toString() : null
    }

    return NextResponse.json(serializedPrinter, { status: 201 })
  } catch (error: any) {
    console.error('Error creating printer:', error)
    
    // Handle unique constraint violation
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

