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

    // Get basic stats from available models
    const totalUsers = await prisma.user.count()
    
    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    return NextResponse.json({
      totalUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count.role
        return acc
      }, {} as Record<string, number>),
      // Placeholder values for dashboard compatibility
      todayOrders: 0,
      todaySales: 0,
      activeOrders: 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

