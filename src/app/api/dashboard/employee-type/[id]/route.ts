import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to map employee type response
function mapEmployeeTypeResponse(empType: any) {
  return {
    ...empType,
    employeeTypeId: empType.employeeTypeId.toString(),
    createdBy: empType.createdBy ? empType.createdBy.toString() : null,
    createdOn: empType.createdOn ? empType.createdOn.toISOString() : null,
    updatedBy: empType.updatedBy ? empType.updatedBy.toString() : null,
    updatedOn: empType.updatedOn ? empType.updatedOn.toISOString() : null
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

    // Check permission to view employee types
    if (!(await checkLocationPermission(session.user.role, 'employee_types.view'))) {
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
    const employeeTypeId = BigInt(idParam)

    const employeeType = await prisma.employeeType.findFirst({
      where: {
        employeeTypeId: employeeTypeId,
        ...storeFilter
      }
    })

    if (!employeeType) {
      return NextResponse.json({ error: 'Employee type not found' }, { status: 404 })
    }

    return NextResponse.json(mapEmployeeTypeResponse(employeeType))
  } catch (error) {
    console.error('Error fetching employee type:', error)
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

    // Check permission to update employee types
    if (!(await checkLocationPermission(session.user.role, 'employee_types.update'))) {
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
    const employeeTypeId = BigInt(idParam)
    const body = await request.json()

    const { typeName, description, isActive } = body

    if (!typeName) {
      return NextResponse.json(
        { error: 'Employee type name is required' },
        { status: 400 }
      )
    }

    // Verify the employee type belongs to the selected store
    const existing = await prisma.employeeType.findFirst({
      where: {
        employeeTypeId: employeeTypeId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Employee type not found' }, { status: 404 })
    }

    const employeeType = await prisma.employeeType.update({
      where: { employeeTypeId: employeeTypeId },
      data: {
        typeName,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapEmployeeTypeResponse(employeeType))
  } catch (error) {
    console.error('Error updating employee type:', error)
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

    // Check permission to delete employee types
    if (!(await checkLocationPermission(session.user.role, 'employee_types.delete'))) {
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
    const employeeTypeId = BigInt(idParam)

    // Verify the employee type belongs to the selected store
    const existing = await prisma.employeeType.findFirst({
      where: {
        employeeTypeId: employeeTypeId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Employee type not found' }, { status: 404 })
    }

    await prisma.employeeType.delete({
      where: { employeeTypeId: employeeTypeId }
    })

    return NextResponse.json({ message: 'Employee type deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee type:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

