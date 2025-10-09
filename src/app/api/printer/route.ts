import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const printers = await prisma.printer.findMany({
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(printers)
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

    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate printer code automatically
    const printerCode = await generateUniqueCode('printer', 'printerCode')

    const printer = await prisma.printer.create({
      data: {
        printerCode,
        printerName,
        isActive: isActive ? 1 : 0,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(printer, { status: 201 })
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

