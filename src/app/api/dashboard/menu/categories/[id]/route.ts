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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { name, colorCode, isActive, menuMasterId, modifierGroupCodes = [] } = body

    // Get the category first to get its code
    const existingCategory = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId },
      select: { menuCategoryCode: true }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get the menu master to get its code
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    const category = await prisma.menuCategory.update({
      where: { menuCategoryId: categoryId },
      data: {
        name,
        colorCode,
        isActive,
        menuMasterCode: menuMaster.menuMasterCode
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
      const storeCode = process.env.STORE_CODE || null
      
      for (const modifierGroupCode of modifierGroupCodes) {
        await prisma.$executeRaw`
          INSERT INTO tbl_menu_category_modifier (menu_category_code, modifier_group_code, createdby, createdon, is_sync_to_web, is_sync_to_local, store_code)
          VALUES (${category.menuCategoryCode}, ${modifierGroupCode}, ${createdBy}, NOW(), 0, 0, ${storeCode})
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
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)

    // Check if category exists
    const category = await prisma.menuCategory.findUnique({
      where: { menuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has any menu items
    // Use menuCategoryCode (string) instead of ID since MenuItem references by code
    const itemsCount = await prisma.menuItem.count({
      where: { menuCategoryCode: category.menuCategoryCode }
    })

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
