import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuItemIdParam = searchParams.get('menuItemId')

    if (!menuItemIdParam) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 })
    }

    const menuItemId = BigInt(menuItemIdParam)

    const menuItem = await (prisma as any).menuItem.findUnique({
      where: { menuItemId },
      select: { menuItemCode: true }
    })

    const menuItemCode = menuItem?.menuItemCode

    if (!menuItemCode) {
      return NextResponse.json([])
    }

    const links = await (prisma as any).menuItemModifierGroup.findMany({
      where: { menuItemCode },
      orderBy: { modifierGroupCode: 'asc' }
    })

    if (links.length === 0) {
      return NextResponse.json([])
    }

    const codes = Array.from(
      new Set(
        links
          .map((link: any) => link.modifierGroupCode)
          .filter((code: string | null | undefined) => !!code)
      )
    ) as string[]

    if (codes.length === 0) {
      return NextResponse.json([])
    }

    const [groups, items] = await Promise.all([
      (prisma as any).modifierGroup.findMany({
        where: { modifierGroupCode: { in: codes } }
      }),
      (prisma as any).modifierItem.findMany({
        where: {
          modifierGroupCode: { in: codes },
          isActive: 1
        },
        orderBy: { displayOrder: 'asc' }
      })
    ])

    const groupsByCode = new Map<string, any>()
    for (const group of groups) {
      if (group?.modifierGroupCode) {
        groupsByCode.set(group.modifierGroupCode, group)
      }
    }

    const itemsByCode = new Map<string, any[]>()
    for (const item of items) {
      const code = item?.modifierGroupCode
      if (!code) continue
      const bucket = itemsByCode.get(code) ?? []
      bucket.push({
        ...item,
        id: item?.id ? Number(item.id) : null,
        price: item?.price != null ? Number(item.price) : null
      })
      itemsByCode.set(code, bucket)
    }

    const assignments = links
      .map((link: any) => {
        const code = link?.modifierGroupCode
        if (!code) return null
        const group = groupsByCode.get(code)
        if (!group) return null

        return {
          id: link?.id ? Number(link.id) : null,
          menuItemCode: link.menuItemCode,
          modifierGroupCode: code,
          inheritFromMenuGroup: link.inheritFromMenuGroup,
          isInheritFromMenuCategory: link.isInheritFromMenuCategory,
          isRequired: link.isRequired,
          isMultiselect: link.isMultiselect,
          minSelection: link.minSelection,
          maxSelection: link.maxSelection,
          modifier: {
            ...group,
            id: group?.id ? Number(group.id) : null,
            price: group?.price != null ? Number(group.price) : null,
            modifierItems: itemsByCode.get(code) ?? []
          }
        }
      })
      .filter((entry: Record<string, any> | null): entry is Record<string, any> => entry !== null)

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching menu item modifiers:', error)
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
    const { menuItemId: menuItemIdParam, modifierIds, modifierAssignments, inheritModifiers } = body

    if (!menuItemIdParam) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 })
    }

    const menuItemId = BigInt(menuItemIdParam)

    const menuItem = await (prisma as any).menuItem.findUnique({
      where: { menuItemId },
      select: {
        menuItemCode: true,
        menuCategoryCode: true
      }
    })

    if (!menuItem?.menuItemCode) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    const menuItemCode = menuItem.menuItemCode

    // Update menu item inheritance setting
    await (prisma as any).menuItem.update({
      where: { menuItemId },
      data: { inheritModifierGroup: !!inheritModifiers }
    })

    // Remove existing assignments
    await (prisma as any).menuItemModifierGroup.deleteMany({
      where: { menuItemCode }
    })

    // Add new assignments
    const selectedModifierIds = Array.isArray(modifierIds)
      ? modifierIds.map((id: any) => {
          try {
            return BigInt(id)
          } catch (_) {
            return null
          }
        }).filter((id): id is bigint => id !== null)
      : []

    const selectedAssignments = Array.isArray(modifierAssignments)
      ? modifierAssignments
      : []

    const rowsToCreate: any[] = []

    if (selectedModifierIds.length > 0) {
      const groups = await (prisma as any).modifierGroup.findMany({
        where: { id: { in: selectedModifierIds } }
      })

      for (const group of groups) {
        const code = group?.modifierGroupCode
        if (!code) continue

        const assignmentOptions = selectedAssignments.find(
          (entry: any) => Number(entry?.modifierId) === Number(group.id)
        ) || {}

        rowsToCreate.push({
          menuItemCode,
          modifierGroupCode: code,
          inheritFromMenuGroup: 0,
          isInheritFromMenuCategory: 0,
          isRequired: assignmentOptions.isRequired ?? 0,
          isMultiselect: assignmentOptions.isMultiselect ?? 0,
          minSelection: assignmentOptions.minSelection ?? null,
          maxSelection: assignmentOptions.maxSelection ?? null,
          createdBy: parseInt(session.user.id),
          storeCode: process.env.STORE_CODE || null
        })
      }
    }

    // If inheritance is enabled, add inherited modifiers from category
    if (inheritModifiers && menuItem.menuCategoryCode) {
      const selectedCodes = new Set(rowsToCreate.map((row) => row.modifierGroupCode))

      const inheritedRows = await prisma.$queryRawUnsafe<Array<{ modifier_group_code: string }>>(
        `SELECT modifier_group_code FROM tbl_menu_category_modifier WHERE menu_category_code = $1`,
        menuItem.menuCategoryCode
      )

      for (const row of inheritedRows) {
        const code = row?.modifier_group_code
        if (!code || selectedCodes.has(code)) continue

        selectedCodes.add(code)
        rowsToCreate.push({
          menuItemCode,
          modifierGroupCode: code,
          inheritFromMenuGroup: 1,
          isInheritFromMenuCategory: 1,
          isRequired: 0,
          isMultiselect: 0,
          minSelection: null,
          maxSelection: null,
          createdBy: parseInt(session.user.id),
          storeCode: process.env.STORE_CODE || null
        })
      }
    }

    if (rowsToCreate.length > 0) {
      await (prisma as any).menuItemModifierGroup.createMany({
        data: rowsToCreate,
        skipDuplicates: true
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating menu item modifiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}