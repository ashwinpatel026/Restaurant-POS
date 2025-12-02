import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo } from '@/lib/auth/accessControl'
import { masterPrisma } from '@/lib/databaseManager'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get location details for accessible stores
    const stores = await Promise.all(
      accessInfo.accessibleStoreCodes.map(async (storeCode) => {
        // Get location info from master DB
        const location = await masterPrisma.location.findFirst({
          where: { 
            storeCode: storeCode,
            isActive: 1
          },
          select: {
            locationName: true,
            companyId: true
          }
        })
        
        // Get company name if available
        let companyName = null
        if (location?.companyId) {
          const company = await masterPrisma.company.findUnique({
            where: { companyId: location.companyId },
            select: { companyName: true }
          })
          companyName = company?.companyName || null
        }
        
        return {
          storeCode,
          locationName: location?.locationName || storeCode,
          companyName: companyName,
          isDefault: storeCode === accessInfo.defaultStoreCode
        }
      })
    )

    // Sort: default first, then by name
    stores.sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return a.locationName.localeCompare(b.locationName)
    })

    return NextResponse.json(stores)
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

