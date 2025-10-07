import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return basic stats since we don't have orders/tables yet
    // This will work with the simplified schema (Users + Outlets only)
    
    const totalUsers = await prisma.user.count()
    const totalOutlets = await prisma.outlet.count()
    
    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    return NextResponse.json({
      totalUsers,
      totalOutlets,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count.role
        return acc
      }, {} as Record<string, number>),
      // Placeholder values for dashboard compatibility
      todayOrders: 0,
      todaySales: 0,
      activeOrders: 0,
      occupiedTables: 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

