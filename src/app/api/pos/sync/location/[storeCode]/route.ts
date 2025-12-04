import { NextRequest, NextResponse } from 'next/server'
import { verifyPOSClient, verifyStoreCode } from '@/lib/posAuthHelper'
import { masterPrisma } from '@/lib/databaseManager'

/**
 * GET /api/pos/sync/location/[storeCode]
 * Pull location information from Location/Master DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Verify POS authentication
    const authResult = await verifyPOSClient(request, storeCode)
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify store code exists
    const storeVerification = await verifyStoreCode(storeCode)
    if (!storeVerification.isValid) {
      return NextResponse.json(
        { error: storeVerification.error || 'Invalid store code' },
        { status: 404 }
      )
    }

    // Fetch location from master DB
    const location = await masterPrisma.location.findUnique({
      where: { storeCode }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Fetch related company and dealer information
    const [company, dealer] = await Promise.all([
      location.companyId
        ? masterPrisma.company.findUnique({
            where: { companyId: location.companyId },
            select: {
              companyId: true,
              companyCode: true,
              companyName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              country: true,
              zipcode: true,
              phone: true,
              email: true
            }
          })
        : null,
      location.dealerId
        ? masterPrisma.dealer.findUnique({
            where: { dealerId: location.dealerId },
            select: {
              dealerId: true,
              dealerCode: true,
              dealerName: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              country: true,
              zipcode: true,
              phone: true,
              email: true
            }
          })
        : null
    ])

    return NextResponse.json({
      location: {
        locationId: location.locationId.toString(),
        locationName: location.locationName,
        storeCode: location.storeCode,
        addressLine1: location.addressLine1,
        addressLine2: location.addressLine2,
        city: location.city,
        state: location.state,
        country: location.country,
        zipcode: location.zipcode,
        phone: location.phone,
        email: location.email,
        federalTaxId: location.federalTaxId,
        socialSecurityNumber: location.socialSecurityNumber,
        entityType: location.entityType,
        isActive: location.isActive === 1,
        syncEnabled: location.syncEnabled === 1,
        lastSyncAt: location.lastSyncAt,
        createdOn: location.createdOn,
        updatedOn: location.updatedOn
      },
      company: company
        ? {
            companyId: company.companyId.toString(),
            companyCode: company.companyCode,
            companyName: company.companyName,
            addressLine1: company.addressLine1,
            addressLine2: company.addressLine2,
            city: company.city,
            state: company.state,
            country: company.country,
            zipcode: company.zipcode,
            phone: company.phone,
            email: company.email
          }
        : null,
      dealer: dealer
        ? {
            dealerId: dealer.dealerId.toString(),
            dealerCode: dealer.dealerCode,
            dealerName: dealer.dealerName,
            addressLine1: dealer.addressLine1,
            addressLine2: dealer.addressLine2,
            city: dealer.city,
            state: dealer.state,
            country: dealer.country,
            zipcode: dealer.zipcode,
            phone: dealer.phone,
            email: dealer.email
          }
        : null
    })
  } catch (error: any) {
    console.error('Error fetching location info:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/sync/location/[storeCode]
 * Push location updates from POS to Location/Master DB
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> }
) {
  try {
    const resolvedParams = await params
    const { storeCode } = resolvedParams

    // Verify POS authentication
    const authResult = await verifyPOSClient(request, storeCode)
    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify store code exists
    const storeVerification = await verifyStoreCode(storeCode)
    if (!storeVerification.isValid) {
      return NextResponse.json(
        { error: storeVerification.error || 'Invalid store code' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      locationName,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipcode,
      phone,
      email,
      federalTaxId,
      socialSecurityNumber,
      entityType
    } = body

    // Update location in master DB
    // Note: Only allow updating certain fields from POS, not core fields like companyId, dealerId
    const updateData: any = {
      updatedOn: new Date()
    }

    if (locationName !== undefined) updateData.locationName = locationName
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (country !== undefined) updateData.country = country
    if (zipcode !== undefined) updateData.zipcode = zipcode
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (federalTaxId !== undefined) updateData.federalTaxId = federalTaxId
    if (socialSecurityNumber !== undefined) updateData.socialSecurityNumber = socialSecurityNumber
    if (entityType !== undefined) updateData.entityType = entityType

    // Update lastSyncAt to track POS sync
    updateData.lastSyncAt = new Date()

    const updatedLocation = await masterPrisma.location.update({
      where: { storeCode },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        locationId: updatedLocation.locationId.toString(),
        locationName: updatedLocation.locationName,
        storeCode: updatedLocation.storeCode,
        lastSyncAt: updatedLocation.lastSyncAt,
        updatedOn: updatedLocation.updatedOn
      }
    })
  } catch (error: any) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}

