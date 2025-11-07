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
    const menuItemId = searchParams.get('menuItemId')

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 })
    }

    // Get all modifier assignments for the menu item
    const assignments = await (prisma as any).menuItemModifierGroup.findMany({
      where: {
        menuItemCode: menuItemId
      },
      include: {
        modifierGroup: {
          include: {
            modifierItems: {
              where: { isActive: 1 },
              orderBy: { displayOrder: 'asc' }
            }
          }
        }
      },
      orderBy: { modifierGroup: { groupName: 'asc' } }
    })

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
    const { menuItemId, modifierIds, inheritModifiers } = body

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId is required' }, { status: 400 })
    }

    // Update menu item inheritance setting
    await prisma.menuItem.update({
      where: { tblMenuItemId: parseInt(menuItemId) },
      data: { inheritModifiers: inheritModifiers ? 1 : 0 }
    })

    // Remove existing assignments
    await (prisma as any).menuItemModifierGroup.deleteMany({
      where: { menuItemCode: menuItemId }
    })

    // Add new assignments
    if (modifierIds && modifierIds.length > 0) {
      const assignments = modifierIds.map((modifierCode: string) => ({
        menuItemCode: menuItemId,
        modifierGroupCode: modifierCode,
        assignmentType: 'ITEM',
        storeCode: process.env.STORE_CODE || null
      }))

      await (prisma as any).menuItemModifierGroup.createMany({
        data: assignments
      })
    }

    // If inheritance is enabled, add inherited modifiers from category
    if (inheritModifiers) {
      const menuItem = await (prisma as any).menuItem.findUnique({
        where: { tblMenuItemId: parseInt(menuItemId) },
        include: { menuItemModifierGroups: true }
      })

      if (menuItem) {
        // Get category-level modifiers
        const categoryModifiers = await (prisma as any).modifierGroup.findMany({
          where: {
            menuCategoryCode: menuItem.menuCategoryCode,
            modifierGroupCode: {
              notIn: modifierIds || [] // Exclude already assigned item-level modifiers
            }
          }
        })

        if (categoryModifiers.length > 0) {
          const inheritedAssignments = categoryModifiers.map((modifier) => ({
            menuItemCode: menuItem.menuItemCode,
            modifierGroupCode: modifier.modifierGroupCode,
            assignmentType: 'CATEGORY',
            storeCode: process.env.STORE_CODE || null
          }))

          await (prisma as any).menuItemModifierGroup.createMany({
            data: inheritedAssignments
          })
        }
      }
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