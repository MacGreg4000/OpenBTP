import { DefaultSession } from 'next-auth'
import 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name?: string | null
    role: UserRole
  }

  interface Session extends DefaultSession {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      permissions: string[]
    } & DefaultSession["user"]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
  }
} 