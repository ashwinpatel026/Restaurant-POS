import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
  checkLocationPermission,
} from '@/lib/auth/accessControl'

/** Status values: Free (default), Available, Occupied */
const TABLE_STATUSES = ['Free', 'Available', 'Occupied'] as const

function normalizeStatus(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const raw = String(value).trim()
  if (!raw) return undefined

  if (raw === '0') return 'Free'
  if (raw === '1') return 'Available'
  if (raw === '2') return 'Occupied'

  return (
    TABLE_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase()) ||
    undefined
  )
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

async function getAccessibleTable(
  tableId: number,
  accessInfo: Awaited<ReturnType<typeof getUserAccessInfo>>,
  selectedStoreCode: string | null
) {
  const table = await prisma.table.findUnique({
    where: { tableId },
  })

  if (!table || table.isDelete) {
    return { error: 'Table not found' as const, status: 404 as const, table: null }
  }

  if (selectedStoreCode && table.storeCode !== selectedStoreCode) {
    if (!canAccessStore(accessInfo, table.storeCode || '')) {
      return { error: 'Table not found' as const, status: 404 as const, table: null }
    }
    return {
      error: 'Table does not belong to the selected store' as const,
      status: 403 as const,
      table: null,
    }
  }

  if (table.storeCode && !canAccessStore(accessInfo, table.storeCode)) {
    return { error: 'Unauthorized' as const, status: 403 as const, table: null }
  }

  return { error: null, status: 200 as const, table }
}

// PUT /api/dashboard/tables/[id] → update full record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'tables.update'))) {
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

    const { id: idParam } = await params
    const id = Number(idParam)
    const body = await request.json()
    const { code, tableName, seatingCapacity, status, isActive } = body

    const { error, status: errStatus, table: existing } = await getAccessibleTable(
      id,
      accessInfo,
      selectedStoreCode
    )
    if (!existing) {
      return NextResponse.json({ error }, { status: errStatus })
    }

    if (code && String(code).trim() !== existing.code) {
      const duplicate = await prisma.table.findFirst({
        where: {
          code: String(code).trim(),
          storeCode: selectedStoreCode,
          isDelete: false,
          NOT: { tableId: id },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Table code already exists for this store' },
          { status: 400 }
        )
      }
    }

    const userId = parseInt(session.user.id)
    const parsedStatus = normalizeStatus(status)

    const updated = await prisma.table.update({
      where: { tableId: id },
      data: {
        code: code !== undefined ? String(code).trim() : undefined,
        tableName:
          tableName !== undefined ? String(tableName).trim() : undefined,
        seatingCapacity:
          typeof seatingCapacity === 'number'
            ? seatingCapacity
            : seatingCapacity !== undefined
              ? Number(seatingCapacity)
              : undefined,
        status: parsedStatus,
        isActive: typeof isActive === 'number' ? isActive : undefined,
        updatedBy: userId,
        updatedOn: new Date(),
        storeCode: existing.storeCode || selectedStoreCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: 'location',
      },
    })

    return NextResponse.json(mapTable(updated))
  } catch (error: any) {
    console.error('Error updating table:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Table code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/dashboard/tables/[id] → partial update (commonly for status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'tables.update'))) {
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

    const { id: idParam } = await params
    const id = Number(idParam)
    const body = await request.json()

    const { error, status: errStatus, table: existing } = await getAccessibleTable(
      id,
      accessInfo,
      selectedStoreCode
    )
    if (!existing) {
      return NextResponse.json({ error }, { status: errStatus })
    }

    const userId = parseInt(session.user.id)
    const parsedStatus = normalizeStatus(body.status)

    const updated = await prisma.table.update({
      where: { tableId: id },
      data: {
        status: parsedStatus,
        isActive: typeof body.isActive === 'number' ? body.isActive : undefined,
        updatedBy: userId,
        updatedOn: new Date(),
        storeCode: existing.storeCode || selectedStoreCode,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: 'location',
      },
    })

    return NextResponse.json(mapTable(updated))
  } catch (error) {
    console.error('Error patching table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/dashboard/tables/[id] → soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'tables.delete'))) {
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

    const { id: idParam } = await params
    const id = Number(idParam)

    const { error, status: errStatus, table: existing } = await getAccessibleTable(
      id,
      accessInfo,
      selectedStoreCode
    )
    if (!existing) {
      return NextResponse.json({ error }, { status: errStatus })
    }

    const userId = parseInt(session.user.id)

    await prisma.table.update({
      where: { tableId: id },
      data: {
        isDelete: true,
        isActive: 0,
        updatedBy: userId,
        updatedOn: new Date(),
        syncSource: 'location',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
