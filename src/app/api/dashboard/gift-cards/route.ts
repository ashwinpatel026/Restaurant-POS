import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  buildStoreFilter,
  checkLocationPermission,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

async function generateGiftCardCodes(
  storeCode: string,
  count: number
): Promise<string[]> {
  const prefix = `WL${storeCode}GFT`

  const latest = await (prisma as any).giftCard.findFirst({
    where: {
      storeCode,
      giftCardCode: { startsWith: prefix },
    },
    select: { giftCardCode: true, giftCardId: true },
    orderBy: { giftCardId: 'desc' },
  })

  let nextNumber = 1
  if (latest?.giftCardCode) {
    const match = String(latest.giftCardCode).match(
      new RegExp(`^${prefix}(\\d+)$`)
    )
    if (match) {
      const parsed = parseInt(match[1], 10)
      if (!Number.isNaN(parsed) && parsed >= 1) nextNumber = parsed + 1
    }
  }

  return Array.from({ length: count }, (_, i) => `${prefix}${nextNumber + i}`)
}

function normalizeGiftCardNo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function serializeGiftCard(row: any) {
  return {
    ...row,
    createdBy: row.createdBy ? row.createdBy.toString() : null,
    updatedBy: row.updatedBy ? row.updatedBy.toString() : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      !(await checkLocationPermission(session.user.role, 'giftcards.view'))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10))

    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)

    const search = (searchParams.get('search') || '').trim()
    const status = (searchParams.get('status') || 'all').toLowerCase()

    const where: any = {
      ...storeFilter,
      isDelete: false,
    }

    if (search) {
      where.giftCardNo = { contains: search, mode: 'insensitive' }
    }

    if (status === 'active') {
      where.isActive = true
    } else if (status === 'inactive') {
      where.isActive = false
    }

    const giftCards = await (prisma as any).giftCard.findMany({
      where,
      orderBy: { createdOn: 'desc' },
    })

    return NextResponse.json(giftCards.map(serializeGiftCard))
  } catch (error) {
    console.error('Error fetching gift cards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (
      !(await checkLocationPermission(session.user.role, 'giftcards.create'))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10))

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
    const mode = typeof body?.mode === 'string' ? body.mode : null

    let giftCardNos: string[] = []

    if (mode === 'bulk') {
      const prefix = normalizeGiftCardNo(body?.prefix)
      const startFrom = Number(body?.startFrom)
      const count = Number(body?.count)

      if (!prefix) {
        return NextResponse.json(
          { error: 'Prefix is required' },
          { status: 400 }
        )
      }
      if (!Number.isFinite(startFrom) || startFrom < 0) {
        return NextResponse.json(
          { error: 'Start From must be a valid number' },
          { status: 400 }
        )
      }
      if (!Number.isFinite(count) || count <= 0 || count > 10000) {
        return NextResponse.json(
          { error: 'No Of Cards must be between 1 and 10000' },
          { status: 400 }
        )
      }

      giftCardNos = Array.from({ length: count }, (_, i) => `${prefix}${startFrom + i}`)
    } else if (mode === 'manual') {
      const raw = Array.isArray(body?.giftCardNos) ? body.giftCardNos : []
      giftCardNos = raw
        .map(normalizeGiftCardNo)
        .filter(Boolean) as string[]
    } else {
      return NextResponse.json(
        { error: 'Invalid mode' },
        { status: 400 }
      )
    }

    // Dedupe (case-insensitive)
    const seen = new Set<string>()
    giftCardNos = giftCardNos.filter((n) => {
      const key = n.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (giftCardNos.length === 0) {
      return NextResponse.json(
        { error: 'No gift card numbers provided' },
        { status: 400 }
      )
    }

    // Check duplicates in DB for selected store
    const existing = await (prisma as any).giftCard.findMany({
      where: {
        storeCode: selectedStoreCode,
        isDelete: false,
        giftCardNo: { in: giftCardNos },
      },
      select: { giftCardNo: true },
    })

    if (existing.length > 0) {
      const existingNos = existing
        .map((e: any) => e.giftCardNo)
        .filter(Boolean)
        .slice(0, 10)
      return NextResponse.json(
        {
          error: `Some gift card numbers already exist: ${existingNos.join(', ')}${
            existing.length > 10 ? '…' : ''
          }`,
        },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id, 10)
    const userIdBigInt = isNaN(userId) ? null : BigInt(userId)

    const giftCardCodes = await generateGiftCardCodes(
      selectedStoreCode,
      giftCardNos.length
    )

    const created = await (prisma as any).giftCard.createMany({
      data: giftCardNos.map((no, idx) => ({
        giftCardNo: no,
        giftCardCode: giftCardCodes[idx],
        cardAmount: 0,
        receivedAmount: 0,
        isClosed: 0,
        isActive: true,
        isDelete: false,
        topupAmount: 0,
        usedAmount: 0,
        createdBy: userIdBigInt,
        updatedBy: userIdBigInt,
        createdOn: new Date(),
        updatedOn: new Date(),
        storeCode: selectedStoreCode,
        syncSource: 'location',
      })),
      skipDuplicates: false,
    })

    return NextResponse.json(
      { createdCount: created.count },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating gift cards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

