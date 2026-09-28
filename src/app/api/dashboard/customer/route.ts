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

async function generateCustomerCode(storeCode: string): Promise<string> {
  const prefix = `WL${storeCode}CUS`
  const customers = await prisma.customerMaster.findMany({
    where: { customerCode: { startsWith: prefix } },
    select: { customerCode: true },
    orderBy: { customerId: 'desc' },
  })

  let nextNumber = 1
  if (customers.length > 0) {
    const numbers = customers
      .map((customer) => {
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const match = customer.customerCode.match(new RegExp(`^${escaped}(\\d+)$`))
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((num) => num > 0)
    if (numbers.length > 0) nextNumber = Math.max(...numbers) + 1
  }

  return `${prefix}${nextNumber}`
}

export async function GET(request: NextRequest) {
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

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)
    const customers = await prisma.customerMaster.findMany({
      where: { ...storeFilter, isDelete: false },
      orderBy: [{ customerName: 'asc' }, { customerId: 'asc' }],
    })

    return NextResponse.json(customers.map(serializeCustomer))
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await checkLocationPermission(session.user.role, 'customers.create'))) {
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

    const phoneTaken = await prisma.customerMaster.findFirst({
      where: {
        storeCode: selectedStoreCode,
        isDelete: false,
        phoneNumber: phoneNumber.value,
      },
    })
    if (phoneTaken) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 400 }
      )
    }

    const customerCode = await generateCustomerCode(selectedStoreCode)
    if (customerCode.length > 40) {
      return NextResponse.json(
        { error: 'Generated customer code exceeds 40 characters' },
        { status: 400 }
      )
    }

    const userId = parseInt(session.user.id, 10)
    const now = new Date()

    const customer = await prisma.customerMaster.create({
      data: {
        customerCode,
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
        isActive: body.isActive ?? true,
        createdBy: isNaN(userId) ? null : BigInt(userId),
        updatedBy: isNaN(userId) ? null : BigInt(userId),
        createdAt: now,
        updatedAt: now,
        storeCode: selectedStoreCode,
        syncSource: 'location',
      },
    })

    return NextResponse.json(serializeCustomer(customer), { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
