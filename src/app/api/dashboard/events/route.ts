import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter, checkLocationPermission } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'
import { checkDuplicate } from '@/lib/validation'
import { normalizeDeptCode } from '@/lib/deptCodeHelper'

// Helper function to convert BigInt and Decimal fields for JSON serialization
function convertEventForJson(event: any): any {
  return {
    ...event,
    id: event.id.toString(),
    createdBy: event.createdBy ? event.createdBy.toString() : null,
    updatedBy: event.updatedBy ? event.updatedBy.toString() : null,
    overrideAllEvents: Boolean(event.overrideAllEvents || false),
    globalPriceAmountAdd: event.globalPriceAmountAdd ? Number(event.globalPriceAmountAdd) : null,
    globalPriceAmountDisc: event.globalPriceAmountDisc ? Number(event.globalPriceAmountDisc) : null,
    globalPricePerAdd: event.globalPricePerAdd ? Number(event.globalPricePerAdd) : null,
    globalPricePerDisc: event.globalPricePerDisc ? Number(event.globalPricePerDisc) : null,
  }
}

// GET all time events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to view events
    if (!(await checkLocationPermission(session.user.role, 'events.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const deptCode = searchParams.get('deptCode')
    const menuMasterCode = searchParams.get('menuMasterCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    // Parse menuMasterCode into array format (can be comma-separated string or null)
    const menuMasterCodeArray = menuMasterCode
      ? menuMasterCode.split(',').map(code => code.trim()).filter(Boolean)
      : null

    // Build where clause with optional department and menu master filtering
    let events

    // If filtering by department or menu master, use raw SQL for complex filtering
    if (deptCode || menuMasterCodeArray) {
      const params: any[] = []
      let paramIndex = 1
      const conditions: string[] = []

      // Department-based filtering
      if (deptCode) {
        conditions.push(
          `(te.override_all_events = true OR te.dept_code @> to_jsonb($${paramIndex}::text))`
        )
        params.push(deptCode)
        paramIndex++
      }

      // Menu master-based filtering
      if (menuMasterCodeArray && menuMasterCodeArray.length > 0) {
        conditions.push(
          `EXISTS (
            SELECT 1 FROM tbl_menu_master_event mme
            WHERE mme.event_code = te."Event_code"
            AND mme.menu_master_code = ANY($${paramIndex}::text[])
          )`
        )
        params.push(menuMasterCodeArray)
        paramIndex++
      }

      // Build store filter condition
      const storeCondition = storeFilter.storeCode 
        ? `AND te.store_code = $${paramIndex}::text`
        : ''
      if (storeFilter.storeCode) {
        params.push(storeFilter.storeCode)
        paramIndex++
      }

      const whereClause = conditions.length > 0
        ? `AND (${conditions.join(' OR ')})`
        : ''

      events = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT DISTINCT te.*
         FROM tbl_time_events te
         WHERE te.is_active = 1
           AND te.is_delete = FALSE
           ${storeCondition}
           ${whereClause}
         ORDER BY te.created_date DESC`,
        ...params
      )
    } else {
      // No filtering, use Prisma query
      events = await prisma.timeEvent.findMany({
        where: {
          ...storeFilter
        },
        orderBy: {
          createdDate: 'desc'
        }
      })
    }

    // Convert BigInt and Decimal to string/number for JSON serialization
    // If events came from raw query, they need special handling
    const eventsWithStringId = events.map((event: any) => {
      // If event came from raw query, it might have different structure
      if (event.Event_code) {
        // Convert raw query result to expected format
        return convertEventForJson({
          ...event,
          eventCode: event.Event_code,
          eventName: event.EventName,
          byFixedValue: event.by_fixed_value,
          overrideAllEvents: event.override_all_events,
          deptCode: event.dept_code,
          globalPriceAmountAdd: event.GlobalPrice_Amount_Add,
          globalPriceAmountDisc: event.GlobalPrice_Amount_Disc,
          globalPricePerAdd: event.GlobalPrice_Per_Add,
          globalPricePerDisc: event.GlobalPrice_Per_Disc,
          createdDate: event.created_date,
          updatedOn: event.updated_on,
          createdBy: event.created_by,
          updatedBy: event.updated_by,
          id: event.id,
          storeCode: event.store_code,
          isActive: event.is_active,
          isDelete: event.is_delete
        })
      }
      return convertEventForJson(event)
    })

    return NextResponse.json(eventsWithStringId, { status: 200 })
  } catch (error) {
    console.error('Error fetching time events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time events' },
      { status: 500 }
    )
  }
}

// Helper function to generate next event code
async function generateEventCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}TE`

  // Get all event codes that match the WL pattern for this store
  const events = await prisma.timeEvent.findMany({
    where: {
      eventCode: {
        startsWith: prefix
      },
      storeCode: storeCode
    },
    select: { eventCode: true },
    orderBy: { id: 'desc' }
  })

  let nextNumber = 1

  if (events.length > 0) {
    // Extract number from codes like "WLLOC01TE1", "WLLOC01TE2", etc.
    const numbers = events
      .map(event => {
        const match = event.eventCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  // Format as WL + STORE_CODE + TE + number starting from 1
  return `${prefix}${nextNumber}`
}

// Helper function to validate and store time string directly
function validateTimeString(time: string | null): string | null {
  if (!time || time.trim() === "") return null

  // Expect 24-hour format (HH:MM) - return as string
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }

  // If format doesn't match HH:MM, return null
  return null
}

// POST create new time event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission to create events
    if (!(await checkLocationPermission(session.user.role, 'events.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Check for duplicate event name
    if (body.eventName) {
      const isDuplicate = await checkDuplicate('timeEvent', 'eventName', body.eventName, {
        storeCode: selectedStoreCode
      });

      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Event with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Auto-generate event code for the selected store
    const eventCode = await generateEventCode(selectedStoreCode)

    const event = await prisma.timeEvent.create({
      data: {
        eventCode: eventCode,
        eventName: body.eventName,
        deptCode: normalizeDeptCode(body.deptCode),
        byFixedValue: Boolean(body.byFixedValue),
        overrideAllEvents: Boolean(body.overrideAllEvents),
        globalPriceAmountAdd: body.globalPriceAmountAdd || null,
        globalPriceAmountDisc: body.globalPriceAmountDisc || null,
        globalPricePerAdd: body.globalPricePerAdd || null,
        globalPricePerDisc: body.globalPricePerDisc || null,
        monday: body.monday || null,
        monStartTime: validateTimeString(body.monStartTime),
        monEndTime: validateTimeString(body.monEndTime),
        tuesday: body.tuesday || null,
        tueStartTime: validateTimeString(body.tueStartTime),
        tueEndTime: validateTimeString(body.tueEndTime),
        wednesday: body.wednesday || null,
        wedStartTime: validateTimeString(body.wedStartTime),
        wedEndTime: validateTimeString(body.wedEndTime),
        thursday: body.thursday || null,
        thuStartTime: validateTimeString(body.thuStartTime),
        thuEndTime: validateTimeString(body.thuEndTime),
        friday: body.friday || null,
        friStartTime: validateTimeString(body.friStartTime),
        friEndTime: validateTimeString(body.friEndTime),
        saturday: body.saturday || null,
        satStartTime: validateTimeString(body.satStartTime),
        satEndTime: validateTimeString(body.satEndTime),
        sunday: body.sunday || null,
        sunStartTime: validateTimeString(body.sunStartTime),
        sunEndTime: validateTimeString(body.sunEndTime),
        eventStartDate: body.eventStartDate && body.eventStartDate.trim() !== "" ? new Date(body.eventStartDate) : null,
        eventEndDate: body.eventEndDate && body.eventEndDate.trim() !== "" ? new Date(body.eventEndDate) : null,
        isActive: body.isActive ?? 1,
        createdBy: parseInt(session.user.id),
        storeCode: selectedStoreCode,
        isSyncToWeb: body.isSyncToWeb || 0,
        isSyncToLocal: body.isSyncToLocal || 0,
        syncSource: 'location' // Set sync_source to 'location' when created from dashboard
      }
    })

    // Call stored procedure to apply time event to menu items
    try {
      // Helper function to convert deptCode to comma-separated string
      const deptCodeToCommaSeparated = (deptCode: any): string => {
        if (!deptCode) return ''
        let deptArray: string[] = []
        if (Array.isArray(deptCode)) {
          deptArray = deptCode
        } else if (typeof deptCode === 'string') {
          try {
            const parsed = JSON.parse(deptCode)
            deptArray = Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            deptArray = [deptCode]
          }
        }
        return deptArray.filter(Boolean).join(',')
      }

      const deptCodeList = deptCodeToCommaSeparated(event.deptCode)
      const priceAdjustValue = 0 // SP reads prices from table, but pass 0 for compatibility
      const isOverride = event.overrideAllEvents

      // Escape single quotes in string parameters for SQL safety
      const escapedEventCode = eventCode.replace(/'/g, "''")
      const escapedStoreCode = selectedStoreCode.replace(/'/g, "''")
      const escapedDeptCodeList = deptCodeList.replace(/'/g, "''")

      // Log parameters before calling stored procedure
      console.log('Calling stored procedure sp_apply_time_event_to_menuitems_location with parameters:', {
        p_time_event_code: eventCode,
        p_store_code: selectedStoreCode,
        p_dept_code_list: deptCodeList,
        p_is_fixed_value: Boolean(body.byFixedValue),
        p_price_adjust_value: priceAdjustValue,
        p_is_override: isOverride,
        escapedEventCode,
        escapedStoreCode,
        escapedDeptCodeList
      })

      await prisma.$executeRawUnsafe(
        `CALL sp_apply_time_event_to_menuitems_location('${escapedEventCode}', '${escapedStoreCode}', '${escapedDeptCodeList}', ${Boolean(body.byFixedValue)}, ${priceAdjustValue}, ${isOverride})`
      )

      console.log(`Successfully applied time event ${eventCode} to menu items for store ${selectedStoreCode} and departments: ${deptCodeList || 'none'}`)
    } catch (spError: any) {
      // Log error but continue - event is created successfully
      console.error(`Error calling stored procedure for time event ${eventCode}:`, {
        error: spError.message,
        eventCode,
        storeCode: selectedStoreCode,
        deptCode: event.deptCode,
        stack: spError.stack
      })
      // Continue execution - event creation succeeded even if SP failed
    }

    // Convert BigInt and Decimal to string/number for JSON serialization
    const eventWithStringId = convertEventForJson(event)

    return NextResponse.json(eventWithStringId, { status: 201 })
  } catch (error: any) {
    console.error('Error creating time event:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Event code already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create time event' },
      { status: 500 }
    )
  }
}

