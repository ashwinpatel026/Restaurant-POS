import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

// Helper function to map employee response
function mapEmployeeResponse(emp: any) {
  return {
    ...emp,
    employeeId: emp.employeeId.toString(),
    createdBy: emp.createdBy ? emp.createdBy.toString() : null,
    createdOn: emp.createdOn ? emp.createdOn.toISOString() : null,
    updatedBy: emp.updatedBy ? emp.updatedBy.toString() : null,
    updatedOn: emp.updatedOn ? emp.updatedOn.toISOString() : null
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

    // Check permission to view employees
    if (!(await checkLocationPermission(session.user.role, 'employees.view'))) {
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
    const employeeId = BigInt(idParam)

    const employee = await prisma.employee.findFirst({
      where: {
        employeeId: employeeId,
        isDelete: false,
        ...storeFilter
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(mapEmployeeResponse(employee))
  } catch (error) {
    console.error('Error fetching employee:', error)
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

    // Check permission to update employees
    if (!(await checkLocationPermission(session.user.role, 'employees.update'))) {
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
    const employeeId = BigInt(idParam)
    const body = await request.json()

    const {
      employeeCode,
      employeeType,
      businessName,
      firstName,
      lastName,
      address,
      email,
      phoneno,
      posAccessThisLocation,
      posAccessCode,
      allowPosAllLocation,
      isUpdateEmpidAllLocation,
      isActive,
      roleCode,
      alternateId
    } = body

    if (!employeeCode) {
      return NextResponse.json(
        { error: 'Employee code is required' },
        { status: 400 }
      )
    }

    // Verify the employee belongs to the selected store and is not deleted
    const existing = await prisma.employee.findFirst({
      where: {
        employeeId: employeeId,
        isDelete: false,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const employee = await prisma.employee.update({
      where: { employeeId: employeeId },
      data: {
        employeeCode,
        employeeType: employeeType || null,
        businessName: businessName || null,
        firstName: firstName || null,
        lastName: lastName || null,
        address: address || null,
        email: email || null,
        phoneno: phoneno || null,
        posAccessThisLocation: posAccessThisLocation || null,
        posAccessCode: posAccessCode || null,
        allowPosAllLocation: allowPosAllLocation || null,
        isUpdateEmpidAllLocation: isUpdateEmpidAllLocation || null,
        isActive: isActive !== undefined ? isActive : null,
        roleCode: roleCode || null,
        alternateId: alternateId || null,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date()
      }
    })

    return NextResponse.json(mapEmployeeResponse(employee))
  } catch (error) {
    console.error('Error updating employee:', error)
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

    // Check permission to delete employees
    if (!(await checkLocationPermission(session.user.role, 'employees.delete'))) {
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
    const employeeId = BigInt(idParam)

    // Verify the employee belongs to the selected store
    const existing = await prisma.employee.findFirst({
      where: {
        employeeId: employeeId,
        ...storeFilter
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Soft delete: set isActive to 0 and isDelete to true
    await prisma.employee.update({
      where: { employeeId: employeeId },
      data: {
        isActive: 0,
        isDelete: true,
        updatedBy: BigInt(parseInt(session.user.id)),
        updatedOn: new Date()
      }
    })

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

