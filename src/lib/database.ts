import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Warm up database connection on server startup (non-blocking)
if (typeof window === 'undefined' && !globalForPrisma.prisma) {
  // Warm up connection in background
  prisma.$connect().catch(() => {
    // Silent fail - connection will be established on first query
  })
}

// Connection function
export async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL database connected successfully')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Health check function
export async function checkConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Database connection check failed:', error)
    return false
  }
}

// Disconnect function
export async function disconnectDB() {
  await prisma.$disconnect()
  console.log('✅ PostgreSQL database disconnected')
}

export default prisma
