import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './database'
import { clearPermissionCache as clearLocationPermissionCache } from './auth/locationPermissionService'

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

        if (!user) {
          throw new Error('Invalid credentials')
        }

        // Check if user is active
        if (!user.isActive) {
          throw new Error('Account is not active. Please contact administrator.')
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
          accessLevel: user.accessLevel || null,
          defaultStoreCode: user.defaultStoreCode || null,
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
        token.accessLevel = user.accessLevel
        token.defaultStoreCode = user.defaultStoreCode
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.outletId = token.outletId as string | null
        session.user.accessLevel = token.accessLevel as string | null
        session.user.defaultStoreCode = token.defaultStoreCode as string | null
      }
      return session
    }
  },
  events: {
    async signIn({ user }) {
      try {
        const role = (user as any)?.role as string | undefined
        // Clear cached permissions so the next session fetches fresh data
        clearLocationPermissionCache(role)
      } catch (error) {
        console.error('Failed to clear permission cache on sign in:', error)
      }
    },
    async signOut({ token }) {
      try {
        const role = (token as any)?.role as string | undefined
        // Clear cached permissions so the next login reloads fresh permissions
        clearLocationPermissionCache(role)
      } catch (error) {
        console.error('Failed to clear permission cache on sign out:', error)
      }
    },
  },
  pages: {
    signIn: '/login',
  },
  // Use custom API route for dashboard auth
  // This ensures separation from master auth
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

