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

function serializeCustomer(customer: any) {
  return {
    ...customer,
    customerId: customer.customerId.toString(),
    createdBy: customer.createdBy ? customer.createdBy.toString() : null,
    updatedBy: customer.updatedBy ? customer.updatedBy.toString() : null,
  }
}

function readRequired(value: unknown, max: number, label: string) {
  const text = String(value ?? '').trim()
  if (!text) return { error: `${label} is required` }
  if (text.length > max) return { error: `${label} must be ${max} characters or fewer` }
  return { value: text }
}

function readOptional(value: unknown, max: number, label: string) {
  const text = String(value ?? '').trim()
  if (!text) return { value: null as string | null }
  if (text.length > max) return { error: `${label} must be ${max} characters or fewer` }
  return { value: text }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'customers.view'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    const selectedStoreCode = getSelectedStoreCode(
      accessInfo,
      request.nextUrl.searchParams.get('storeCode')
    )

    const resolvedParams = await params
    if (!/^\d+$/.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customer = await prisma.customerMaster.findUnique({
      where: { customerId: BigInt(resolvedParams.id) },
    })

    if (!customer || customer.isDelete) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (selectedStoreCode && customer.storeCode !== selectedStoreCode) {
      if (!canAccessStore(accessInfo, customer.storeCode || '')) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }
    }

    return NextResponse.json(serializeCustomer(customer))
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    if (!(await checkLocationPermission(session.user.role, 'customers.update'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
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

    const resolvedParams = await params
    if (!/^\d+$/.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerId = BigInt(resolvedParams.id)
    const existing = await prisma.customerMaster.findUnique({ where: { customerId } })

    if (!existing || existing.isDelete) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const customerName = readRequired(body.customerName, 150, 'Customer name')
    const phoneNumber = readRequired(body.phoneNumber, 20, 'Phone number')
    const businessName = readOptional(body.businessName, 100, 'Business name')
    const email = readOptional(body.email, 150, 'Email')
    const addressLine1 = readOptional(body.addressLine1, 255, 'Address line 1')
    const addressLine2 = readOptional(body.addressLine2, 150, 'Address line 2')
    const city = readOptional(body.city, 100, 'City')
    const state = readOptional(body.state, 100, 'State')
    const zipCode = readOptional(body.zipCode, 20, 'Zip code')
    const country = readOptional(body.country, 50, 'Country')

    const fieldError = [
      customerName,
      phoneNumber,
      businessName,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
    ].find((field) => 'error' in field && field.error)
    if (fieldError && 'error' in fieldError) {
      return NextResponse.json({ error: fieldError.error }, { status: 400 })
    }

    const storeCode = existing.storeCode || selectedStoreCode
    const phoneTaken = await prisma.customerMaster.findFirst({
      where: {
        storeCode,
        isDelete: false,
        phoneNumber: phoneNumber.value,
        NOT: { customerId },
      },
    })
    if (phoneTaken) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id, 10)
    const customer = await prisma.customerMaster.update({
      where: { customerId },
      data: {
        phoneNumber: phoneNumber.value!,
        customerName: customerName.value!,
        businessName: businessName.value,
        email: email.value,
        addressLine1: addressLine1.value,
        addressLine2: addressLine2.value,
        city: city.value,
        state: state.value,
        zipCode: zipCode.value,
        country: country.value,
        isActive: body.isActive ?? existing.isActive,
        updatedAt: new Date(),
        updatedBy: isNaN(userId) ? existing.updatedBy : BigInt(userId),
        storeCode,
        syncSource: 'location',
      },
    })

    return NextResponse.json(serializeCustomer(customer))
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    if (!(await checkLocationPermission(session.user.role, 'customers.delete'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    const resolvedParams = await params
    if (!/^\d+$/.test(resolvedParams.id)) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customerId = BigInt(resolvedParams.id)
    const existing = await prisma.customerMaster.findUnique({ where: { customerId } })

    if (!existing || existing.isDelete) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const userId = parseInt(session.user.id, 10)
    await prisma.customerMaster.update({
      where: { customerId },
      data: {
        isDelete: true,
        updatedAt: new Date(),
        updatedBy: isNaN(userId) ? existing.updatedBy : BigInt(userId),
      },
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
