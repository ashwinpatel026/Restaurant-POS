import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, canAccessStore } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const masterId = BigInt(resolvedParams.id)

    // Get the menu master to get its code
    const menuMaster = await prisma.menuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Validate store access
    if (menuMaster.storeCode) {
      if (!canAccessStore(accessInfo, menuMaster.storeCode)) {
        return NextResponse.json(
          { error: 'Access denied to this store' },
          { status: 403 }
        )
      }
    }

    // Get all event associations for this menu master
    const menuMasterEvents = await prisma.menuMasterEvent.findMany({
      where: { menuMasterCode: menuMaster.menuMasterCode },
      include: {
        timeEvent: true
      }
    })

    // Convert BigInt to string for JSON serialization
    const eventsWithStringId = menuMasterEvents.map((event: any) => ({
      ...event,
      id: event.id.toString(),
      timeEvent: event.timeEvent ? {
        ...event.timeEvent,
        id: event.timeEvent.id.toString()
      } : null
    }))

    return NextResponse.json(eventsWithStringId)
  } catch (error) {
    console.error('Error fetching menu master events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


