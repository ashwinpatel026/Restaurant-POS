import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

function serializeCourse(record: any) {
  return {
    ...record,
    courseId: record.courseId,
    createdBy: record.createdBy != null ? record.createdBy.toString() : null,
    updatedBy: record.updatedBy != null ? record.updatedBy.toString() : null,
    createdOn: record.createdOn ? record.createdOn.toISOString() : null,
    updatedOn: record.updatedOn ? record.updatedOn.toISOString() : null
  }
}

function posCourseMeta(data: any, storeCode: string) {
  const result = addPOSSyncMetadata(data, storeCode)
  delete result.isSyncToWeb
  delete result.isSyncToLocal
  return result
}

async function findCourse(storeCode: string, id: string) {
  if (!/^\d+$/.test(id)) return null

  return locationPrisma.course.findFirst({
    where: { courseId: parseInt(id, 10), storeCode, isDelete: false }
  })
}

/**
 * @api {get} /api/pos/sync/:storeCode/courses/:id Get course
 * @apiName GetCourse
 * @apiGroup Courses
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `courseId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {Object}  data Course record
 * @apiSuccess {Number}  data.courseId Course ID
 * @apiSuccess {String}  data.courseName Course name
 * @apiSuccess {Number}  data.displayOrder Display order
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {String}  data.syncId Unique sync identifier
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Course not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const course = await findCourse(storeCode, id)
    if (!course || course.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeCourse(course)
    })
  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/courses/:id Update course
 * @apiName UpdateCourse
 * @apiGroup Courses
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `courseId`
 *
 * @apiBody {String}  [courseName] Course name (max 50 characters)
 * @apiBody {Number}  [displayOrder] Display order
 * @apiBody {Boolean} [isActive] Active flag
 * @apiBody {Boolean} [isDelete] Soft delete flag
 * @apiBody {Number}  [updatedBy] User ID who updated the record
 *
 * @apiParamExample {json} Request Body
 * {
 *   "courseName": "Main Course",
 *   "displayOrder": 2,
 *   "isActive": true
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated course
 * @apiSuccess {Number}  data.courseId Course ID
 *
 * @apiError (400) BadRequest Invalid JSON body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Course not found
 * @apiError (409) Conflict Course name already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const existing = await findCourse(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const nextName =
      body.courseName !== undefined || body.course_name !== undefined
        ? String(body.courseName ?? body.course_name ?? '').trim()
        : undefined

    if (nextName !== undefined) {
      if (!nextName || nextName.length > 50) {
        return NextResponse.json(
          { error: 'courseName must be between 1 and 50 characters' },
          { status: 400 }
        )
      }

      const conflict = await locationPrisma.course.findFirst({
        where: {
          storeCode,
          isDelete: false,
          courseName: { equals: nextName, mode: 'insensitive' },
          NOT: { courseId: existing.courseId }
        }
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Course with this name already exists' },
          { status: 409 }
        )
      }
    }

    const payload: any = {
      updatedBy: body.updatedBy ? BigInt(body.updatedBy) : null
    }

    if (nextName !== undefined) payload.courseName = nextName
    if (body.displayOrder !== undefined || body.display_order !== undefined) {
      const displayOrder = Number(body.displayOrder ?? body.display_order)
      if (!Number.isInteger(displayOrder)) {
        return NextResponse.json(
          { error: 'displayOrder must be an integer' },
          { status: 400 }
        )
      }
      payload.displayOrder = displayOrder
    }
    if (body.isActive !== undefined) payload.isActive = body.isActive !== false
    if (body.isDelete !== undefined) payload.isDelete = body.isDelete === true

    const updateData = posCourseMeta(payload, storeCode)
    updateData.syncId = existing.syncId

    const updated = await locationPrisma.course.update({
      where: { courseId: existing.courseId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
      data: serializeCourse(updated)
    })
  } catch (error: any) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/courses/:id Delete course
 * @apiName DeleteCourse
 * @apiGroup Courses
 * @apiVersion 1.0.0
 *
 * @apiDescription Soft-deletes the course (`isDelete=true`, `isActive=false`).
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 * @apiParam {String} id Numeric `courseId`
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Deleted identifiers
 * @apiSuccess {Number}  data.courseId Course ID
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Course not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string; id: string }> }
) {
  try {
    const { storeCode, id } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const existing = await findCourse(storeCode, id)
    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    await locationPrisma.course.update({
      where: { courseId: existing.courseId },
      data: posCourseMeta(
        {
          isDelete: true,
          isActive: false,
          syncId: existing.syncId
        },
        storeCode
      )
    })

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
      data: {
        courseId: existing.courseId
      }
    })
  } catch (error: any) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
