import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/departments/:id Get department
 * @apiName GetDepartment
 * @apiGroup Department
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Department identifier (numeric `deptId` or string `deptCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Department record
 * @apiSuccess {String}  data.deptId Department ID (string)
 * @apiSuccess {String}  data.deptCode Department code
 * @apiSuccess {String}  data.deptName Department display name
 * @apiSuccess {String}  [data.deptTaxCode] Tax code associated with department
 * @apiSuccess {String}  [data.deptTypeCode] Department type code
 * @apiSuccess {Number}  data.isActive Active status (0 or 1)
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "deptId": "1",
 *     "deptCode": "DEP001",
 *     "deptName": "Food Department",
 *     "deptTaxCode": "TAX001",
 *     "deptTypeCode": "DPT1",
 *     "isActive": 1,
 *     "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *     "syncSource": "POS"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Try to find by ID first, then by deptCode
    let department = null
    const deptId = parseInt(id)
    
    if (!isNaN(deptId)) {
      department = await locationPrisma.department.findFirst({
        where: {
          deptId: deptId,
          storeCode
        }
      })
    }

    if (!department) {
      department = await locationPrisma.department.findUnique({
        where: { deptCode: id }
      })
    }

    if (!department || department.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...department,
        deptId: department.deptId.toString(),
        createdBy: department.createdBy ? department.createdBy.toString() : null,
        updatedBy: department.updatedBy ? department.updatedBy.toString() : null,
        createdOn: department.createdOn ? department.createdOn.toISOString() : null,
        updatedOn: department.updatedOn ? department.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching department:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/departments/:id Update department
 * @apiName UpdateDepartment
 * @apiGroup Department
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Department identifier (numeric `deptId` or string `deptCode`)
 *
 * @apiBody {String} [deptName] Department display name
 * @apiBody {String} [deptTaxCode] Tax code associated with department
 * @apiBody {String} [deptTypeCode] Department type code
 * @apiBody {Number} [isActive] Active status (0 or 1)
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the department
 *
 * @apiParamExample {json} Request Body
 * {
 *   "deptName": "Updated Food Department",
 *   "deptTaxCode": "TAX002",
 *   "isActive": 1,
 *   "updatedBy": 1002
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated department record
 * @apiSuccess {String}  data.deptId Department ID (string)
 * @apiSuccess {String}  data.deptCode Department code
 * @apiSuccess {String}  data.deptName Department display name
 * @apiSuccess {String}  [data.deptTaxCode] Tax code associated with department
 * @apiSuccess {String}  [data.deptTypeCode] Department type code
 * @apiSuccess {Number}  data.isActive Active status (0 or 1)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Department updated successfully",
 *   "data": {
 *     "deptId": "1",
 *     "deptCode": "DEP001",
 *     "deptName": "Updated Food Department",
 *     "deptTaxCode": "TAX002",
 *     "deptTypeCode": "DPT1",
 *     "isActive": 1
 *   }
 * }
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Find existing department
    const deptId = parseInt(id)
    let existingDept = null

    if (!isNaN(deptId)) {
      existingDept = await locationPrisma.department.findFirst({
        where: {
          deptId: deptId,
          storeCode
        }
      })
    }

    if (!existingDept) {
      existingDept = await locationPrisma.department.findUnique({
        where: { deptCode: id }
      })
    }

    if (!existingDept || existingDept.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingDept.syncId

    if (body.deptName !== undefined) updateData.deptName = body.deptName
    if (body.deptTaxCode !== undefined) updateData.deptTaxCode = body.deptTaxCode || null
    if (body.deptTypeCode !== undefined) updateData.deptTypeCode = body.deptTypeCode || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0

    // Update department
    const updatedDept = await locationPrisma.department.update({
      where: { deptId: existingDept.deptId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
      data: {
        ...updatedDept,
        deptId: updatedDept.deptId.toString(),
        createdBy: updatedDept.createdBy ? updatedDept.createdBy.toString() : null,
        updatedBy: updatedDept.updatedBy ? updatedDept.updatedBy.toString() : null,
        createdOn: updatedDept.createdOn ? updatedDept.createdOn.toISOString() : null,
        updatedOn: updatedDept.updatedOn ? updatedDept.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error updating department:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/departments/:id Delete department
 * @apiName DeleteDepartment
 * @apiGroup Department
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Department identifier (numeric `deptId` or string `deptCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.deptCode Department code
 * @apiSuccess {String}  data.deptId Department ID (string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Department deleted successfully",
 *   "data": {
 *     "deptCode": "DEP001",
 *     "deptId": "1"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode, id } = resolvedParams

    // Authenticate request
    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    // Find existing department
    const deptId = parseInt(id)
    let existingDept = null

    if (!isNaN(deptId)) {
      existingDept = await locationPrisma.department.findFirst({
        where: {
          deptId: deptId,
          storeCode
        }
      })
    }

    if (!existingDept) {
      existingDept = await locationPrisma.department.findUnique({
        where: { deptCode: id }
      })
    }

    if (!existingDept || existingDept.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    // Delete department
    await locationPrisma.department.delete({
      where: { deptId: existingDept.deptId }
    })

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
      data: {
        deptCode: existingDept.deptCode,
        deptId: existingDept.deptId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting department:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

