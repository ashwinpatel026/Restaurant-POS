import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/database'

type Db = Prisma.TransactionClient

type TimeEventRow = {
  eventCode: string
  byFixedValue: boolean
  overrideAllEvents: boolean
  isActive: number | null
  globalPriceAmountAdd: Prisma.Decimal | null
  globalPriceAmountDisc: Prisma.Decimal | null
  globalPricePerAdd: Prisma.Decimal | null
  globalPricePerDisc: Prisma.Decimal | null
}

export function normalizeEventCodes(eventCodes: unknown): string[] {
  if (!Array.isArray(eventCodes)) return []
  return [
    ...new Set(
      eventCodes
        .map((code) => String(code ?? '').trim())
        .filter(Boolean)
    ),
  ]
}

function masterCodesFromJson(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter((code): code is string => typeof code === 'string' && code.length > 0)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((code): code is string => typeof code === 'string' && code.length > 0)
      }
    } catch {
      return [value]
    }
    return [value]
  }
  return []
}

function formulaValue(basePrice: Prisma.Decimal | null, event: TimeEventRow): number {
  const price = basePrice ? Number(basePrice) : 0
  if (event.byFixedValue) return 0

  const amountDisc = Number(event.globalPriceAmountDisc ?? 0)
  const amountAdd = Number(event.globalPriceAmountAdd ?? 0)
  const percentDisc = Number(event.globalPricePerDisc ?? 0)
  const percentAdd = Number(event.globalPricePerAdd ?? 0)

  let value = 0
  if (amountDisc > 0) value = price - amountDisc
  else if (amountAdd > 0) value = price + amountAdd
  else if (percentDisc > 0) value = price - (price * percentDisc) / 100
  else if (percentAdd > 0) value = price + (price * percentAdd) / 100

  return Math.round(value * 100) / 100
}

async function nextMenuItemTimeEventCode(db: Db, storeCode: string) {
  const prefix = `WL${storeCode}MT`
  const rows = await db.menuItemTimeEvent.findMany({
    where: {
      storeCode,
      menuItemTimeEventCode: { startsWith: prefix },
    },
    select: { menuItemTimeEventCode: true },
  })

  let max = 0
  for (const row of rows) {
    const match = row.menuItemTimeEventCode?.match(new RegExp(`^${prefix}(\\d+)$`))
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }

  return () => `${prefix}${++max}`
}

/**
 * Persist the menu master's selected time events on tbl_menu_master_event
 * and on tbl_menuitem_timeevent for every menu item assigned to that master.
 */
export async function saveMenuMasterTimeEvents(
  db: Db,
  params: {
    menuMasterCode: string
    storeCode: string
    eventCodes: string[]
    userId: number
  }
) {
  const { menuMasterCode, storeCode, userId } = params
  const requestedCodes = normalizeEventCodes(params.eventCodes)

  const previous = await db.menuMasterEvent.findMany({
    where: { menuMasterCode },
    select: { eventCode: true },
  })
  const previousCodes = previous.map((row) => row.eventCode)

  const events = requestedCodes.length
    ? await db.timeEvent.findMany({
        where: { eventCode: { in: requestedCodes }, isDelete: false },
        select: {
          eventCode: true,
          byFixedValue: true,
          overrideAllEvents: true,
          isActive: true,
          globalPriceAmountAdd: true,
          globalPriceAmountDisc: true,
          globalPricePerAdd: true,
          globalPricePerDisc: true,
        },
      })
    : []

  const eventsByCode = new Map(events.map((event) => [event.eventCode, event]))
  const validEvents = requestedCodes
    .map((code) => eventsByCode.get(code))
    .filter((event): event is TimeEventRow => Boolean(event))
  const validCodes = new Set(validEvents.map((event) => event.eventCode))

  await db.menuMaster.update({
    where: { menuMasterCode },
    data: { isEventMenu: validCodes.size > 0 ? 1 : 0 },
  })

  await db.menuMasterEvent.deleteMany({
    where: { menuMasterCode },
  })

  for (const event of validEvents) {
    await db.menuMasterEvent.create({
      data: {
        menuMasterCode,
        eventCode: event.eventCode,
        createdBy: userId,
        storeCode,
        syncSource: 'location',
      },
    })
  }

  const items = await db.menuItem.findMany({
    where: {
      storeCode,
      isDelete: false,
      menuMasterCode: { array_contains: menuMasterCode },
    },
    select: {
      menuItemCode: true,
      basePrice: true,
      menuMasterCode: true,
    },
  })

  const nextCode = await nextMenuItemTimeEventCode(db, storeCode)
  const removedCodes = previousCodes.filter((code) => !validCodes.has(code))
  const userIdBigInt = BigInt(userId)
  const now = new Date()

  for (const item of items) {
    if (!item.menuItemCode) continue

    for (const event of validEvents) {
      const existing = await db.menuItemTimeEvent.findFirst({
        where: {
          menuItemCode: item.menuItemCode,
          timeEventCode: event.eventCode,
          storeCode,
        },
        orderBy: { menuItemTimeEventId: 'desc' },
      })

      if (existing && !existing.isDelete) {
        await db.menuItemTimeEvent.update({
          where: { menuItemTimeEventId: existing.menuItemTimeEventId },
          data: {
            isActive: event.isActive === 1,
            isFixedValue: event.byFixedValue,
            isOverride: event.overrideAllEvents,
            updatedBy: userIdBigInt,
            updatedOn: now,
            syncSource: 'location',
          },
        })
        continue
      }

      const price = formulaValue(item.basePrice, event)
      if (existing) {
        await db.menuItemTimeEvent.update({
          where: { menuItemTimeEventId: existing.menuItemTimeEventId },
          data: {
            formulaValue: price,
            isFixedValue: event.byFixedValue,
            isOverride: event.overrideAllEvents,
            isDelete: false,
            isActive: event.isActive === 1,
            updatedBy: userIdBigInt,
            updatedOn: now,
            syncSource: 'location',
            ...(existing.menuItemTimeEventCode
              ? {}
              : { menuItemTimeEventCode: nextCode() }),
          },
        })
        continue
      }

      await db.menuItemTimeEvent.create({
        data: {
          menuItemTimeEventCode: nextCode(),
          menuItemCode: item.menuItemCode,
          timeEventCode: event.eventCode,
          formulaValue: price,
          isFixedValue: event.byFixedValue,
          isOverride: event.overrideAllEvents,
          isDelete: false,
          isActive: event.isActive === 1,
          storeCode,
          createdBy: userIdBigInt,
          syncSource: 'location',
        },
      })
    }

    if (removedCodes.length === 0) continue

    const otherMasterCodes = masterCodesFromJson(item.menuMasterCode).filter(
      (code) => code !== menuMasterCode
    )

    for (const removedCode of removedCodes) {
      if (otherMasterCodes.length > 0) {
        const stillLinked = await db.menuMasterEvent.findFirst({
          where: {
            eventCode: removedCode,
            menuMasterCode: { in: otherMasterCodes },
          },
          select: { id: true },
        })
        if (stillLinked) continue
      }

      await db.menuItemTimeEvent.updateMany({
        where: {
          menuItemCode: item.menuItemCode,
          timeEventCode: removedCode,
          storeCode,
          isDelete: false,
        },
        data: {
          isDelete: true,
          isActive: false,
          updatedBy: userIdBigInt,
          updatedOn: now,
          syncSource: 'location',
        },
      })
    }
  }
}
