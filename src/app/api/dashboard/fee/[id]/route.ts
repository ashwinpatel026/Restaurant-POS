import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
  checkLocationPermission,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params
    const feeId = BigInt(resolvedParams.id)

    const fee = await (prisma as any).feeMaster.findUnique({
      where: { feeId },
    })

    if (!fee || fee.isDelete) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    if (selectedStoreCode && fee.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, fee.storeCode || '')) {
        return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
      }
    }

    const serializedFee = {
      ...fee,
      feeId: fee.feeId.toString(),
      createdBy: fee.createdBy ? fee.createdBy.toString() : null,
      updatedBy: fee.updatedBy ? fee.updatedBy.toString() : null,
    }

    return NextResponse.json(serializedFee)
  } catch (error) {
    console.error('Error fetching fee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'fees.update'))) {
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

    const resolvedParams = await params
    const feeId = BigInt(resolvedParams.id)
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

    const existingFee = await (prisma as any).feeMaster.findUnique({
      where: { feeId },
    })

    if (!existingFee || existingFee.isDelete) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    if (
      existingFee.storeCode &&
      !canAccessStore(accessInfo, existingFee.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = parseInt(session.user.id, 10)

    const fee = await (prisma as any).feeMaster.update({
      where: { feeId },
      data: {
        feeName,
        feeType,
        dollarPer: dollarPer || existingFee.dollarPer || 'Percent',
        feeValue: feeValue ?? existingFee.feeValue ?? 0,
        isActive: isActive ?? existingFee.isActive,
        updatedOn: new Date(),
        updatedBy: isNaN(userId) ? existingFee.updatedBy : BigInt(userId),
        storeCode: (existingFee as any).storeCode || selectedStoreCode,
        syncSource: 'location',
      } as any,
    })

    const serializedFee = {
      ...fee,
      feeId: fee.feeId.toString(),
      createdBy: fee.createdBy ? fee.createdBy.toString() : null,
      updatedBy: fee.updatedBy ? fee.updatedBy.toString() : null,
    }

    return NextResponse.json(serializedFee)
  } catch (error: any) {
    console.error('Error updating fee:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'fees.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))

    const resolvedParams = await params
    const feeId = BigInt(resolvedParams.id)

    const existingFee = await (prisma as any).feeMaster.findUnique({
      where: { feeId },
    })

    if (!existingFee || existingFee.isDelete) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    if (
      existingFee.storeCode &&
      !canAccessStore(accessInfo, existingFee.storeCode)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = parseInt(session.user.id, 10)

    await (prisma as any).feeMaster.update({
      where: { feeId },
      data: {
        isDelete: true,
        updatedOn: new Date(),
        updatedBy: isNaN(userId) ? existingFee.updatedBy : BigInt(userId),
      },
    })

    return NextResponse.json({ message: 'Fee deleted successfully' })
  } catch (error) {
    console.error('Error deleting fee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

