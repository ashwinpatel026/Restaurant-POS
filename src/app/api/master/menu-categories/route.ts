import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

// Helper function to generate unique menu category code
async function generateMenuCategoryCode(): Promise<string> {
  const latestCategory = await masterPrisma.masterMenuCategory.findFirst({
    orderBy: { menuCategoryId: 'desc' },
    select: { menuCategoryCode: true }
  })

  let nextNumber = 1
  
  if (latestCategory?.menuCategoryCode) {
    // Extract number from code like "MC001" or "W001"
    const match = latestCategory.menuCategoryCode.match(/^(MC|W)(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[2]) + 1
    }
  }
  
  // Format as MC + padded 3-digit number
  return `MC${String(nextNumber).padStart(3, '0')}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuMasterCode = searchParams.get('menuMasterCode')

    const where: any = {}
    if (menuMasterCode) {
      where.menuMasterCode = menuMasterCode
    }

    const menuCategories = await masterPrisma.masterMenuCategory.findMany({
      where,
      include: {
        menuMaster: {
          select: {
            menuMasterId: true,
            name: true,
            menuMasterCode: true
          }
        }
      },
      orderBy: { createdOn: 'desc' }
    })

    // Fetch modifier groups separately
    const categoryCodes = menuCategories.map((cat: any) => cat.menuCategoryCode).filter(Boolean)
    let modifierGroupsMap: Record<string, string[]> = {}
    
    if (categoryCodes.length > 0) {
      const modifierGroups = await masterPrisma.masterMenuCategoryModifier.findMany({
        where: {
          menuCategoryCode: { in: categoryCodes }
        },
        include: {
          modifierGroup: {
            select: {
              modifierGroupCode: true,
              groupName: true,
              labelName: true
            }
          }
        }
      })

      // Group modifier names by category code
      modifierGroups.forEach((mg: any) => {
        if (!modifierGroupsMap[mg.menuCategoryCode]) {
          modifierGroupsMap[mg.menuCategoryCode] = []
        }
        const modifierName = mg.modifierGroup.groupName || mg.modifierGroup.labelName || mg.modifierGroup.modifierGroupCode
        modifierGroupsMap[mg.menuCategoryCode].push(modifierName)
      })
    }

    // Map categories with modifier groups
    const categoriesWithStringIds = menuCategories.map((category: any) => {
      const mapped = mapMenuCategoryResponse(category)
      return {
        ...mapped,
        tblMenuMasterId: Number(category.menuMaster.menuMasterId),
        menuMaster: {
          ...category.menuMaster,
          menuMasterId: category.menuMaster.menuMasterId.toString()
        },
        modifierGroups: modifierGroupsMap[category.menuCategoryCode] || [],
        menuItems: []
      }
    })

    return NextResponse.json(categoriesWithStringIds)
  } catch (error) {
    console.error('Error fetching menu categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, colorCode, menuMasterId, modifierGroupCodes = [] } = body

    // Get the menu master to get its code
    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Generate unique menu category code
    const menuCategoryCode = await generateMenuCategoryCode()

    const menuCategory = await masterPrisma.masterMenuCategory.create({
      data: {
        name,
        colorCode: colorCode || null,
        menuMasterCode: menuMaster.menuMasterCode,
        menuCategoryCode,
        createdBy: admin.adminId,
      }
    })

    // Create menu category modifier relationships if modifier groups are selected
    if (modifierGroupCodes && modifierGroupCodes.length > 0) {
      for (const modifierGroupCode of modifierGroupCodes) {
        await masterPrisma.masterMenuCategoryModifier.create({
          data: {
            menuCategoryCode: menuCategory.menuCategoryCode,
            modifierGroupCode: modifierGroupCode,
            createdBy: admin.adminId,
          }
        }).catch(() => {
          // Ignore duplicate errors
        })
      }
    }

    const categoryWithStringId = {
      ...mapMenuCategoryResponse(menuCategory),
      tblMenuMasterId: Number(menuMasterId)
    }

    return NextResponse.json(categoryWithStringId, { status: 201 })
  } catch (error) {
    console.error('Error creating menu category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

