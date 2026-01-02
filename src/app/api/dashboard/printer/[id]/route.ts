import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
  checkLocationPermission,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view printers
    if (!(await checkLocationPermission(session.user.role, 'printers.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const printerId = BigInt(resolvedParams.id)

    const printer = await prisma.printer.findUnique({
      where: { printerId },
    })

    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    }

    // If storeCode is provided, verify the printer belongs to that store or user has access
    if (selectedStoreCode && printer.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, printer.storeCode || '')) {
        return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
      }
    }

    // Serialize BigInt to string
    const serializedPrinter = {
      ...printer,
      printerId: printer.printerId.toString(),
    }

    return NextResponse.json(serializedPrinter)
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update printers
    if (!(await checkLocationPermission(session.user.role, 'printers.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    const resolvedParams = await params
    const printerId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { printerName, isActive, isreceipt, isdocument, isKitchen } = body

    // Validate required fields
    if (!printerName) {
      return NextResponse.json(
        { error: 'Printer name is required' },
        { status: 400 }
      )
    }

    // First check if printer exists and belongs to a store the user can access
    const existingPrinter = await prisma.printer.findUnique({
      where: { printerId },
    })

    if (!existingPrinter) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    }

    if (
      existingPrinter.storeCode &&
      !canAccessStore(accessInfo, existingPrinter.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update printer (printer code cannot be changed)
    const printer = await prisma.printer.update({
      where: { printerId },
      data: {
        printerName,
        isActive: isActive ? 1 : 0,
        isreceipt: isreceipt ?? false,
        isdocument: isdocument ?? false,
        isKitchen: isKitchen ?? false,
        // Keep the original storeCode, don't change it; if empty, set to selected store
        storeCode: existingPrinter.storeCode || selectedStoreCode,
        // Mark updates from dashboard/location
        syncSource: 'location',
      },
    })

    // Serialize BigInt to string
    const serializedPrinter = {
      ...printer,
      printerId: printer.printerId.toString(),
    }

    return NextResponse.json(serializedPrinter)
  } catch (error: any) {
    console.error('Error updating printer:', error)

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete printers
    if (!(await checkLocationPermission(session.user.role, 'printers.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const printerId = BigInt(resolvedParams.id)

    // First check if printer exists and user has access
    const existingPrinter = await prisma.printer.findUnique({
      where: { printerId },
    })

    if (!existingPrinter) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    }

    if (
      existingPrinter.storeCode &&
      !canAccessStore(accessInfo, existingPrinter.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.printer.delete({
      where: { printerId },
    })

    return NextResponse.json({ message: 'Printer deleted successfully' })
  } catch (error) {
    console.error('Error deleting printer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

