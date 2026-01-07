import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Helper function to map role response
function mapRoleResponse(role: any) {
  return {
    roleId: role.roleId.toString(),
    roleCode: role.roleCode,
    roleName: role.roleName,
    description: role.description,
    isActive: role.isActive,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const roles = await prisma.role.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        roleName: 'asc'
      }
    })

    const rolesWithStringId = roles.map(mapRoleResponse)

    return NextResponse.json(rolesWithStringId)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

