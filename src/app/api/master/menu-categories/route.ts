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
    // Extract number from code like "MC1", "MC2", etc.
    const match = latestCategory.menuCategoryCode.match(/^MC(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as MC + number starting from 1
  return `MC${nextNumber}`
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
      orderBy: { createdOn: 'desc' }
    })

    // Fetch menu masters separately
    const menuMasterCodes = [...new Set(menuCategories.map((cat: any) => cat.menuMasterCode).filter(Boolean))]
    const menuMastersMap: Record<string, any> = {}
    
    if (menuMasterCodes.length > 0) {
      const menuMasters = await masterPrisma.masterMenuMaster.findMany({
        where: {
          menuMasterCode: { in: menuMasterCodes }
        },
        select: {
          menuMasterId: true,
          name: true,
          menuMasterCode: true
        }
      })

      menuMasters.forEach((mm: any) => {
        menuMastersMap[mm.menuMasterCode] = {
          menuMasterId: mm.menuMasterId?.toString() || null,
          name: mm.name,
          menuMasterCode: mm.menuMasterCode
        }
      })
    }

    // Fetch modifier groups separately
    const categoryCodes = menuCategories.map((cat: any) => cat.menuCategoryCode).filter(Boolean)
    let modifierGroupsMap: Record<string, string[]> = {}
    
    if (categoryCodes.length > 0) {
      const modifierRelations = await masterPrisma.masterMenuCategoryModifier.findMany({
        where: {
          menuCategoryCode: { in: categoryCodes }
        },
        select: {
          menuCategoryCode: true,
          modifierGroupCode: true
        }
      })

      const modifierGroupCodes = [...new Set(modifierRelations.map((mg: any) => mg.modifierGroupCode).filter(Boolean))]
      
      if (modifierGroupCodes.length > 0) {
        const modifierGroups = await masterPrisma.masterModifierGroup.findMany({
          where: {
            modifierGroupCode: { in: modifierGroupCodes }
          },
          select: {
            modifierGroupCode: true,
            groupName: true,
            labelName: true
          }
        })

        const modifierGroupsDataMap: Record<string, any> = {}
        modifierGroups.forEach((mg: any) => {
          modifierGroupsDataMap[mg.modifierGroupCode] = mg
        })

        // Group modifier names by category code
        modifierRelations.forEach((mg: any) => {
          if (!modifierGroupsMap[mg.menuCategoryCode]) {
            modifierGroupsMap[mg.menuCategoryCode] = []
          }
          const modifierData = modifierGroupsDataMap[mg.modifierGroupCode]
          if (modifierData) {
            const modifierName = modifierData.groupName || modifierData.labelName || modifierData.modifierGroupCode
            modifierGroupsMap[mg.menuCategoryCode].push(modifierName)
          }
        })
      }
    }

    // Map categories with menu master and modifier groups
    const categoriesWithStringIds = menuCategories.map((category: any) => {
      const mapped = mapMenuCategoryResponse(category)
      const menuMaster = menuMastersMap[category.menuMasterCode] || null
      
      return {
        ...mapped,
        tblMenuMasterId: menuMaster ? Number(menuMaster.menuMasterId) : null,
        menuMaster: menuMaster || {
          menuMasterId: null,
          name: null,
          menuMasterCode: category.menuMasterCode
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
    const { name, colorCode, forColorCode, menuMasterId, modifierGroupCodes = [], deptCode } = body

    // Get the menu master to get its code and deptCode
    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true, deptCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Use provided deptCode or fallback to menu master's deptCode
    const finalDeptCode = deptCode || menuMaster.deptCode || null

    // Generate unique menu category code
    const menuCategoryCode = await generateMenuCategoryCode()

    const menuCategory = await masterPrisma.masterMenuCategory.create({
      data: {
        name,
        colorCode: colorCode || null,
        forColorCode: forColorCode || null,
        deptCode: finalDeptCode,
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

