import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  buildStoreFilter,
  checkLocationPermission,
} from '@/lib/auth/accessControl'

/** Status values: Free (default), Available, Occupied */
const TABLE_STATUSES = ['Free', 'Available', 'Occupied'] as const

function normalizeStatus(value: unknown, fallback: string = 'Free'): string {
  if (value === undefined || value === null || value === '') return fallback
  const raw = String(value).trim()
  if (!raw) return fallback

  // Support legacy numeric values if any client still sends them
  if (raw === '0') return 'Free'
  if (raw === '1') return 'Available'
  if (raw === '2') return 'Occupied'

  const matched = TABLE_STATUSES.find(
    (s) => s.toLowerCase() === raw.toLowerCase()
  )
  return matched || fallback
}

function mapTable(table: any) {
  return {
    ...table,
    tableId: table.tableId.toString(),
    createdBy: table.createdBy != null ? String(table.createdBy) : null,
    updatedBy: table.updatedBy != null ? String(table.updatedBy) : null,
    createdOn: table.createdOn?.toISOString?.() ?? table.createdOn ?? null,
    updatedOn: table.updatedOn?.toISOString?.() ?? table.updatedOn ?? null,
  }
}

async function generateTableCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}TBL`

  const tables = await prisma.table.findMany({
    where: {
      tableCode: { startsWith: prefix },
      storeCode,
    },
    select: { tableCode: true },
    orderBy: { tableId: 'desc' },
  })

  let nextNumber = 1

  if (tables.length > 0) {
    const numbers = tables
      .map((t) => {
        const match = t.tableCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((num) => num > 0)

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  return `${prefix}${nextNumber}`
}

// GET /api/dashboard/tables → list tables for selected store
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'tables.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    const queryStoreCode = request.nextUrl.searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)
    const statusParam = request.nextUrl.searchParams.get('status')?.trim()

    const where: Record<string, unknown> = {
      ...storeFilter,
      isDelete: false,
    }

    if (statusParam) {
      where.status = normalizeStatus(statusParam)
    }

    const tables = await prisma.table.findMany({
      where,
      orderBy: { createdOn: 'desc' },
    })

    return NextResponse.json(tables.map(mapTable))
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/dashboard/tables → create a table for selected store
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'tables.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    const queryStoreCode = request.nextUrl.searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { code, tableName, seatingCapacity, status, isActive } = body

    if (!code?.toString().trim() || !tableName?.toString().trim()) {
      return NextResponse.json(
        { error: 'code and tableName are required' },
        { status: 400 }
      )
    }

    if (seatingCapacity === undefined || seatingCapacity === null) {
      return NextResponse.json(
        { error: 'seatingCapacity is required' },
        { status: 400 }
      )
    }

    const trimmedCode = String(code).trim()

    const existing = await prisma.table.findFirst({
      where: {
        code: trimmedCode,
        storeCode: selectedStoreCode,
        isDelete: false,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Table code already exists for this store' },
        { status: 400 }
      )
    }

    const tableCode = await generateTableCode(selectedStoreCode)
    const userId = parseInt(session.user.id)

    const table = await prisma.table.create({
      data: {
        tableCode,
        code: trimmedCode,
        tableName: String(tableName).trim(),
        seatingCapacity: Number(seatingCapacity),
        status: normalizeStatus(status, 'Free'),
        isActive: typeof isActive === 'number' ? isActive : 1,
        isDelete: false,
        createdBy: userId,
        createdOn: new Date(),
        storeCode: selectedStoreCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: 'location',
      },
    })

    return NextResponse.json(mapTable(table), { status: 201 })
  } catch (error: any) {
    console.error('Error creating table:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Table code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
