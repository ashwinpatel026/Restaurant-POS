import { NextRequest, NextResponse } from 'next/server'
import { masterPrisma } from '@/lib/databaseManager'
import { verifyMasterAdmin } from '@/lib/masterAuthHelper'
import { checkMasterPermission } from '@/lib/auth/accessControl'

// GET all permissions (optionally filtered by module)
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyMasterAdmin(request)
    
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permission
    const hasPermission = await checkMasterPermission(admin, 'permissions.view')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const module = url.searchParams.get('module')

    const where: any = {
      isActive: true
    }

    if (module) {
      where.module = module
    }

    const permissions = await masterPrisma.permission.findMany({
      where,
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    })

    // Convert permissions to serializable format (BigInt to string)
    const serializedPermissions = permissions.map(perm => ({
      permissionId: perm.permissionId.toString(),
      permissionCode: perm.permissionCode,
      permissionName: perm.permissionName,
      module: perm.module,
      action: perm.action,
      description: perm.description,
      isActive: perm.isActive,
    }))

    // Group by module
    const groupedPermissions = serializedPermissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = []
      }
      acc[perm.module].push(perm)
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      permissions: serializedPermissions,
      grouped: groupedPermissions
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

