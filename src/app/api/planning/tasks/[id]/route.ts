import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

interface TaskUpdateData {
  title?: string;
  description?: string;
  start?: Date;
  end?: Date;
  status?: 'PREVU' | 'EN_COURS' | 'TERMINE';
  chantierId?: string;
}

// PUT - Mettre à jour une tâche (déplacement, modification)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const data = await request.json();
    
    const { 
      title, 
      description, 
      start, 
      end, 
      status, 
      chantierId,
      ouvrierInterneIds,
      soustraitantIds
    } = data;

    // Mettre à jour la tâche de base
    const updateData: TaskUpdateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start !== undefined) updateData.start = new Date(start);
    if (end !== undefined) updateData.end = new Date(end);
    if (status !== undefined) updateData.status = status;
    if (chantierId !== undefined) updateData.chantierId = chantierId;

      await prisma.task.update({
      where: { id: taskId },
      data: updateData
    });

    // Mettre à jour les assignations d'ouvriers internes si fournies
    if (ouvrierInterneIds !== undefined) {
      // Supprimer les assignations existantes
      await prisma.taskOuvrierInterne.deleteMany({
        where: { taskId }
      });

      // Créer les nouvelles assignations
      if (ouvrierInterneIds.length > 0) {
        await prisma.taskOuvrierInterne.createMany({
          data: ouvrierInterneIds.map((ouvrierId: string) => ({
            taskId,
            ouvrierInterneId: ouvrierId
          }))
        });
      }
    }

    // Mettre à jour les assignations de sous-traitants si fournies
    if (soustraitantIds !== undefined) {
      // Supprimer les assignations existantes
      await prisma.taskSousTraitant.deleteMany({
        where: { taskId }
      });

      // Créer les nouvelles assignations
      if (soustraitantIds.length > 0) {
        await prisma.taskSousTraitant.createMany({
          data: soustraitantIds.map((soustraitantId: string) => ({
            taskId,
            soustraitantId: soustraitantId
          }))
        });
      }
    }

    // Récupérer la tâche complète mise à jour
    const taskComplete = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        chantier: {
          select: {
            nomChantier: true,
            chantierId: true
          }
        },
        ouvriersInternes: {
          include: {
            ouvrierInterne: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                poste: true
              }
            }
          }
        },
        sousTraitants: {
          include: {
            soustraitant: {
              select: {
                id: true,
                nom: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(taskComplete);

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la tâche' },
      { status: 500 }
    );
  }
}

// PATCH - Actions spéciales sur une tâche (suppression de journée, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { action, date } = await request.json();
    
    if (action === 'removeDay') {
      // Récupérer la tâche originale
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          ouvriersInternes: true,
          sousTraitants: true
        }
      });

      if (!task) {
        return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 });
      }

      // Normaliser les dates pour ne comparer que les jours (sans heures)
      const startDate = new Date(task.start);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(task.end);
      endDate.setHours(0, 0, 0, 0);
      
      const removeDate = new Date(date);
      removeDate.setHours(0, 0, 0, 0);

      console.log('Dates normalisées:', { 
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0], 
        removeDate: removeDate.toISOString().split('T')[0] 
      });

      // Vérifier si la date à supprimer est dans la plage de la tâche
      if (removeDate < startDate || removeDate > endDate) {
        return NextResponse.json({ error: 'Date hors de la plage de la tâche' }, { status: 400 });
      }

      // Si c'est le premier jour, on décale le début
      if (removeDate.getTime() === startDate.getTime()) {
        const newStartDate = new Date(removeDate);
        newStartDate.setDate(newStartDate.getDate() + 1);
        newStartDate.setHours(9, 0, 0, 0); // 9h00 par défaut
        
        await prisma.task.update({
          where: { id: taskId },
          data: { start: newStartDate }
        });
      }
      // Si c'est le dernier jour, on décale la fin
      else if (removeDate.getTime() === endDate.getTime()) {
        const newEndDate = new Date(removeDate);
        newEndDate.setDate(newEndDate.getDate() - 1);
        newEndDate.setHours(17, 0, 0, 0); // 17h00 par défaut
        
        await prisma.task.update({
          where: { id: taskId },
          data: { end: newEndDate }
        });
      }
      // Si c'est un jour au milieu, on divise la tâche en deux
      else {
        // Créer une nouvelle tâche pour la période après la date supprimée
        const newTaskStart = new Date(removeDate);
        newTaskStart.setDate(newTaskStart.getDate() + 1);
        newTaskStart.setHours(9, 0, 0, 0); // 9h00 par défaut
        
        const newTask = await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            start: newTaskStart,
            end: task.end,
            status: task.status,
            chantierId: task.chantierId,
            savTicketId: task.savTicketId
          }
        });

        // Assigner les mêmes ressources à la nouvelle tâche
        if (task.ouvriersInternes.length > 0) {
          await prisma.taskOuvrierInterne.createMany({
            data: task.ouvriersInternes.map(assignment => ({
              taskId: newTask.id,
              ouvrierInterneId: assignment.ouvrierInterneId
            }))
          });
        }

        if (task.sousTraitants.length > 0) {
          await prisma.taskSousTraitant.createMany({
            data: task.sousTraitants.map(assignment => ({
              taskId: newTask.id,
              soustraitantId: assignment.soustraitantId
            }))
          });
        }

        // Modifier la tâche originale pour qu'elle se termine avant la date supprimée
        const newEndDate = new Date(removeDate);
        newEndDate.setDate(newEndDate.getDate() - 1);
        newEndDate.setHours(17, 0, 0, 0); // 17h00 par défaut
        
        await prisma.task.update({
          where: { id: taskId },
          data: { end: newEndDate }
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 });
  } catch (error) {
    console.error('Erreur lors de la modification de la tâche:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Supprimer une tâche
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Supprimer la tâche (les assignations seront supprimées automatiquement par CASCADE)
    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ message: 'Tâche supprimée avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la tâche' },
      { status: 500 }
    );
  }
}
