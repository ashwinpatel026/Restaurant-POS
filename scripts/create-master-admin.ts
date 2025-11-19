import { PrismaClient } from '@prisma/master-client'
import bcrypt from 'bcryptjs'

const masterPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.MASTER_DATABASE_URL }
  }
})

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating super admin...')

    // Check if admin already exists
    const existingAdmin = await masterPrisma.admin.findUnique({
      where: { email: 'admin@master.com' }
    })

    if (existingAdmin) {
      console.log('⚠️  Super admin already exists!')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Username: ${existingAdmin.username}`)
      return
    }

    // Hash password
    const password = process.env.MASTER_ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create super admin
    const admin = await masterPrisma.admin.create({
      data: {
        email: 'admin@master.com',
        username: 'superadmin',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    console.log('✅ Super admin created successfully!')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Username: ${admin.username}`)
    console.log(`   Password: ${password}`)
    console.log('')
    console.log('🔐 Please change the password after first login!')
  } catch (error) {
    console.error('❌ Error creating super admin:', error)
    process.exit(1)
  } finally {
    await masterPrisma.$disconnect()
  }
}

// Run the script
createSuperAdmin()

