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
import { checkDuplicate } from '@/lib/validation'

// Helper function to generate unique fee code
async function generateFeeCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}FEE`

  const fees = await (prisma as any).feeMaster.findMany({
    where: {
      feeCode: {
        startsWith: prefix,
      },
    },
    select: { feeCode: true, feeId: true },
    orderBy: { feeId: 'desc' },
  })

  let nextNumber = 1

  if (fees.length > 0) {
    const numbers = fees
      .map((fee: any) => {
        const match = fee.feeCode.match(new RegExp(`^${prefix}(\\d+)$`))
        return match ? parseInt(match[1]) : 0
      })
      .filter((num: number) => num > 0)

    if (numbers.length > 0) {
      nextNumber = Math.max(...numbers) + 1
    }
  }

  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'fees.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

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

    const fees = await (prisma as any).feeMaster.findMany({
      where: {
        ...storeFilter,
        isDelete: false,
      },
      orderBy: { createdOn: 'desc' },
    })

    const serializedFees = fees.map((fee: any) => ({
      ...fee,
      feeId: fee.feeId.toString(),
      createdBy: fee.createdBy ? fee.createdBy.toString() : null,
      updatedBy: fee.updatedBy ? fee.updatedBy.toString() : null,
    }))

    return NextResponse.json(serializedFees)
  } catch (error) {
    console.error('Error fetching fees:', error)
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

    if (!(await checkLocationPermission(session.user.role, 'fees.create'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

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
    const { feeName, feeType, dollarPer, feeValue, isActive } = body

    if (!feeName) {
      return NextResponse.json(
        { error: 'Fee name is required' },
        { status: 400 }
      )
    }

    if (!feeType) {
      return NextResponse.json(
        { error: 'Fee type is required' },
        { status: 400 }
      )
    }

    const isDuplicate = await checkDuplicate(
      'tbl_fee_master',
      'fee_name',
      feeName,
      {
        storeCode: selectedStoreCode,
      }
    )
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Fee with this name already exists' },
        { status: 400 }
      )
    }

    const feeCode = await generateFeeCode(selectedStoreCode)

    const userId = parseInt(session.user.id, 10)

    const fee = await (prisma as any).feeMaster.create({
      data: {
        feeCode,
        feeName,
        feeType,
        dollarPer: dollarPer || 'Percent',
        feeValue: feeValue ?? 0,
        isActive: isActive ?? true,
        createdBy: isNaN(userId) ? null : BigInt(userId),
        updatedBy: isNaN(userId) ? null : BigInt(userId),
        createdOn: new Date(),
        updatedOn: new Date(),
        storeCode: selectedStoreCode,
        syncSource: 'location',
      } as any,
    })

    const serializedFee = {
      ...fee,
      feeId: fee.feeId.toString(),
      createdBy: fee.createdBy ? fee.createdBy.toString() : null,
      updatedBy: fee.updatedBy ? fee.updatedBy.toString() : null,
    }

    return NextResponse.json(serializedFee, { status: 201 })
  } catch (error: any) {
    console.error('Error creating fee:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Fee code already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

