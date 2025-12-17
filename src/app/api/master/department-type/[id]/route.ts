import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const deptTypeId = BigInt(idParam)

    const departmentType = await masterPrisma.masterDepartmentType.findUnique({
      where: { deptTypeId: deptTypeId }
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const departmentType = await masterPrisma.masterDepartmentType.update({
      where: { deptTypeId: deptTypeId },
      data: {
        name,
        isActive: isActive ? 1 : 0,
        updatedBy: admin.adminId,
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
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const deptTypeId = BigInt(idParam)

    await masterPrisma.masterDepartmentType.delete({
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
