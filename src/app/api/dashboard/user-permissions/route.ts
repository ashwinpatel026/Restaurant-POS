import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserPermissions, clearPermissionCache } from '@/lib/auth/locationPermissionService'

// Return all permission codes for the currently logged-in dashboard user
// Uses the location database (synced permissions) for fast local checks.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roleCode = session.user.role as string

    // Check if force refresh is requested
    const url = new URL(request.url)
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    if (forceRefresh) {
      clearPermissionCache(roleCode)
      // console.log(`[user-permissions] Cache cleared for role: ${roleCode}`)
    }

    const permissions = await getUserPermissions(roleCode)

    // Debug logging (commented out - uncomment if needed for debugging)
    // console.log(`[user-permissions] Role: ${roleCode}, Permissions count: ${permissions.length}`)
    // if (permissions.length > 0) {
    //   console.log(`[user-permissions] Permissions:`, permissions.slice(0, 10).join(', '), permissions.length > 10 ? '...' : '')
    // }

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching user permissions for dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


