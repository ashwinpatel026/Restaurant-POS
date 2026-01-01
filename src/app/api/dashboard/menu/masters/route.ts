import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to generate unique menu master code
async function generateMenuMasterCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}MM`
  
  // Get all menu master codes that match the WL pattern for this store
  const menuMasters = await prisma.menuMaster.findMany({
    where: {
      menuMasterCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { menuMasterCode: true },
    orderBy: { menuMasterId: 'desc' }
  })

  let nextNumber = 1
  
  if (menuMasters.length > 0) {
    // Extract number from codes like "WLLOC01MM1", "WLLOC01MM2", etc.
    const numbers = menuMasters
      .map(menuMaster => {
        const match = menuMaster.menuMasterCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)
    
    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }
  
  // Format as WL + STORE_CODE + MM + number starting from 1
  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
  try {
    // Check if this is a public request (for QR orders) by checking referer or query param
    const url = new URL(request.url)
    const isPublic = url.searchParams.get('public') === 'true'
    
      // Only require auth if not a public request
      if (!isPublic) {
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.id || !session?.user?.role) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check permission to view menu masters
        if (!(await checkLocationPermission(session.user.role, 'menu.view'))) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      
      // Filter by ONE store only for authenticated requests
      const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

      // Fetch menu masters filtered by store
      const menuMasters = await prisma.menuMaster.findMany({
        where: {
          ...storeFilter
        },
        orderBy: { createdOn: 'desc' }
      })

      // For authenticated requests, return simple structure
      const menusWithStringId = menuMasters.map((menu: any) => ({
        ...menu,
        menuMasterId: menu.menuMasterId.toString()
      }))

      // Cache response for 60 seconds
      return NextResponse.json(menusWithStringId, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    }

    // Public request handling (QR orders) - no store filtering
    // Fetch menu masters with categories and items for public QR orders
    const menuMasters = await prisma.menuMaster.findMany({
      where: {
        isActive: 1, // Only active menus for QR orders
      },
      include: {
        menuCategories: {
          where: {
            isActive: 1,
          },
          include: {
            // Note: We need to manually fetch menu items as there's no direct relation in Prisma
            // We'll fetch them separately or use a raw query
          },
          orderBy: {
            createdOn: 'asc'
          }
        }
      },
      orderBy: { createdOn: 'desc' }
    })

    // Public request: fetch menu items for each category
    if (isPublic) {
      // Fetch all menu items
      const allMenuItems = await prisma.menuItem.findMany({
        where: {
          isActive: 1,
        },
      })

      // Group menu items by category and attach to categories
      const menusWithItems = menuMasters.map((menu: any) => {
        const categoriesWithItems = (menu.menuCategories || []).map((category: any) => {
          const menuItems = allMenuItems.filter(
            (item: any) => item.menuCategoryCode === category.menuCategoryCode
          ).map((item: any) => ({
            tblMenuItemId: Number(item.menuItemId),
            name: item.name || '',
            labelName: item.labelName || '',
            price: Number(item.basePrice || item.price || 0),
            isActive: item.isActive,
            modifiers: [] // Modifiers would need to be fetched separately if needed
          }))

          return {
            tblMenuCategoryId: Number(category.menuCategoryId),
            name: category.name || '',
            menuItems
          }
        })

        return {
          ...menu,
          tblMenuMasterId: Number(menu.menuMasterId),
          menuMasterId: menu.menuMasterId.toString(),
          menuCategories: categoriesWithItems
        }
      })

      // Cache response for 60 seconds
      return NextResponse.json(menusWithItems, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      })
    }
  } catch (error) {
    console.error('Error fetching menu masters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create menu masters
    if (!(await checkLocationPermission(session.user.role, 'menu.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const {
      name,
      labelName,
      colorCode,
      forColorCode,
      prepZoneCodes,
      stationCodes,
      eventCode,
      isEventMenu,
      isActive,
      deptCode
    } = body

    // Generate unique menu master code for the selected store
    const menuMasterCode = await generateMenuMasterCode(selectedStoreCode)

    // Create menu master
    const createData = {
      menuMasterCode,
      name,
      labelName: labelName || null,
      colorCode: colorCode || null,
      forColorCode: forColorCode || null,
      deptCode: deptCode || null,
      prepZoneCode: prepZoneCodes && prepZoneCodes.length > 0 ? prepZoneCodes : null,
      stationCode: stationCodes && stationCodes.length > 0 ? stationCodes : null,
      isEventMenu: isEventMenu || 0,
      isActive: isActive ?? 1,
      createdBy: parseInt(session.user.id),
      storeCode: selectedStoreCode,
      syncSource: 'location' // Set sync_source to 'location' when created from dashboard
    }

    const menuMaster = await prisma.menuMaster.create({
      data: createData
    })

    // If this is an event menu, create the association
    if (eventCode && isEventMenu === 1) {
      await prisma.menuMasterEvent.create({
        data: {
          menuMasterCode: menuMasterCode,
          eventCode: eventCode,
          createdBy: parseInt(session.user.id),
          storeCode: selectedStoreCode,
          syncSource: 'location' // Set sync_source to 'location' when created from dashboard
        }
      })
    }

    // Convert BigInt to string for JSON serialization
    const menuWithStringId = {
      ...menuMaster,
      menuMasterId: menuMaster.menuMasterId.toString()
    }

    return NextResponse.json(menuWithStringId, { status: 201 })
  } catch (error) {
    console.error('Error creating menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
