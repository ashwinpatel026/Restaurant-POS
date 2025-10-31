import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// PUT /api/tables/[id] → update full record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = Number(idParam)
    const body = await request.json()
    const { tableNumber, seatingCapacity, location, status, currentOccupancy } = body

    // @ts-ignore - generated client exposes `table` for model `Table`
    const updated = await prisma.table.update({
      where: { tableId: id },
      data: {
        tableNumber,
        seatingCapacity: typeof seatingCapacity === 'number' ? seatingCapacity : undefined,
        location: location ?? undefined,
        status: typeof status === 'number' ? status : undefined,
        currentOccupancy: typeof currentOccupancy === 'number' ? currentOccupancy : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating table:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Table number already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/tables/[id] → partial update (commonly for status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = Number(idParam)
    const body = await request.json()

    // @ts-ignore - generated client exposes `table` for model `Table`
    const updated = await prisma.table.update({
      where: { tableId: id },
      data: {
        status: typeof body.status === 'number' ? body.status : undefined,
        currentOccupancy: typeof body.currentOccupancy === 'number' ? body.currentOccupancy : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error patching table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tables/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = Number(idParam)
    // @ts-ignore - generated client exposes `table` for model `Table`
    await prisma.table.delete({ where: { tableId: id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


