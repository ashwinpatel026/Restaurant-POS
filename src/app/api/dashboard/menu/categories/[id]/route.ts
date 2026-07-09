import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { softDeleteCategoryAndItems } from '@/lib/menuSoftDelete'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view menu categories
    if (!(await checkLocationPermission(session.user.role, 'menu.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    if (!category || category.isDelete) {
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
      deptCode: category.deptCode || null,
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update menu categories
    if (!(await checkLocationPermission(session.user.role, 'menu.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { name, colorCode, forColorCode, isActive, disableInPOS, menuMasterId, modifierGroupCodes = [], deptCode } = body

    // Get the category first to get its code
    const existingCategory = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId },
      select: { menuCategoryCode: true, storeCode: true, isDelete: true }
    })

    if (!existingCategory || existingCategory.isDelete) {
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

    // Get the menu master to get its code and deptCode
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true, storeCode: true, deptCode: true }
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

    // Use provided deptCode or fallback to menu master's deptCode
    const finalDeptCode = deptCode !== undefined ? (deptCode || null) : (menuMaster.deptCode || null)

    const category = await prisma.menuCategory.update({
      where: { menuCategoryId: categoryId },
      data: {
        name,
        colorCode,
        forColorCode: forColorCode || null,
        deptCode: finalDeptCode,
        isActive,
        disableInPOS: disableInPOS ?? 0,
        menuMasterCode: menuMaster.menuMasterCode,
        updatedBy: parseInt(session.user.id),
        updatedOn: new Date(),
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete menu categories
    if (!(await checkLocationPermission(session.user.role, 'menu.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    if (!category || category.isDelete) {
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

    // Soft delete category and cascade to assigned menu items
    await softDeleteCategoryAndItems(category.menuCategoryCode, {
      updatedBy: parseInt(session.user.id),
      syncSource: 'location',
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
