import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// GET /api/tables → list all tables (most recent first)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // @ts-ignore - generated client exposes `table` for model `Table`
    const tables = await prisma.table.findMany({
      orderBy: { createdDate: 'desc' },
    })

    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tables → create a new table
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tableNumber, seatingCapacity, location, status } = body

    if (!tableNumber || !seatingCapacity) {
      return NextResponse.json(
        { error: 'tableNumber and seatingCapacity are required' },
        { status: 400 }
      )
    }

    // @ts-ignore - generated client exposes `table` for model `Table`
    const table = await prisma.table.create({
      data: {
        tableNumber,
        seatingCapacity: Number(seatingCapacity),
        currentOccupancy: 0,
        location: location || null,
        status: typeof status === 'number' ? status : 0,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        storeCode: process.env.STORE_CODE || null,
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error: any) {
    console.error('Error creating table:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Table number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


