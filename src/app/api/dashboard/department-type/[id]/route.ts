import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to map department type response
function mapDepartmentTypeResponse(deptType: any) {
  return {
    ...deptType,
    deptTypeId: deptType.deptTypeId.toString(),
    createdBy: deptType.createdBy ? deptType.createdBy.toString() : null,
    createdOn: deptType.createdOn ? deptType.createdOn.toISOString() : null,
    updatedBy: deptType.updatedBy ? deptType.updatedBy.toString() : null,
    updatedOn: deptType.updatedOn ? deptType.updatedOn.toISOString() : null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view departments
    if (!(await checkLocationPermission(session.user.role, 'departments.view'))) {
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
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const { id: idParam } = await params
    const deptTypeId = BigInt(idParam)

    const departmentType = await prisma.departmentType.findFirst({
      where: {
        deptTypeId: deptTypeId,
        ...storeFilter
      }
    })

    if (!departmentType) {
      return NextResponse.json({ error: 'Department type not found' }, { status: 404 })
    }

    return NextResponse.json(mapDepartmentTypeResponse(departmentType))
  } catch (error) {
    console.error('Error fetching department type:', error)
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
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to update departments
    if (!(await checkLocationPermission(session.user.role, 'departments.update'))) {
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
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const { id: idParam } = await params
    const deptTypeId = BigInt(idParam)
    const body = await request.json()

    const { name, isActive } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Department type name is required' },
        { status: 400 }
      )
    }

    // Verify the department type belongs to the selected store
    const existing = await prisma.departmentType.findFirst({
      where: {
        deptTypeId: deptTypeId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department type not found' }, { status: 404 })
    }

    const departmentType = await prisma.departmentType.update({
      where: { deptTypeId: deptTypeId },
      data: {
        name,
        isActive: isActive ? 1 : 0,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapDepartmentTypeResponse(departmentType))
  } catch (error) {
    console.error('Error updating department type:', error)
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
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to delete departments
    if (!(await checkLocationPermission(session.user.role, 'departments.delete'))) {
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
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const { id: idParam } = await params
    const deptTypeId = BigInt(idParam)

    // Verify the department type belongs to the selected store
    const existing = await prisma.departmentType.findFirst({
      where: {
        deptTypeId: deptTypeId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department type not found' }, { status: 404 })
    }

    await prisma.departmentType.delete({
      where: { deptTypeId: deptTypeId }
    })

    return NextResponse.json({ message: 'Department type deleted successfully' })
  } catch (error) {
    console.error('Error deleting department type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
