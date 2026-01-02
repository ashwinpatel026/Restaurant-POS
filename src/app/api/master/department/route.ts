import { NextRequest, NextResponse } from 'next/server'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique department code
async function generateDepartmentCode(): Promise<string> {
  // Get the latest department code from master database
  const latestDept = await masterPrisma.masterDepartment.findFirst({
    orderBy: { deptId: 'desc' },
    select: { deptCode: true }
  })

  let nextNumber = 1
  
  if (latestDept?.deptCode) {
    // Extract number from code like "DEP1", "DEP2", etc.
    const match = latestDept.deptCode.match(/^DEP(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as DEP + number starting from 1
  return `DEP${nextNumber}`
}

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

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const departments = await masterPrisma.masterDepartment.findMany({
      orderBy: { createdOn: 'desc' }
    })

    const deptsWithStringId = departments.map(mapDepartmentResponse)

    return NextResponse.json(deptsWithStringId)
  } catch (error) {
    console.error('Error fetching departments:', error)
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
    const { deptName, deptTaxCode, deptTypeCode, isActive } = body

    // Validate required fields
    if (!deptName) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }

    // Check for duplicate name
    const isDuplicate = await checkDuplicate('masterDepartment', 'deptName', deptName)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Department with this name already exists' },
        { status: 400 }
      )
    }

    // Generate department code automatically
    const deptCode = await generateDepartmentCode()

    const department = await masterPrisma.masterDepartment.create({
      data: {
        deptCode,
        deptName,
        deptTaxCode: deptTaxCode || null,
        deptTypeCode: deptTypeCode || null,
        isActive: isActive ? 1 : 0,
        createdBy: admin.adminId
      }
    })

    return NextResponse.json(mapDepartmentResponse(department), { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Department code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
