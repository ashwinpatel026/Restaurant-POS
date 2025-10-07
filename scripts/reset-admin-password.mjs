import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...')
    
    // Hash the new password
    const newPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Update the admin user password
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@restaurant.com' },
      data: { password: hashedPassword }
    })
    
    console.log('✅ Admin password reset successfully!')
    console.log('📧 Email: admin@restaurant.com')
    console.log('🔑 Password: admin123')
    
    // Verify the password works
    const isValid = await bcrypt.compare(newPassword, updatedUser.password)
    console.log(`🔍 Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`)
    
  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetAdminPassword()
