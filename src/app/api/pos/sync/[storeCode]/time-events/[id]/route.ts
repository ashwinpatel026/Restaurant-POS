import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

/**
 * @api {get} /api/pos/sync/:storeCode/time-events/:id Get time event
 * @apiName GetTimeEvent
 * @apiGroup TimeEvents
 * @apiVersion 1.0.0
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Time event identifier (BigInt `id` or `eventCode`)
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

    let event = null
    try {
      const eventId = BigInt(id)
      event = await locationPrisma.timeEvent.findFirst({
        where: { id: eventId, storeCode }
      })
    } catch {
      // ignore BigInt parse errors
    }

    if (!event) {
      event = await locationPrisma.timeEvent.findFirst({
        where: { eventCode: id, storeCode }
      })
    }

    if (!event || event.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Time event not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        id: event.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/time-events/:id Update time event
 * @apiName UpdateTimeEvent
 * @apiGroup TimeEvents
 * @apiVersion 1.0.0
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Time event identifier (BigInt `id` or `eventCode`)
 *
 * @apiBody {String} [eventName] Event name
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
 * @apiBody {Number|Boolean} [isActive] Active flag
 * @apiBody {Number} [updatedBy] User ID who updated
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

    let existing = null
    try {
      const eventId = BigInt(id)
      existing = await locationPrisma.timeEvent.findFirst({
        where: { id: eventId, storeCode }
      })
    } catch {
      // ignore BigInt parse errors
    }
    if (!existing) {
      existing = await locationPrisma.timeEvent.findFirst({
        where: { eventCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Time event not found' }, { status: 404 })
    }

    const updateData: any = addPOSSyncMetadata({}, storeCode)
    updateData.syncId = existing.syncId

    const numeric = (val: any) =>
      val === undefined || val === null || val === '' ? null : parseFloat(val)

    if (body.eventName !== undefined) updateData.eventName = body.eventName
    if (body.deptCode !== undefined) updateData.deptCode = normalizeDeptCode(body.deptCode)
    if (body.globalPriceAmountAdd !== undefined) updateData.globalPriceAmountAdd = numeric(body.globalPriceAmountAdd)
    if (body.globalPriceAmountDisc !== undefined) updateData.globalPriceAmountDisc = numeric(body.globalPriceAmountDisc)
    if (body.globalPricePerAdd !== undefined) updateData.globalPricePerAdd = numeric(body.globalPricePerAdd)
    if (body.globalPricePerDisc !== undefined) updateData.globalPricePerDisc = numeric(body.globalPricePerDisc)
    if (body.monday !== undefined) updateData.monday = body.monday
    if (body.monStartTime !== undefined) updateData.monStartTime = body.monStartTime
    if (body.monEndTime !== undefined) updateData.monEndTime = body.monEndTime
    if (body.tuesday !== undefined) updateData.tuesday = body.tuesday
    if (body.tueStartTime !== undefined) updateData.tueStartTime = body.tueStartTime
    if (body.tueEndTime !== undefined) updateData.tueEndTime = body.tueEndTime
    if (body.wednesday !== undefined) updateData.wednesday = body.wednesday
    if (body.wedStartTime !== undefined) updateData.wedStartTime = body.wedStartTime
    if (body.wedEndTime !== undefined) updateData.wedEndTime = body.wedEndTime
    if (body.thursday !== undefined) updateData.thursday = body.thursday
    if (body.thuStartTime !== undefined) updateData.thuStartTime = body.thuStartTime
    if (body.thuEndTime !== undefined) updateData.thuEndTime = body.thuEndTime
    if (body.friday !== undefined) updateData.friday = body.friday
    if (body.friStartTime !== undefined) updateData.friStartTime = body.friStartTime
    if (body.friEndTime !== undefined) updateData.friEndTime = body.friEndTime
    if (body.saturday !== undefined) updateData.saturday = body.saturday
    if (body.satStartTime !== undefined) updateData.satStartTime = body.satStartTime
    if (body.satEndTime !== undefined) updateData.satEndTime = body.satEndTime
    if (body.sunday !== undefined) updateData.sunday = body.sunday
    if (body.sunStartTime !== undefined) updateData.sunStartTime = body.sunStartTime
    if (body.sunEndTime !== undefined) updateData.sunEndTime = body.sunEndTime
    if (body.eventStartDate !== undefined) updateData.eventStartDate = body.eventStartDate ? new Date(body.eventStartDate) : null
    if (body.eventEndDate !== undefined) updateData.eventEndDate = body.eventEndDate ? new Date(body.eventEndDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive ? 1 : 0
    if (body.updatedBy !== undefined) updateData.updatedBy = BigInt(body.updatedBy)

    const updated = await locationPrisma.timeEvent.update({
      where: { id: existing.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Time event updated successfully',
      data: {
        ...updated,
        id: updated.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error updating time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * @api {delete} /api/pos/sync/:storeCode/time-events/:id Delete time event
 * @apiName DeleteTimeEvent
 * @apiGroup TimeEvents
 * @apiVersion 1.0.0
 *
 * @apiParam {String} storeCode Store code
 * @apiParam {String} id Time event identifier (BigInt `id` or `eventCode`)
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

    let existing = null
    try {
      const eventId = BigInt(id)
      existing = await locationPrisma.timeEvent.findFirst({
        where: { id: eventId, storeCode }
      })
    } catch {
      // ignore
    }
    if (!existing) {
      existing = await locationPrisma.timeEvent.findFirst({
        where: { eventCode: id, storeCode }
      })
    }

    if (!existing || existing.storeCode !== storeCode) {
      return NextResponse.json({ error: 'Time event not found' }, { status: 404 })
    }

    await locationPrisma.timeEvent.delete({
      where: { id: existing.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Time event deleted successfully',
      data: {
        eventCode: existing.eventCode,
        id: existing.id.toString()
      }
    })
  } catch (error: any) {
    console.error('Error deleting time event:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

