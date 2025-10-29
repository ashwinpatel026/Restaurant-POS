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
    const { name, colorCode, menuMasterId } = body

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
