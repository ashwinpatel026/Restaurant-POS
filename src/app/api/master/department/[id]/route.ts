import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const deptId = BigInt(idParam)

    const department = await masterPrisma.masterDepartment.findUnique({
      where: { deptId: deptId }
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const department = await masterPrisma.masterDepartment.update({
      where: { deptId: deptId },
      data: {
        deptName,
        deptTaxCode: deptTaxCode || null,
        deptTypeCode: deptTypeCode || null,
        isActive: isActive ? 1 : 0,
        updatedBy: admin.adminId,
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const deptId = BigInt(idParam)

    await masterPrisma.masterDepartment.delete({
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
