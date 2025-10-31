import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { generateUniqueCode } from '@/lib/codeGenerator'

export async function GET(request: NextRequest) {
  try {
    // Check if this is a public request (for QR orders) by checking referer or query param
    const url = new URL(request.url)
    const isPublic = url.searchParams.get('public') === 'true'
    
    // Only require auth if not a public request
    if (!isPublic) {
      const session = await getServerSession(authOptions)
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Fetch menu masters with categories and items for public QR orders
    const menuMasters = await prisma.menuMaster.findMany({
      where: {
        isActive: 1, // Only active menus for QR orders
      },
      include: isPublic ? {
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
      } : undefined,
      orderBy: { createdOn: 'desc' }
    })

    // If public request, fetch menu items for each category
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

      return NextResponse.json(menusWithItems)
    }

    // For authenticated requests, return simple structure
    const menusWithStringId = menuMasters.map((menu: any) => ({
      ...menu,
      menuMasterId: menu.menuMasterId.toString()
    }))

    return NextResponse.json(menusWithStringId)
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
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      labelName,
      colorCode,
      prepZoneCode,
      eventCode,
      isEventMenu,
      isActive
    } = body

    // Generate unique menu master code
    const menuMasterCode = await generateUniqueCode('menuMaster', 'menuMasterCode')

    // Create menu master
    const menuMaster = await prisma.menuMaster.create({
      data: {
        menuMasterCode,
        name,
        labelName: labelName || null,
        colorCode: colorCode || null,
        prepZoneCode: prepZoneCode || null,
        isEventMenu: isEventMenu || 0,
        isActive: isActive ?? 1,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    // If this is an event menu, create the association
    if (eventCode && isEventMenu === 1) {
      await prisma.menuMasterEvent.create({
        data: {
          menuMasterCode: menuMasterCode,
          eventCode: eventCode,
          createdBy: parseInt(session.user.id),
          storeCode: process.env.STORE_CODE || null
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
