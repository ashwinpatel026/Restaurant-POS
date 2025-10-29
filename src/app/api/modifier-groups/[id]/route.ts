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
    const groupId = BigInt(id)

    const group = await (prisma as any).modifierGroup.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: any = { ...group, id: group.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching modifier group:', error)
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
    const groupId = BigInt(id)
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
      isActive,
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
        isActive: typeof isActive === 'number' ? isActive : undefined,
      }
    })

    const data: any = { ...updated, id: updated.id.toString() }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating modifier group:', error)
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
    const groupId = BigInt(id)

    const group = await (prisma as any).modifierGroup.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If items exist under this group, delete them first, then delete group
    if (group.modifierGroupCode) {
      await (prisma as any).modifierItem.deleteMany({ where: { modifierGroupCode: group.modifierGroupCode } })
    }

    await (prisma as any).modifierGroup.delete({ where: { id: groupId } })
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    console.error('Error deleting modifier group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


