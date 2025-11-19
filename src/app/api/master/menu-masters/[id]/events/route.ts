import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

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
    const masterId = BigInt(resolvedParams.id)

    // Get the menu master to get its code
    const menuMaster = await masterPrisma.masterMenuMaster.findUnique({
      where: { menuMasterId: masterId }
    })

    if (!menuMaster) {
      return NextResponse.json({ error: 'Menu master not found' }, { status: 404 })
    }

    // Fetch associated events
    const events = await masterPrisma.masterMenuMasterEvent.findMany({
      where: { menuMasterCode: menuMaster.menuMasterCode }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching menu master events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

