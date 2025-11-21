import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companies = await masterPrisma.company.findMany({
      where: {
        isActive: 1
      },
      orderBy: {
        createdOn: 'desc'
      }
    })

    const companiesWithStringIds = companies.map(company => ({
      ...company,
      companyId: company.companyId.toString()
    }))

    return NextResponse.json(companiesWithStringIds)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      companyCode,
      companyName,
      address,
      phone,
      email
    } = body

    // Check if company code already exists
    const existingCompany = await masterPrisma.company.findUnique({
      where: { companyCode }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company code already exists' },
        { status: 400 }
      )
    }

    const company = await masterPrisma.company.create({
      data: {
        companyCode,
        companyName,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive: 1
      }
    })

    return NextResponse.json({
      ...company,
      companyId: company.companyId.toString()
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

