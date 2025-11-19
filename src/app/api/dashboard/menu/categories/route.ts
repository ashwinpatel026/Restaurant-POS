import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuMasterCode = searchParams.get('menuMasterCode')

    const where: any = {}
    if (menuMasterCode) {
      where.menuMasterCode = menuMasterCode
    }

    const menuCategories = await prisma.menuCategory.findMany({
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

    // Fetch modifier groups separately using parameterized query
    const categoryCodes = menuCategories.map((cat: any) => cat.menuCategoryCode).filter(Boolean)
    let modifierGroupsMap: Record<string, string[]> = {}
    
    if (categoryCodes.length > 0) {
      // Batch process in chunks to avoid very large queries
      const chunkSize = 100
      const chunks: string[][] = []
      for (let i = 0; i < categoryCodes.length; i += chunkSize) {
        chunks.push(categoryCodes.slice(i, i + chunkSize))
      }
      
      // Process chunks in parallel using parameterized queries
      const modifierGroupPromises = chunks.map(chunk =>
        prisma.$queryRaw<Array<{menu_category_code: string, modifier_name: string}>>`
          SELECT mcm.menu_category_code,
                 COALESCE(mg.group_name, mg.label_name, mg.modifier_group_code) AS modifier_name
          FROM tbl_menu_category_modifier mcm
          JOIN tbl_modifier_group mg ON mg.modifier_group_code = mcm.modifier_group_code
          WHERE mcm.menu_category_code = ANY(${chunk}::text[])
        `
      )
      
      const results = await Promise.all(modifierGroupPromises)
      const modifierGroups = results.flat()

      // Group modifier names by category code
      modifierGroups.forEach((mg: any) => {
        if (!modifierGroupsMap[mg.menu_category_code]) {
          modifierGroupsMap[mg.menu_category_code] = []
        }
        modifierGroupsMap[mg.menu_category_code].push(mg.modifier_name)
      })
    }

    // Convert BigInt to string for JSON serialization and map to expected format
    const categoriesWithStringIds = menuCategories.map((category: any) => {
      const result: any = {
        menuCategoryId: category.menuCategoryId.toString(),
        tblMenuCategoryId: Number(category.menuCategoryId),
        name: category.name,
        colorCode: category.colorCode,
        isActive: category.isActive,
        menuMasterCode: category.menuMasterCode,
        menuCategoryCode: category.menuCategoryCode,
        createdBy: category.createdBy,
        createdOn: category.createdOn,
        globalCode: category.globalCode,
        isSyncToWeb: category.isSyncToWeb,
        isSyncToLocal: category.isSyncToLocal,
        storeCode: category.storeCode,
        tblMenuMasterId: Number(category.menuMaster.menuMasterId),
        menuMaster: {
          ...category.menuMaster,
          menuMasterId: category.menuMaster.menuMasterId.toString()
        },
        modifierGroups: modifierGroupsMap[category.menuCategoryCode] || [],
        menuItems: []
      }
      return result
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
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, colorCode, menuMasterId, modifierGroupCodes = [] } = body

    // Get the menu master to get its code
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Generate unique menu category code
    const menuCategoryCode = await generateUniqueCode('menuCategory', 'menuCategoryCode')

    const menuCategory = await prisma.menuCategory.create({
      data: {
        name,
        colorCode,
        menuMasterCode: menuMaster.menuMasterCode,
        menuCategoryCode,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    // Create menu category modifier relationships if modifier groups are selected
    if (modifierGroupCodes && modifierGroupCodes.length > 0) {
      const createdBy = parseInt(session.user.id)
      const storeCode = process.env.STORE_CODE || null
      
      // Insert each modifier group relationship
      // Using individual inserts to avoid SQL injection and ensure data integrity
      for (const modifierGroupCode of modifierGroupCodes) {
        await prisma.$executeRaw`
          INSERT INTO tbl_menu_category_modifier (menu_category_code, modifier_group_code, createdby, createdon, is_sync_to_web, is_sync_to_local, store_code)
          VALUES (${menuCategory.menuCategoryCode}, ${modifierGroupCode}, ${createdBy}, NOW(), 0, 0, ${storeCode})
          ON CONFLICT DO NOTHING
        `
      }
    }

    // Convert BigInt to string for JSON serialization
    const categoryWithStringId = {
      ...menuCategory,
      menuCategoryId: menuCategory.menuCategoryId.toString(),
      tblMenuCategoryId: Number(menuCategory.menuCategoryId),
      // Derive tblMenuMasterId from provided input
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
