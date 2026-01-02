import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique department type code
async function generateDepartmentTypeCode(): Promise<string> {
  // Get the latest department type code from master database
  const latestDeptType = await masterPrisma.masterDepartmentType.findFirst({
    orderBy: { deptTypeId: 'desc' },
    select: { deptTypeCode: true }
  })

  let nextNumber = 1
  
  if (latestDeptType?.deptTypeCode) {
    // Extract number from code like "DPT1", "DPT2", etc.
    const match = latestDeptType.deptTypeCode.match(/^DPT(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as DPT + number starting from 1
  return `DPT${nextNumber}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const departmentTypes = await masterPrisma.masterDepartmentType.findMany({
      orderBy: { createdOn: 'desc' }
    })

    const deptTypesWithStringId = departmentTypes.map(mapDepartmentTypeResponse)

    return NextResponse.json(deptTypesWithStringId)
  } catch (error) {
    console.error('Error fetching department types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEALER_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, isActive } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Department type name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const isDuplicate = await checkDuplicate('masterDepartmentType', 'name', name)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Department type with this name already exists' },
        { status: 400 }
      )
    }

    // Generate department type code automatically
    const deptTypeCode = await generateDepartmentTypeCode()

    const departmentType = await masterPrisma.masterDepartmentType.create({
      data: {
        deptTypeCode,
        name,
        isActive: isActive ? 1 : 0,
        createdBy: admin.adminId
      }
    })

    return NextResponse.json(mapDepartmentTypeResponse(departmentType), { status: 201 })
  } catch (error: any) {
    console.error('Error creating department type:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department type code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
