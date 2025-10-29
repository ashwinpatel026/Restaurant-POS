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
    const groupId = BigInt(resolvedParams.id)

    const group = await (prisma as any).modifierGroup.findUnique({
      where: { id: groupId }
    })

    if (!group) {
      return NextResponse.json({ error: 'Modifier group not found' }, { status: 404 })
    }

    // Load items by group code if available
    let items: any[] = []
    if (group.modifierGroupCode) {
      const found = await (prisma as any).modifierItem.findMany({
        where: { modifierGroupCode: group.modifierGroupCode },
        orderBy: [{ displayOrder: 'asc' }, { createdOn: 'desc' }]
      })
      items = found.map((i: any) => ({ ...i, id: i.id.toString() }))
    }

    const data: any = { ...group, id: group.id.toString(), items }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier:', error)
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
    const groupId = BigInt(resolvedParams.id)
    const body = await request.json()

    const {
      groupName,
      labelName,
      isRequired,
      isMultiselect,
      minSelection,
      maxSelection,
      showDefaultTop,
      inheritFromMenuGroup,
      menuCategoryCode,
      priceStrategy,
      price,
      isActive
    } = body

    const updated = await (prisma as any).modifierGroup.update({
      where: { id: groupId },
      data: {
        groupName: groupName ?? null,
        labelName: labelName ?? null,
        isRequired: typeof isRequired === 'number' ? isRequired : undefined,
        isMultiselect: typeof isMultiselect === 'number' ? isMultiselect : undefined,
        minSelection: typeof minSelection === 'number' ? minSelection : null,
        maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
        showDefaultTop: typeof showDefaultTop === 'number' ? showDefaultTop : undefined,
        inheritFromMenuGroup: typeof inheritFromMenuGroup === 'number' ? inheritFromMenuGroup : undefined,
        menuCategoryCode: menuCategoryCode ?? null,
        priceStrategy: typeof priceStrategy === 'number' ? priceStrategy : undefined,
        price: typeof price === 'number' ? price : null,
        isActive: typeof isActive === 'number' ? isActive : undefined,
      }
    })

    const data: any = { ...updated, id: updated.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating modifier:', error)
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
    const groupId = BigInt(resolvedParams.id)

    await (prisma as any).modifierGroup.delete({
      where: { id: groupId }
    })

    return NextResponse.json({ message: 'Modifier group deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
