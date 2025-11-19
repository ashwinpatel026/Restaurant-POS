// Helper functions for master admin authentication
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { masterPrisma } from './databaseManager'

export async function verifyMasterAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(
      token,
      process.env.NEXTAUTH_SECRET || 'fallback-secret'
    ) as any

    if (decoded.type !== 'master_admin') {
      return null
    }

    const admin = await masterPrisma.admin.findUnique({
      where: { adminId: BigInt(decoded.adminId) }
    })

    if (!admin || !admin.isActive) {
      return null
    }

    return admin
  } catch {
    return null
  }
}

