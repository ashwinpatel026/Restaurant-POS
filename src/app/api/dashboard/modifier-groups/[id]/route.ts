import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { Prisma } from '@prisma/client'

// Helper function to sanitize prefix array
function sanitizePrefix(input: unknown): string[] {
  if (!input) {
    return []
  }

  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',')
      : []

  const unique = new Set<string>()

  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) {
        unique.add(trimmed)
      }
    }
  }

  return Array.from(unique)
}

// Helper function to normalize prefix from JSON
function normalizePrefix(value: unknown): string[] {
  if (!value) return []
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  return values
    .map((v) => (typeof v === 'string' ? v.trim() : String(v).trim()))
    .filter((v) => v)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const groupId = BigInt(id)

    const group = await (prisma as any).modifierGroup.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If storeCode is provided, verify the group belongs to that store or user has access
    if (selectedStoreCode && group.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, group.storeCode || '')) {
        return NextResponse.json({ error: 'Modifier group not found' }, { status: 404 })
      }
    }

    // Fetch assigned categories for this group
    const assigned = group.modifierGroupCode
      ? await prisma.$queryRawUnsafe<Array<{ menu_category_code: string, category_name: string }>>(
          `SELECT mcm.menu_category_code, mc.name AS category_name
           FROM tbl_menu_category_modifier mcm
           JOIN tbl_menu_category mc ON mc.menu_category_code = mcm.menu_category_code
           WHERE mcm.modifier_group_code = $1`,
          group.modifierGroupCode
        )
      : []

    // Fetch modifier items for this group
    const items = group.modifierGroupCode
      ? await (prisma as any).modifierItem.findMany({
          where: { modifierGroupCode: group.modifierGroupCode },
          orderBy: [{ displayOrder: 'asc' }, { createdOn: 'asc' }]
        })
      : []

    const data: any = { 
      ...group, 
      id: group.id.toString(),
      prefix: normalizePrefix(group.prefix),
      assignedCategories: assigned?.map(a => ({ code: a.menu_category_code, name: a.category_name })) || [],
      items: items.map((item: any) => ({
        ...item,
        id: item.id.toString(),
        price: item.price ? Number(item.price) : null
      }))
    }
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

    const { id } = await params
    const groupId = BigInt(id)
    
    // First check if group exists and belongs to the selected store
    const existingGroup = await (prisma as any).modifierGroup.findUnique({ 
      where: { id: groupId } 
    })
    
    if (!existingGroup) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Verify user has access to this group's store
    if (existingGroup.storeCode && !canAccessStore(accessInfo, existingGroup.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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
      prefix,
      isActive,
    } = body

    const prefixes = sanitizePrefix(prefix)

    const updateData: Record<string, unknown> = {
      groupName: groupName ?? null,
      labelName: labelName ?? null,
      isRequired: typeof isRequired === 'number' ? isRequired : undefined,
      isMultiselect: typeof isMultiselect === 'number' ? isMultiselect : undefined,
      minSelection: typeof minSelection === 'number' ? minSelection : null,
      maxSelection: typeof maxSelection === 'number' ? maxSelection : null,
      showDefaultTop: typeof showDefaultTop === 'number' ? showDefaultTop : undefined,
      inheritFromMenuGroup: typeof inheritFromMenuGroup === 'number' ? inheritFromMenuGroup : undefined,
      isActive: typeof isActive === 'number' ? isActive : undefined,
      // Keep the original storeCode, don't change it
      storeCode: existingGroup.storeCode || selectedStoreCode,
      // Set sync_source to 'location' when updated from dashboard
      syncSource: 'location',
    }

    if (prefixes.length > 0) {
      updateData.prefix = prefixes
    } else {
      updateData.prefix = Prisma.JsonNull
    }

    const updated = await (prisma as any).modifierGroup.update({
      where: { id: groupId },
      data: updateData,
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const { id } = await params
    const groupId = BigInt(id)

    const group = await (prisma as any).modifierGroup.findUnique({ where: { id: groupId } })
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Verify user has access to this group's store
    if (group.storeCode && !canAccessStore(accessInfo, group.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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


