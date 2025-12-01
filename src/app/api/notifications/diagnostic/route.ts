import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

/**
 * GET /api/notifications/diagnostic
 * Script de diagnostic du système de notifications
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const diagnostics: Record<string, unknown> = {}

    // 1. Vérifier les types de notifications
    const notificationTypes = await prisma.notificationType.findMany({
      where: { actif: true },
      select: {
        id: true,
        code: true,
        libelle: true,
        actif: true,
        rolesParDefaut: true,
      },
    })
    diagnostics.notificationTypes = {
      total: notificationTypes.length,
      types: notificationTypes.map(t => ({
        code: t.code,
        libelle: t.libelle,
        actif: t.actif,
        rolesParDefaut: t.rolesParDefaut,
      })),
    }

    // 2. Vérifier les notifications existantes
    const notificationsCount = await prisma.notification.count()
    const unreadNotifications = await prisma.notification.count({
      where: { estLue: false },
    })
    diagnostics.notifications = {
      total: notificationsCount,
      unread: unreadNotifications,
    }

    // 3. Vérifier les configurations utilisateurs
    const userConfigs = await prisma.notificationUserConfig.findMany({
      select: {
        userId: true,
        notificationTypeId: true,
        activeMail: true,
        activeInApp: true,
      },
    })
    diagnostics.userConfigs = {
      total: userConfigs.length,
      configs: userConfigs,
    }

    // 4. Vérifier les utilisateurs avec leurs rôles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
    diagnostics.users = {
      total: users.length,
      byRole: users.reduce((acc, user) => {
        const role = user.role || 'UNKNOWN'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    }

    // 5. Vérifier les notifications récentes (dernières 7 jours)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentNotifications = await prisma.notification.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        notificationType: {
          select: {
            code: true,
            libelle: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })
    diagnostics.recentNotifications = {
      count: recentNotifications.length,
      notifications: recentNotifications.map(n => ({
        id: n.id,
        code: n.notificationType.code,
        titre: n.titre,
        userId: n.userId,
        userName: n.user.name,
        estLue: n.estLue,
        createdAt: n.createdAt,
      })),
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du diagnostic',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  }
}

