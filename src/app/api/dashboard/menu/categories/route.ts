import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique menu category code
async function generateMenuCategoryCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MC`
  
  // Get all menu category codes that match the WL pattern for this store
  const menuCategories = await prisma.menuCategory.findMany({
    where: {
      menuCategoryCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { menuCategoryCode: true },
    orderBy: { menuCategoryId: 'desc' }
  })

  let nextNumber = 1
  
  if (menuCategories.length > 0) {
    // Extract number from codes like "WLLOC01MC1", "WLLOC01MC2", etc.
    const numbers = menuCategories
      .map(menuCategory => {
        const match = menuCategory.menuCategoryCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + MC + number starting from 1
  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
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
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const menuMasterCode = searchParams.get('menuMasterCode')

    const where: any = {
      ...storeFilter
    }
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

    const body = await request.json()
    const { name, colorCode, menuMasterId, modifierGroupCodes = [] } = body

    // Get the menu master to get its code
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: BigInt(menuMasterId) },
      select: { menuMasterCode: true, storeCode: true }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate store access - ensure menu master belongs to accessible store
    if (menuMaster.storeCode) {
      const { canAccessStore } = await import('@/lib/auth/accessControl')
      if (!canAccessStore(accessInfo, menuMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    // Generate unique menu category code for the selected store
    const menuCategoryCode = await generateMenuCategoryCode(selectedStoreCode)

    const menuCategory = await prisma.menuCategory.create({
      data: {
        name,
        colorCode,
        menuMasterCode: menuMaster.menuMasterCode,
        menuCategoryCode,
        createdBy: parseInt(session.user.id),
        storeCode: selectedStoreCode,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
      }
    })

    // Create menu category modifier relationships if modifier groups are selected
    if (modifierGroupCodes && modifierGroupCodes.length > 0) {
      const createdBy = parseInt(session.user.id)
      
      // Insert each modifier group relationship
      // Using individual inserts to avoid SQL injection and ensure data integrity
      for (const modifierGroupCode of modifierGroupCodes) {
        await prisma.$executeRaw`
          INSERT INTO tbl_menu_category_modifier (menu_category_code, modifier_group_code, createdby, createdon, is_sync_to_web, is_sync_to_local, store_code, sync_source, sync_id)
          VALUES (${menuCategory.menuCategoryCode}, ${modifierGroupCode}, ${createdBy}, NOW(), 0, 0, ${selectedStoreCode}, 'location', gen_random_uuid())
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
