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

    const menuMasters = await prisma.menuMaster.findMany({
      orderBy: { createdOn: 'desc' }
    })

    // Convert BigInt to string for JSON serialization
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
