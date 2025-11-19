import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map modifier item response
function mapModifierItemResponse(item: any) {
  return {
    ...item,
    id: item.id.toString(),
    price: item.price ? item.price.toString() : null,
    createdBy: item.createdBy ? item.createdBy.toString() : null,
    createdOn: item.createdOn ? item.createdOn.toISOString() : null,
    updatedBy: item.updatedBy ? item.updatedBy.toString() : null,
    updatedOn: item.updatedOn ? item.updatedOn.toISOString() : null
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
    const itemId = BigInt(idParam)

    const item = await masterPrisma.masterModifierItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    return NextResponse.json(mapModifierItemResponse(item))
  } catch (error) {
    console.error('Error fetching modifier item:', error)
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
    const itemId = BigInt(idParam)
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

    const updated = await masterPrisma.masterModifierItem.update({
      where: { id: itemId },
      data: {
        modifierGroupCode: modifierGroupCode ?? null,
        name: name ?? null,
        labelName: labelName ?? null,
        colorCode: colorCode ?? null,
        price: price ? parseFloat(price.toString()) : null,
        isDefault: typeof isDefault === 'number' ? isDefault : undefined,
        displayOrder: typeof displayOrder === 'number' ? displayOrder : null,
        isActive: typeof isActive === 'number' ? isActive : undefined,
        updatedBy: admin.adminId,
        updatedOn: new Date(),
      },
    })

    return NextResponse.json(mapModifierItemResponse(updated))
  } catch (error: any) {
    console.error('Error updating modifier item:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier item not found' },
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
    const itemId = BigInt(idParam)

    const item = await masterPrisma.masterModifierItem.findUnique({
      where: { id: itemId }
    })

    if (!item) {
      return NextResponse.json({ error: 'Modifier item not found' }, { status: 404 })
    }

    await masterPrisma.masterModifierItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ message: 'Modifier item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting modifier item:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Modifier item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

