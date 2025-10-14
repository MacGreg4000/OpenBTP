import { useSession } from 'next-auth/react'

export function usePermission(permission: string): boolean {
  const { data: session } = useSession()
  
  if (!session?.user?.role) {
    return false
  }

  // Mapping des permissions basé sur le rôle
  const rolePermissions: Record<string, string[]> = {
    'ADMIN': ['admin', 'rag_admin', 'configuration', 'users', 'all'],
    'MANAGER': ['manager', 'configuration', 'rag_admin'],
    'USER': ['user']
  }

  const userRole = session.user.role
  const permissions = rolePermissions[userRole] || []
  
  return permissions.includes(permission) || permissions.includes('all')
} 