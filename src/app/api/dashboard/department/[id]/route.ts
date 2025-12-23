import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to map department response
function mapDepartmentResponse(dept: any) {
  return {
    ...dept,
    deptId: dept.deptId.toString(),
    createdBy: dept.createdBy ? dept.createdBy.toString() : null,
    createdOn: dept.createdOn ? dept.createdOn.toISOString() : null,
    updatedBy: dept.updatedBy ? dept.updatedBy.toString() : null,
    updatedOn: dept.updatedOn ? dept.updatedOn.toISOString() : null
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
    const deptId = BigInt(idParam)

    const department = await prisma.department.findFirst({
      where: {
        deptId: deptId,
        ...storeFilter
      }
    })

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json(mapDepartmentResponse(department))
  } catch (error) {
    console.error('Error fetching department:', error)
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
    const deptId = BigInt(idParam)
    const body = await request.json()

    const { deptName, deptTaxCode, deptTypeCode, isActive } = body

    if (!deptName) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    // Verify the department belongs to the selected store
    const existing = await prisma.department.findFirst({
      where: {
        deptId: deptId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    const department = await prisma.department.update({
      where: { deptId: deptId },
      data: {
        deptName,
        deptTaxCode: deptTaxCode || null,
        deptTypeCode: deptTypeCode || null,
        isActive: isActive ? 1 : 0,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapDepartmentResponse(department))
  } catch (error) {
    console.error('Error updating department:', error)
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
    const deptId = BigInt(idParam)

    // Verify the department belongs to the selected store
    const existing = await prisma.department.findFirst({
      where: {
        deptId: deptId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    await prisma.department.delete({
      where: { deptId: deptId }
    })

    return NextResponse.json({ message: 'Department deleted successfully' })
  } catch (error) {
    console.error('Error deleting department:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
