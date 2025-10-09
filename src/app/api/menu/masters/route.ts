import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const menuMasters = await prisma.menuMaster.findMany({
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(menuMasters)
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
      taxId,
      stationGroupId,
      availabilityId
    } = body

    const menuMaster = await prisma.menuMaster.create({
      data: {
        name,
        labelName,
        colorCode,
        taxId: parseInt(taxId),
        stationGroupId: stationGroupId ? parseInt(stationGroupId) : null,
        availabilityId: availabilityId ? parseInt(availabilityId) : null,
        createdBy: parseInt(session.user.id),
        storeCode: process.env.STORE_CODE || null
      }
    })

    return NextResponse.json(menuMaster, { status: 201 })
  } catch (error) {
    console.error('Error creating menu master:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
