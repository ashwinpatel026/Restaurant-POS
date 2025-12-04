import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

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

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)

    const category = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId },
      include: {
        menuMaster: {
          select: {
            menuMasterId: true,
            name: true,
            menuMasterCode: true
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Validate store access
    if (category.storeCode) {
      if (!canAccessStore(accessInfo, category.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    // Fetch modifier group NAMES and CODES for this category
    const modifierGroups = await prisma.$queryRaw<Array<{modifier_name: string, modifier_group_code: string}>>`
      SELECT 
        COALESCE(mg.group_name, mg.label_name, mg.modifier_group_code) AS modifier_name,
        mg.modifier_group_code
      FROM tbl_menu_category_modifier mcm
      JOIN tbl_modifier_group mg ON mg.modifier_group_code = mcm.modifier_group_code
      WHERE mcm.menu_category_code = ${category.menuCategoryCode}
    `

    // Convert BigInt to string for JSON serialization
    const categoryWithStringId = {
      ...category,
      menuCategoryId: category.menuCategoryId.toString(),
      tblMenuCategoryId: Number(category.menuCategoryId),
      tblMenuMasterId: Number(category.menuMaster.menuMasterId),
      menuMaster: {
        ...category.menuMaster,
        menuMasterId: category.menuMaster.menuMasterId.toString()
      },
      modifierGroups: modifierGroups.map((mg: any) => mg.modifier_name) || [],
      modifierGroupCodes: modifierGroups.map((mg: any) => mg.modifier_group_code) || []
    }

    return NextResponse.json(categoryWithStringId)
  } catch (error) {
    console.error('Error fetching category:', error)
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

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { name, colorCode, isActive, menuMasterId, modifierGroupCodes = [] } = body

    // Get the category first to get its code
    const existingCategory = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId },
      select: { menuCategoryCode: true, storeCode: true }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Validate store access
    if (existingCategory.storeCode) {
      if (!canAccessStore(accessInfo, existingCategory.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    // Get the menu master to get its code
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true, storeCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate menu master store access
    if (menuMaster.storeCode) {
      if (!canAccessStore(accessInfo, menuMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to menu master store' },
          { status: 403 }
        )
      }
    }

    const category = await prisma.menuCategory.update({
      where: { menuCategoryId: categoryId },
      data: {
        name,
        colorCode,
        isActive,
        menuMasterCode: menuMaster.menuMasterCode,
        syncSource: 'location' // Set sync_source to 'location' when updated from dashboard
      }
    })

    // Update menu category modifier relationships
    // First, delete existing relationships
    await prisma.$executeRaw`
      DELETE FROM tbl_menu_category_modifier 
      WHERE menu_category_code = ${category.menuCategoryCode}
    `

    // Then, insert new relationships if any
    if (modifierGroupCodes && modifierGroupCodes.length > 0) {
      const createdBy = parseInt(session.user.id)
      const storeCodeToUse = existingCategory.storeCode || selectedStoreCode || null
      
      for (const modifierGroupCode of modifierGroupCodes) {
        await prisma.$executeRaw`
          INSERT INTO tbl_menu_category_modifier (menu_category_code, modifier_group_code, createdby, createdon, is_sync_to_web, is_sync_to_local, store_code, sync_source, sync_id)
          VALUES (${category.menuCategoryCode}, ${modifierGroupCode}, ${createdBy}, NOW(), 0, 0, ${storeCodeToUse}, 'location', gen_random_uuid())
          ON CONFLICT DO NOTHING
        `
      }
    }

    // Convert BigInt to string for JSON serialization
    const categoryWithStringId = {
      ...category,
      menuCategoryId: category.menuCategoryId.toString(),
      tblMenuCategoryId: Number(category.menuCategoryId),
      tblMenuMasterId: Number(menuMasterId)
    }

    return NextResponse.json(categoryWithStringId)
  } catch (error) {
    console.error('Error updating category:', error)
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)

    // Check if category exists
    const category = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Validate store access
    if (category.storeCode) {
      if (!canAccessStore(accessInfo, category.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    // Check if category has any menu items
    // Use menuCategoryCode (string) instead of ID since MenuItem references by code
    // menuCategoryCode is stored as JSON (string or array), so we need to use raw SQL
    const categoryCodeStr = category.menuCategoryCode
    const itemsCountResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM tbl_menu_item
      WHERE menu_category_code IS NOT NULL
        AND (
          menu_category_code::text = ${JSON.stringify(categoryCodeStr)}
          OR (jsonb_typeof(menu_category_code::jsonb) = 'array' 
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(menu_category_code::jsonb) AS elem
                WHERE elem = ${categoryCodeStr}
              ))
        )
    `
    const itemsCount = Number(itemsCountResult[0]?.count || 0)

    // If category has menu items, prevent deletion
    if (itemsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category "${category.name}" because it contains ${itemsCount} menu item(s). Please delete all menu items first or move them to another category.` 
      }, { status: 400 })
    }

    // Delete menu category modifier relationships first (foreign key constraint)
    await prisma.$executeRaw`
      DELETE FROM tbl_menu_category_modifier 
      WHERE menu_category_code = ${category.menuCategoryCode}
    `

    // Now safe to delete the category
    await prisma.menuCategory.delete({
      where: { menuCategoryId: categoryId }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    
    // Handle foreign key constraint error specifically
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete this category because it has related menu items. Please delete all menu items first or move them to another category.' 
      }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
