import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to map menu category response
function mapMenuCategoryResponse(category: any) {
  return {
    ...category,
    menuCategoryId: category.menuCategoryId.toString(),
    tblMenuCategoryId: Number(category.menuCategoryId),
    createdBy: category.createdBy?.toString() || null,
    updatedBy: category.updatedBy?.toString() || null,
    createdOn: category.createdOn?.toISOString() || null,
    updatedOn: category.updatedOn?.toISOString() || null,
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

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)

    const category = await masterPrisma.masterMenuCategory.findUnique({
      where: { menuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Fetch menu master separately since relation is not defined
    const menuMaster = category.menuMasterCode 
      ? await masterPrisma.masterMenuMaster.findUnique({
          where: { menuMasterCode: category.menuMasterCode },
          select: {
            menuMasterId: true,
            name: true,
            menuMasterCode: true
          }
        })
      : null

    // Fetch modifier groups for this category
    const modifierGroupRelations = await masterPrisma.masterMenuCategoryModifier.findMany({
      where: {
        menuCategoryCode: category.menuCategoryCode
      },
      select: {
        modifierGroupCode: true
      }
    })

    // Fetch modifier group details separately
    const modifierGroupCodes = modifierGroupRelations.map(mg => mg.modifierGroupCode)
    const modifierGroups = modifierGroupCodes.length > 0
      ? await masterPrisma.masterModifierGroup.findMany({
          where: {
            modifierGroupCode: { in: modifierGroupCodes }
          },
          select: {
            modifierGroupCode: true,
            groupName: true,
            labelName: true
          }
        })
      : []

    const categoryWithStringId = {
      ...mapMenuCategoryResponse(category),
      tblMenuMasterId: menuMaster ? Number(menuMaster.menuMasterId) : null,
      menuMaster: menuMaster ? {
        ...menuMaster,
        menuMasterId: menuMaster.menuMasterId.toString()
      } : null,
      modifierGroups: modifierGroups.map((mg: any) => 
        mg.groupName || mg.labelName || mg.modifierGroupCode
      ) || [],
      modifierGroupCodes: modifierGroups.map((mg: any) => mg.modifierGroupCode) || []
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)
    const body = await request.json()

    const { name, colorCode, forColorCode, isActive, menuMasterId, modifierGroupCodes = [], deptCode } = body

    // Get the category first to get its code
    const existingCategory = await masterPrisma.masterMenuCategory.findUnique({
      where: { menuCategoryId: categoryId },
      select: { menuCategoryCode: true }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get the menu master to get its code and deptCode
    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true, deptCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Use provided deptCode or fallback to menu master's deptCode
    const finalDeptCode = deptCode !== undefined ? (deptCode || null) : (menuMaster.deptCode || null)

    const category = await masterPrisma.masterMenuCategory.update({
      where: { menuCategoryId: categoryId },
      data: {
        name,
        colorCode: colorCode || null,
        forColorCode: forColorCode || null,
        deptCode: finalDeptCode,
        isActive: isActive ?? 1,
        menuMasterCode: menuMaster.menuMasterCode,
        updatedBy: admin.adminId,
        updatedOn: new Date()
      }
    })

    // Update menu category modifier relationships
    // First, delete existing relationships
    await masterPrisma.masterMenuCategoryModifier.deleteMany({
      where: {
        menuCategoryCode: category.menuCategoryCode
      }
    })

    // Then, insert new relationships if any
    if (modifierGroupCodes && modifierGroupCodes.length > 0) {
      for (const modifierGroupCode of modifierGroupCodes) {
        await masterPrisma.masterMenuCategoryModifier.create({
          data: {
            menuCategoryCode: category.menuCategoryCode,
            modifierGroupCode: modifierGroupCode,
            createdBy: admin.adminId,
          }
        }).catch(() => {
          // Ignore duplicate errors
        })
      }
    }

    const categoryWithStringId = {
      ...mapMenuCategoryResponse(category),
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
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const categoryId = BigInt(resolvedParams.id)

    // Check if category exists
    const category = await masterPrisma.masterMenuCategory.findUnique({
      where: { menuCategoryId: categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has any menu items
    // menuCategoryCode is stored as JSON array, so we need to use array_contains filter
    const itemsCount = await masterPrisma.masterMenuItem.count({
      where: { 
        menuCategoryCode: {
          array_contains: category.menuCategoryCode
        }
      }
    })

    // If category has menu items, prevent deletion
    if (itemsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category "${category.name}" because it contains ${itemsCount} menu item(s). Please delete all menu items first or move them to another category.` 
      }, { status: 400 })
    }

    // Delete menu category modifier relationships first
    await masterPrisma.masterMenuCategoryModifier.deleteMany({
      where: {
        menuCategoryCode: category.menuCategoryCode
      }
    })

    // Now safe to delete the category
    await masterPrisma.masterMenuCategory.delete({
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

