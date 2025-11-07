import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return basic reports since we don't have orders yet
    // This will work with the simplified schema (Users + Outlets only)
    
    const totalUsers = await prisma.user.count()
    const totalOutlets = await (prisma as any).outlet.count()
    
    // Get users by role for reports
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      // Basic stats for current schema
      totalUsers,
      totalOutlets,
      usersByRole: roleStats,
      // Placeholder values for future order functionality
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: 0,
      averageOrderValue: 0,
      topSellingItems: [],
      salesByDate: [],
    })
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
