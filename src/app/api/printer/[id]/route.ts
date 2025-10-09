import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const printerId = parseInt(resolvedParams.id)

    const printer = await prisma.printer.findUnique({
      where: { printerId }
    })

    if (!printer) {
      return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    }

    return NextResponse.json(printer)
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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const printerId = parseInt(resolvedParams.id)
    const body = await request.json()

    const { printerName, isActive } = body

    // Validate required fields
    if (!printerName) {
      return NextResponse.json(
        { error: 'Printer name is required' },
        { status: 400 }
      )
    }

    // Update printer (printer code cannot be changed)
    const printer = await prisma.printer.update({
      where: { printerId },
      data: {
        printerName,
        isActive: isActive ? 1 : 0,
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(printer)
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
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const printerId = parseInt(resolvedParams.id)

    await prisma.printer.delete({
      where: { printerId }
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

