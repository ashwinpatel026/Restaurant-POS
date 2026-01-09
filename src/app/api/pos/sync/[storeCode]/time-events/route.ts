import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

/**
 * @api {get} /api/pos/sync/:storeCode/time-events List time events
 * @apiName GetTimeEvents
 * @apiGroup TimeEvents
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiQuery {Boolean} [incremental=false] When true, return records updated since `lastSyncAt`
 * @apiQuery {String}  [lastSyncAt] ISO timestamp for incremental sync filter
 * @apiQuery {Number}  [limit] Maximum records to return
 * @apiQuery {Number}  [offset=0] Records to skip (pagination)
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
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')

    const where: any = { storeCode }
    if (incremental && lastSyncAt) {
      where.updatedOn = { gte: new Date(lastSyncAt) }
    }

    const queryOptions: any = {
      where,
      orderBy: { updatedOn: 'desc' }
    }
    if (limit) queryOptions.take = parseInt(limit, 10)
    if (offset) queryOptions.skip = parseInt(offset, 10)

    const [events, totalCount] = await Promise.all([
      locationPrisma.timeEvent.findMany(queryOptions),
      locationPrisma.timeEvent.count({ where })
    ])

    return NextResponse.json({
      success: true,
      storeCode,
      count: events.length,
      total: totalCount,
      pagination: {
        limit: limit ? parseInt(limit, 10) : null,
        offset: offset ? parseInt(offset, 10) : 0,
        total: totalCount
      },
      data: events.map(evt => ({
        ...evt,
        id: evt.id.toString()
      }))
    })
  } catch (error: any) {
    console.error('Error fetching time events:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {post} /api/pos/sync/:storeCode/time-events Create time event
 * @apiName CreateTimeEvent
 * @apiGroup TimeEvents
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code
 *
 * @apiBody {String} eventCode Unique event code
 * @apiBody {String} eventName Event name
 * @apiBody {String|Array} [deptCode] Department code(s) - can be string, JSON string, or JSON array
 * @apiBody {Number} [globalPriceAmountAdd] Amount add
 * @apiBody {Number} [globalPriceAmountDisc] Amount discount
 * @apiBody {Number} [globalPricePerAdd] Percent add
 * @apiBody {Number} [globalPricePerDisc] Percent discount
 * @apiBody {String} [monday] Monday flag
 * @apiBody {String} [monStartTime] Monday start time (HH:mm)
 * @apiBody {String} [monEndTime] Monday end time (HH:mm)
 * @apiBody {String} [tuesday] Tuesday flag
 * @apiBody {String} [tueStartTime] Tuesday start time
 * @apiBody {String} [tueEndTime] Tuesday end time
 * @apiBody {String} [wednesday] Wednesday flag
 * @apiBody {String} [wedStartTime] Wednesday start time
 * @apiBody {String} [wedEndTime] Wednesday end time
 * @apiBody {String} [thursday] Thursday flag
 * @apiBody {String} [thuStartTime] Thursday start time
 * @apiBody {String} [thuEndTime] Thursday end time
 * @apiBody {String} [friday] Friday flag
 * @apiBody {String} [friStartTime] Friday start time
 * @apiBody {String} [friEndTime] Friday end time
 * @apiBody {String} [saturday] Saturday flag
 * @apiBody {String} [satStartTime] Saturday start time
 * @apiBody {String} [satEndTime] Saturday end time
 * @apiBody {String} [sunday] Sunday flag
 * @apiBody {String} [sunStartTime] Sunday start time
 * @apiBody {String} [sunEndTime] Sunday end time
 * @apiBody {String} [eventStartDate] Event start date (ISO)
 * @apiBody {String} [eventEndDate] Event end date (ISO)
 * @apiBody {Number|Boolean} [isActive=1] Active flag
 * @apiBody {Number} [createdBy] User ID who created
 *
 * @apiError (400) BadRequest Missing required fields
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (409) Conflict Event code exists
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

    const { eventCode, eventName, isActive = 1 } = body
    if (!eventCode || !eventName) {
      return NextResponse.json(
        { error: 'eventCode and eventName are required' },
        { status: 400 }
      )
    }

    const existing = await locationPrisma.timeEvent.findUnique({
      where: { eventCode }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Time event with this code already exists' },
        { status: 409 }
      )
    }

    const data = addPOSSyncMetadata(
      {
        eventCode,
        eventName,
        deptCode: normalizeDeptCode(body.deptCode),
        globalPriceAmountAdd: body.globalPriceAmountAdd
          ? parseFloat(body.globalPriceAmountAdd)
          : null,
        globalPriceAmountDisc: body.globalPriceAmountDisc
          ? parseFloat(body.globalPriceAmountDisc)
          : null,
        globalPricePerAdd: body.globalPricePerAdd
          ? parseFloat(body.globalPricePerAdd)
          : null,
        globalPricePerDisc: body.globalPricePerDisc
          ? parseFloat(body.globalPricePerDisc)
          : null,
        monday: body.monday || null,
        monStartTime: body.monStartTime || null,
        monEndTime: body.monEndTime || null,
        tuesday: body.tuesday || null,
        tueStartTime: body.tueStartTime || null,
        tueEndTime: body.tueEndTime || null,
        wednesday: body.wednesday || null,
        wedStartTime: body.wedStartTime || null,
        wedEndTime: body.wedEndTime || null,
        thursday: body.thursday || null,
        thuStartTime: body.thuStartTime || null,
        thuEndTime: body.thuEndTime || null,
        friday: body.friday || null,
        friStartTime: body.friStartTime || null,
        friEndTime: body.friEndTime || null,
        saturday: body.saturday || null,
        satStartTime: body.satStartTime || null,
        satEndTime: body.satEndTime || null,
        sunday: body.sunday || null,
        sunStartTime: body.sunStartTime || null,
        sunEndTime: body.sunEndTime || null,
        eventStartDate: body.eventStartDate ? new Date(body.eventStartDate) : null,
        eventEndDate: body.eventEndDate ? new Date(body.eventEndDate) : null,
        isActive: isActive ? 1 : 0,
        createdBy: body.createdBy ? BigInt(body.createdBy) : null,
        createdDate: new Date()
      },
      storeCode
    )

    const event = await locationPrisma.timeEvent.create({ data })

    return NextResponse.json(
      {
        success: true,
        message: 'Time event created successfully',
        data: {
          ...event,
          id: event.id.toString()
        }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

