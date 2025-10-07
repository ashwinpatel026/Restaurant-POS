import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const groupId = parseInt(resolvedParams.id)

    const stationGroup = await prisma.stationGroup.findUnique({
      where: { stationGroupId: groupId },
      include: {
        stationGroupLists: true,
        menuMasters: true
      }
    })

    if (!stationGroup) {
      return NextResponse.json({ error: 'Station group not found' }, { status: 404 })
    }

    return NextResponse.json(stationGroup)
  } catch (error) {
    console.error('Error fetching station group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN', 'OUTLET_MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const groupId = parseInt(resolvedParams.id)
    const body = await request.json()

    const stationGroup = await prisma.stationGroup.update({
      where: { stationGroupId: groupId },
      data: {
        ...body,
        updatedBy: parseInt(session.user.id),
        updatedOn: new Date()
      },
      include: {
        stationGroupLists: true,
        menuMasters: true
      }
    })

    return NextResponse.json(stationGroup)
  } catch (error) {
    console.error('Error updating station group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const groupId = parseInt(resolvedParams.id)

    await prisma.stationGroup.delete({
      where: { stationGroupId: groupId }
    })

    return NextResponse.json({ message: 'Station group deleted successfully' })
  } catch (error) {
    console.error('Error deleting station group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
