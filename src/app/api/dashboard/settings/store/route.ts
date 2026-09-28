import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  checkLocationPermission,
} from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

function serializeStore(store: any) {
  return {
    storeId: store.storeId.toString(),
    storeName: store.storeName,
    storeAddress1: store.storeAddress1,
    storeAddress2: store.storeAddress2,
    storeCity: store.storeCity,
    storeState: store.storeState,
    storeZipCode: store.storeZipCode,
    storePhoneNumber: store.storePhoneNumber,
    storeFaxNumber: store.storeFaxNumber,
    storeAccountNumber: store.storeAccountNumber,
    storeRoutingNumber: store.storeRoutingNumber,
    isActive: store.isActive,
    createdBy: store.createdBy,
    createdOn: store.createdOn ? store.createdOn.toISOString() : null,
    updatedBy: store.updatedBy,
    updatedOn: store.updatedOn ? store.updatedOn.toISOString() : null,
    isDelete: store.isDelete,
    storeCode: store.storeCode,
    companyCode: store.companyCode,
  }
}

/**
 * Returns the single store record for the currently selected store.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'settings.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10))
    const selectedStoreCode = getSelectedStoreCode(
      accessInfo,
      request.nextUrl.searchParams.get('storeCode')
    )

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const store = await prisma.store.findFirst({
      where: {
        storeCode: selectedStoreCode,
        isDelete: false,
      },
      orderBy: { storeId: 'desc' },
    })

    return NextResponse.json({
      storeCode: selectedStoreCode,
      store: store ? serializeStore(store) : null,
    })
  } catch (error) {
    console.error('Error fetching store info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
