import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/auth/locationPermissionService'

// Return all permission codes for the currently logged-in dashboard user
// Uses the location database (synced permissions) for fast local checks.
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleCode = session.user.role as string

    const permissions = await getUserPermissions(roleCode)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching user permissions for dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


