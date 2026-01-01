import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

/**
 * @api {get} /api/pos/sync/:storeCode/department-types/:id Get department type
 * @apiName GetDepartmentType
 * @apiGroup DepartmentType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Department type identifier (numeric `deptTypeId` or string `deptTypeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Department type record
 * @apiSuccess {String}  data.deptTypeId Department type ID (string)
 * @apiSuccess {String}  data.deptTypeCode Department type code
 * @apiSuccess {String}  data.name Department type display name
 * @apiSuccess {Number}  data.isActive Active status (0 or 1)
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  data.syncSource Sync source (e.g., "POS", "location")
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "data": {
 *     "deptTypeId": "1",
 *     "deptTypeCode": "DPT1",
 *     "name": "Food Service",
 *     "isActive": 1,
 *     "syncId": "550e8400-e29b-41d4-a716-446655440000",
 *     "syncSource": "POS"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department type not found
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

    // Try to find by ID first, then by deptTypeCode
    let departmentType = null
    const deptTypeId = parseInt(id)
    
    if (!isNaN(deptTypeId)) {
      departmentType = await locationPrisma.departmentType.findFirst({
        where: {
          deptTypeId: deptTypeId,
          storeCode
        }
      })
    }

    if (!departmentType) {
      departmentType = await locationPrisma.departmentType.findUnique({
        where: { deptTypeCode: id }
      })
    }

    if (!departmentType || departmentType.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department type not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...departmentType,
        deptTypeId: departmentType.deptTypeId.toString(),
        createdBy: departmentType.createdBy ? departmentType.createdBy.toString() : null,
        updatedBy: departmentType.updatedBy ? departmentType.updatedBy.toString() : null,
        createdOn: departmentType.createdOn ? departmentType.createdOn.toISOString() : null,
        updatedOn: departmentType.updatedOn ? departmentType.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error fetching department type:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/department-types/:id Update department type
 * @apiName UpdateDepartmentType
 * @apiGroup DepartmentType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Department type identifier (numeric `deptTypeId` or string `deptTypeCode`)
 *
 * @apiBody {String} [name] Department type display name
 * @apiBody {Number} [isActive] Active status (0 or 1)
 * @apiBody {Number} [updatedBy] User ID (integer) who updated the department type
 *
 * @apiParamExample {json} Request Body
 * {
 *   "name": "Updated Food Service",
 *   "isActive": 1,
 *   "updatedBy": 1002
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated department type record
 * @apiSuccess {String}  data.deptTypeId Department type ID (string)
 * @apiSuccess {String}  data.deptTypeCode Department type code
 * @apiSuccess {String}  data.name Department type display name
 * @apiSuccess {Number}  data.isActive Active status (0 or 1)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Department type updated successfully",
 *   "data": {
 *     "deptTypeId": "1",
 *     "deptTypeCode": "DPT1",
 *     "name": "Updated Food Service",
 *     "isActive": 1
 *   }
 * }
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department type not found
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

    // Find existing department type
    const deptTypeId = parseInt(id)
    let existingDeptType = null

    if (!isNaN(deptTypeId)) {
      existingDeptType = await locationPrisma.departmentType.findFirst({
        where: {
          deptTypeId: deptTypeId,
          storeCode
        }
      })
    }

    if (!existingDeptType) {
      existingDeptType = await locationPrisma.departmentType.findUnique({
        where: { deptTypeCode: id }
      })
    }

    if (!existingDeptType || existingDeptType.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department type not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = addPOSSyncMetadata({
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }, storeCode)

    // Preserve existing syncId - it should not change on update
    updateData.syncId = existingDeptType.syncId

    if (body.name !== undefined) updateData.name = body.name
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0

    // Update department type
    const updatedDeptType = await locationPrisma.departmentType.update({
      where: { deptTypeId: existingDeptType.deptTypeId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Department type updated successfully',
      data: {
        ...updatedDeptType,
        deptTypeId: updatedDeptType.deptTypeId.toString(),
        createdBy: updatedDeptType.createdBy ? updatedDeptType.createdBy.toString() : null,
        updatedBy: updatedDeptType.updatedBy ? updatedDeptType.updatedBy.toString() : null,
        createdOn: updatedDeptType.createdOn ? updatedDeptType.createdOn.toISOString() : null,
        updatedOn: updatedDeptType.updatedOn ? updatedDeptType.updatedOn.toISOString() : null
      }
    })
  } catch (error: any) {
    console.error('Error updating department type:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/department-types/:id Delete department type
 * @apiName DeleteDepartmentType
 * @apiGroup DepartmentType
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Department type identifier (numeric `deptTypeId` or string `deptTypeCode`)
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {String}  data.deptTypeCode Department type code
 * @apiSuccess {String}  data.deptTypeId Department type ID (string)
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "message": "Department type deleted successfully",
 *   "data": {
 *     "deptTypeCode": "DPT1",
 *     "deptTypeId": "1"
 *   }
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Department type not found
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

    // Find existing department type
    const deptTypeId = parseInt(id)
    let existingDeptType = null

    if (!isNaN(deptTypeId)) {
      existingDeptType = await locationPrisma.departmentType.findFirst({
        where: {
          deptTypeId: deptTypeId,
          storeCode
        }
      })
    }

    if (!existingDeptType) {
      existingDeptType = await locationPrisma.departmentType.findUnique({
        where: { deptTypeCode: id }
      })
    }

    if (!existingDeptType || existingDeptType.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Department type not found' },
        { status: 404 }
      )
    }

    // Delete department type
    await locationPrisma.departmentType.delete({
      where: { deptTypeId: existingDeptType.deptTypeId }
    })

    return NextResponse.json({
      success: true,
      message: 'Department type deleted successfully',
      data: {
        deptTypeCode: existingDeptType.deptTypeCode,
        deptTypeId: existingDeptType.deptTypeId.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting department type:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

