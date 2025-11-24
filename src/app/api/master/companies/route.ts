import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'

// Helper function to generate unique company code
async function generateCompanyCode(): Promise<string> {
  let attempts = 0
  const maxAttempts = 100
  
  while (attempts < maxAttempts) {
    // Find all companies with CO prefix and extract the highest number
    const companies = await masterPrisma.company.findMany({
      where: {
        companyCode: {
          startsWith: 'CO'
        }
      },
      select: { companyCode: true },
      orderBy: { companyId: 'desc' }
    })

    let nextNumber = 1
    
    if (companies.length > 0) {
      // Extract numbers from all CO codes and find the maximum
      const numbers = companies
        .map(c => {
          const match = c.companyCode.match(/^CO(\d+)$/i)
          return match ? parseInt(match[1]) : 0
        })
        .filter(n => n > 0)
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1
      }
    }
    
    // Format as CO + padded 3-digit number
    const companyCode = `CO${String(nextNumber).padStart(3, '0')}`
    
    // Check if this code already exists
    const existing = await masterPrisma.company.findUnique({
      where: { companyCode }
    })
    
    if (!existing) {
      return companyCode
    }
    
    // If code exists, try next number
    nextNumber++
    attempts++
  }
  
  // Fallback: use timestamp if we can't find a unique code
  const timestamp = Date.now().toString().slice(-6)
  return `CO${timestamp}`
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin || !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(admin.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companies = await masterPrisma.company.findMany({
      orderBy: {
        createdOn: 'desc'
      }
    })

    // Fetch counts separately for each company
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const [dealersCount, locationsCount, usersCount] = await Promise.all([
          masterPrisma.dealer.count({
            where: { companyId: company.companyId, isActive: 1 }
          }),
          masterPrisma.location.count({
            where: { companyId: company.companyId, isActive: 1 }
          }),
          masterPrisma.user.count({
            where: { companyId: company.companyId, isActive: true }
          })
        ])

        return {
          ...company,
          companyId: company.companyId.toString(),
          _count: {
            dealers: dealersCount,
            locations: locationsCount,
            users: usersCount
          }
        }
      })
    )

    return NextResponse.json(companiesWithCounts)
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
      companyName,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      zipcode,
      phone,
      email
    } = body

    // Generate unique company code
    const companyCode = await generateCompanyCode()

    const company = await masterPrisma.company.create({
      data: {
        companyCode,
        companyName,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        country: country || null,
        zipcode: zipcode || null,
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

