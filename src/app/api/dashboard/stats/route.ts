import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserAccessInfo, getSelectedStoreCode, buildStoreFilter } from '@/lib/auth/accessControl'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id))
    
    // Get selected store from query
    const searchParams = request.nextUrl.searchParams
    const queryStoreCode = searchParams.get('storeCode')
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode)
    
    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: 'No accessible store selected' },
        { status: 403 }
      )
    }
    
    // Filter by ONE store only
    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode)
    
    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Get stats for ONE store
    const [todayOrders, todaySales, activeOrders] = await Promise.all([
      // Today's orders count
      prisma.order.count({
        where: {
          ...storeFilter,
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      // Today's sales total
      prisma.order.aggregate({
        where: {
          ...storeFilter,
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: { not: 'CANCELLED' }
        },
        _sum: {
          total: true
        }
      }),
      // Active orders count
      prisma.order.count({
        where: {
          ...storeFilter,
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
          }
        }
      })
    ])

    return NextResponse.json({
      todayOrders,
      todaySales: Number(todaySales._sum.total || 0),
      activeOrders
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

