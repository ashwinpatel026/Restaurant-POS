import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './database'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.isActive) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        const userAgent = req?.headers?.['user-agent'] || null
        const forwardedFor = req?.headers?.['x-forwarded-for'] as
          | string
          | string[]
          | undefined
        const realIp = req?.headers?.['x-real-ip'] as string | undefined

        const ipAddress = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor?.split(',')[0]?.trim() || realIp || null

        const storeCode = process.env.STORE_CODE || null

        try {
          await (prisma as any).userLoginActivity.create({
            data: {
              userId: user.id,
              email: user.email,
              storeCode,
              userAgent,
              ipAddress,
              success: 1,
            },
          })
        } catch (error) {
          console.error('Failed to record user login activity:', error)
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          outletId: (user as any).outletId?.toString() || null,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.outletId = user.outletId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.outletId = token.outletId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

