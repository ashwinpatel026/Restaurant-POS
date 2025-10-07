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

    const stationGroups = await prisma.stationGroup.findMany({
      orderBy: { createdOn: 'desc' }
    })

    return NextResponse.json(stationGroups)
  } catch (error) {
    console.error('Error fetching station groups:', error)
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
    const { groupName } = body

    const stationGroup = await prisma.stationGroup.create({
      data: {
        groupName,
        isActive: 1,
        createdBy: parseInt(session.user.id),
        storeCode: 'MAIN'
      }
    })

    return NextResponse.json(stationGroup, { status: 201 })
  } catch (error) {
    console.error('Error creating station group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
