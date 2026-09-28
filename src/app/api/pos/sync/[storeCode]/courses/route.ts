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

function readCourseName(body: any) {
  const value = body.courseName ?? body.course_name
  if (value === undefined || value === null) return undefined
  return String(value).trim()
}

function readDisplayOrder(body: any) {
  const value = body.displayOrder ?? body.display_order
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : NaN
}

/**
 * @api {get} /api/pos/sync/:storeCode/courses List courses
 * @apiName GetCourses
 * @apiGroup Courses
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Returns courses (`tbl_course`) for the store.
 * Soft-deleted records are excluded. Supports incremental sync.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Number}  count Number of records returned
 * @apiSuccess {Object[]} data Courses
 * @apiSuccess {Number}  data.courseId Course ID
 * @apiSuccess {String}  data.courseName Course name
 * @apiSuccess {Number}  data.displayOrder Display order
 * @apiSuccess {Boolean} data.isActive Active flag
 * @apiSuccess {Boolean} data.isDelete Soft delete flag
 * @apiSuccess {String}  [data.createdBy] Created-by user ID
 * @apiSuccess {String}  data.createdOn Created timestamp (ISO)
 * @apiSuccess {String}  [data.updatedBy] Updated-by user ID
 * @apiSuccess {String}  [data.updatedOn] Updated timestamp (ISO)
 * @apiSuccess {String}  [data.storeCode] Store code
 * @apiSuccess {String}  data.syncId Unique sync identifier
 * @apiSuccess {String}  [data.syncSource] Sync source
 *
 * @apiSuccessExample {json} 200 OK
 * {
 *   "success": true,
 *   "storeCode": "LOC001",
 *   "count": 1,
 *   "data": [
 *     {
 *       "courseId": 1,
 *       "courseName": "Appetizer",
 *       "displayOrder": 1,
 *       "isActive": true,
 *       "isDelete": false
 *     }
 *   ]
 * }
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const { storeCode } = await params

    const auth = await authenticatePOSRequest(request, storeCode)
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      )
    }

    const url = new URL(request.url)
    const lastSyncAt = url.searchParams.get('lastSyncAt')
    const incremental = url.searchParams.get('incremental') === 'true'

    const where: any = { storeCode, isDelete: false }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const courses = await locationPrisma.course.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { courseId: 'asc' }]
    })

    return NextResponse.json({
      success: true,
      storeCode,
      count: courses.length,
      data: courses.map(serializeCourse)
    })
  } catch (error: any) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/courses Create course
 * @apiName CreateCourse
 * @apiGroup Courses
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String} courseName Course name (max 50 characters)
 * @apiBody {Number} displayOrder Display order
 * @apiBody {Boolean} [isActive=true] Active flag
 * @apiBody {Number}  [createdBy] User ID who created the record
 * @apiBody {String}  [syncId] Unique sync identifier (auto-generated if omitted)
 *
 * @apiParamExample {json} Request Body
 * {
 *   "courseName": "Appetizer",
 *   "displayOrder": 1,
 *   "isActive": true
 * }
 *
 * @apiSuccess (201) {Boolean} success Request success flag
 * @apiSuccess (201) {String}  message Confirmation message
 * @apiSuccess (201) {Object}  data Created course
 * @apiSuccess (201) {Number}  data.courseId Course ID
 * @apiSuccess (201) {String}  data.courseName Course name
 *
 * @apiError (400) BadRequest Missing or invalid body fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Course name already exists
 * @apiError (500) InternalServerError Unexpected error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const { storeCode } = await params

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

    const courseName = readCourseName(body)
    const displayOrder = readDisplayOrder(body)

    if (!courseName || displayOrder === undefined || Number.isNaN(displayOrder)) {
      return NextResponse.json(
        { error: 'courseName and displayOrder are required' },
        { status: 400 }
      )
    }

    if (courseName.length > 50) {
      return NextResponse.json(
        { error: 'courseName must be 50 characters or fewer' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.course.findFirst({
      where: {
        storeCode,
        isDelete: false,
        courseName: { equals: courseName, mode: 'insensitive' }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Course with this name already exists' },
        { status: 409 }
      )
    }

    const created = await locationPrisma.course.create({
      data: posCourseMeta(
        {
          courseName,
          displayOrder,
          isActive: body.isActive !== false,
          createdBy: body.createdBy ? BigInt(body.createdBy) : null,
          createdOn: new Date(),
          syncId: body.syncId || undefined
        },
        storeCode
      )
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Course created successfully',
        data: serializeCourse(created)
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
