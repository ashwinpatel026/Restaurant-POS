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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const itemId = BigInt(id)
    const item = await (prisma as any).modifierItem.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const data: any = { ...item, id: item.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { id } = await params
    const itemId = BigInt(id)
    const body = await request.json()
    const {
      modifierGroupCode,
      name,
      labelName,
      colorCode,
      price,
      isDefault,
      displayOrder,
      isActive,
    } = body

    const updated = await (prisma as any).modifierItem.update({
      where: { id: itemId },
      data: {
        modifierGroupCode: modifierGroupCode ?? null,
        name: name ?? null,
        labelName: labelName ?? null,
        colorCode: colorCode ?? null,
        price: price ?? null,
        isDefault: typeof isDefault === 'number' ? isDefault : undefined,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : null,
        isActive: typeof isActive === 'number' ? isActive : undefined,
      },
    })

    const data: any = { ...updated, id: updated.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const { id } = await params
    const itemId = BigInt(id)

    const exist = await (prisma as any).modifierItem.findUnique({ where: { id: itemId } })
    if (!exist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await (prisma as any).modifierItem.delete({ where: { id: itemId } })
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


