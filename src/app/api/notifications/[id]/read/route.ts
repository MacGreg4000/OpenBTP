import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notificationService'

// PATCH /api/notifications/[id]/read - Marquer une notification comme lue
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    await NotificationService.markAsRead(id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors du marquage de la notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors du marquage de la notification' },
      { status: 500 }
    )
  }
}

