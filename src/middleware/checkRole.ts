import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function checkRole(
  requiredRole: 'ADMIN' | 'MANAGER' | 'USER'
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return {
      error: 'Non authentifié',
      status: 401
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true }
  })

  if (!user) {
    return {
      error: 'Utilisateur non trouvé',
      status: 404
    }
  }

  const roles = {
    ADMIN: 3,
    MANAGER: 2,
    USER: 1
  }

  if (roles[user.role] < roles[requiredRole]) {
    return {
      error: 'Accès non autorisé',
      status: 403
    }
  }

  return null
} 