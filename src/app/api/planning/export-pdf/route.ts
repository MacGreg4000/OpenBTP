import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import { RemotePDFGenerator } from '@/lib/pdf/pdf-generator-remote';

interface TaskForPDF {
  id: string;
  title: string;
  start: Date;
  end: Date;
  chantierId?: string;
  chantier?: {
    nomChantier: string;
    chantierId: string;
  };
  ouvriersInternes: Array<{
    ouvrierInterneId: string;
    ouvrierInterne: {
      nom: string;
      prenom: string;
    };
  }>;
  sousTraitants: Array<{
    sousTraitantId: string;
    sousTraitant: {
      nom: string;
    };
  }>;
}

// Système de couleurs pour les tâches (identique au composant)
const TASK_COLORS = {
  // Couleur fixe pour les tâches libres
  LIBRE: {
    bg: '#f3f4f6', // bg-gray-100
    border: '#d1d5db', // border-gray-300
    text: '#374151' // text-gray-700
  },
  // Palette de couleurs pour les chantiers
  CHANTIER: [
    {
      bg: '#dbeafe', // bg-blue-100
      border: '#93c5fd', // border-blue-300
      text: '#1e40af' // text-blue-800
    },
    {
      bg: '#dcfce7', // bg-green-100
      border: '#86efac', // border-green-300
      text: '#166534' // text-green-800
    },
    {
      bg: '#f3e8ff', // bg-purple-100
      border: '#c4b5fd', // border-purple-300
      text: '#7c3aed' // text-purple-800
    },
    {
      bg: '#fed7aa', // bg-orange-100
      border: '#fdba74', // border-orange-300
      text: '#c2410c' // text-orange-800
    },
    {
      bg: '#fce7f3', // bg-pink-100
      border: '#f9a8d4', // border-pink-300
      text: '#be185d' // text-pink-800
    },
    {
      bg: '#e0e7ff', // bg-indigo-100
      border: '#a5b4fc', // border-indigo-300
      text: '#3730a3' // text-indigo-800
    },
    {
      bg: '#ccfbf1', // bg-teal-100
      border: '#5eead4', // border-teal-300
      text: '#115e59' // text-teal-800
    },
    {
      bg: '#fef3c7', // bg-amber-100
      border: '#fcd34d', // border-amber-300
      text: '#92400e' // text-amber-800
    }
  ]
};

// Fonction pour obtenir la couleur d'une tâche
const getTaskColor = (task: TaskForPDF, chantierColorMap: Map<string, number>) => {
  if (!task.chantierId || !task.chantier) {
    return TASK_COLORS.LIBRE;
  }
  
  const colorIndex = chantierColorMap.get(task.chantierId) || 0;
  return TASK_COLORS.CHANTIER[colorIndex % TASK_COLORS.CHANTIER.length];
};

export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer toutes les données nécessaires
    const [tasks, ouvriersInternes, soustraitants, _chantiers] = await Promise.all([
      prisma.task.findMany({
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
        },
        orderBy: {
          start: 'asc'
        }
      }),
      prisma.ouvrierInterne.findMany({
        orderBy: {
          nom: 'asc'
        }
      }),
      prisma.soustraitant.findMany({
        orderBy: {
          nom: 'asc'
        }
      }),
      prisma.chantier.findMany({
        where: {
          statut: 'EN_COURS'
        },
        select: {
          chantierId: true,
          nomChantier: true,
          statut: true
        },
        orderBy: {
          nomChantier: 'asc'
        }
      })
    ]);

    // Générer les créneaux de la semaine courante
    const generateTimeSlots = (weekOffset = 0) => {
      const slots = [];
      const today = new Date();
      
      // Trouver le lundi de la semaine courante
      const monday = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      monday.setDate(today.getDate() - daysFromMonday);
      
      // Ajouter l'offset pour la semaine suivante
      monday.setDate(monday.getDate() + (weekOffset * 7));
      
      // Générer 7 jours à partir du lundi
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        slots.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: date.toDateString() === today.toDateString(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        });
      }
      
      return slots;
    };

    const timeSlotsCurrent = generateTimeSlots(0); // Semaine courante
    const timeSlotsNext = generateTimeSlots(1);    // Semaine suivante

    // Créer le mapping des couleurs pour les chantiers (identique au composant)
    const chantierColorMap = new Map<string, number>();
    let colorIndex = 0;
    tasks.forEach((task: TaskForPDF) => {
      if (task.chantierId && !chantierColorMap.has(task.chantierId)) {
        chantierColorMap.set(task.chantierId, colorIndex);
        colorIndex++;
      }
    });

    // Fonction pour générer le HTML d'une semaine
    const generateWeekHTML = (timeSlots, weekTitle) => `
      <div class="page-break">
        <div class="header">
          <h1>Planning des Ressources</h1>
          <p>${weekTitle}</p>
        </div>

        <table class="calendar-container">
          <thead>
            <tr>
              <th class="resource-cell">Ressources</th>
              ${timeSlots.map(slot => `
                <th class="day-header ${slot.isWeekend ? 'weekend' : ''}">
                  ${slot.dayName}<br>
                  ${slot.dayNumber}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${ouvriersInternes.map(ouvrier => `
              <tr>
                <td class="resource-cell">
                  👤 ${ouvrier.prenom} ${ouvrier.nom}<br>
                  <small>${ouvrier.poste}</small>
                </td>
                ${timeSlots.map(slot => {
                  // Utiliser la même logique que le composant web pour individualiser les tâches
                  const dayTasks = [];
                  
                  tasks.forEach(task => {
                    const startDate = new Date(task.start);
                    const endDate = new Date(task.end);
                    
                    // Vérifier si cette tâche est assignée à cet ouvrier
                    const isAssignedToOuvrier = task.ouvriersInternes.some(assignment => 
                      assignment.ouvrierInterneId === ouvrier.id
                    );
                    
                    if (isAssignedToOuvrier) {
                      // Calculer tous les jours couverts par la tâche
                      const taskDates = [];
                      const currentDate = new Date(startDate);
                      while (currentDate <= endDate) {
                        taskDates.push(currentDate.toISOString().split('T')[0]);
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      
                      // Vérifier si ce jour spécifique est couvert par cette tâche
                      if (taskDates.includes(slot.date)) {
                        dayTasks.push(task);
                      }
                    }
                  });
                  
                  return `
                    <td class="${slot.isWeekend ? 'weekend' : ''}">
                      ${dayTasks.length > 0 ? 
                        dayTasks.map(task => {
                          const colors = getTaskColor(task, chantierColorMap);
                          return `
                          <div class="task-item" style="background-color: ${colors.bg}; border-color: ${colors.border}; color: ${colors.text};">
                            <div class="task-title">${task.title}</div>
                            <div class="task-dates">
                              ${new Date(task.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - 
                              ${new Date(task.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </div>
                            ${task.chantier ? `<div class="task-dates">${task.chantier.nomChantier}</div>` : ''}
                          </div>
                        `;
                        }).join('') :
                        '<div class="empty-slot">Libre</div>'
                      }
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
            
            ${soustraitants.map(soustraitant => `
              <tr>
                <td class="resource-cell">
                  🏢 ${soustraitant.nom}
                </td>
                ${timeSlots.map(slot => {
                  // Utiliser la même logique que le composant web pour individualiser les tâches
                  const dayTasks = [];
                  
                  tasks.forEach(task => {
                    const startDate = new Date(task.start);
                    const endDate = new Date(task.end);
                    
                    // Vérifier si cette tâche est assignée à ce sous-traitant
                    const isAssignedToSoustraitant = task.sousTraitants.some(assignment => 
                      assignment.soustraitantId === soustraitant.id
                    );
                    
                    if (isAssignedToSoustraitant) {
                      // Calculer tous les jours couverts par la tâche
                      const taskDates = [];
                      const currentDate = new Date(startDate);
                      while (currentDate <= endDate) {
                        taskDates.push(currentDate.toISOString().split('T')[0]);
                        currentDate.setDate(currentDate.getDate() + 1);
                      }
                      
                      // Vérifier si ce jour spécifique est couvert par cette tâche
                      if (taskDates.includes(slot.date)) {
                        dayTasks.push(task);
                      }
                    }
                  });
                  
                  return `
                    <td class="${slot.isWeekend ? 'weekend' : ''}">
                      ${dayTasks.length > 0 ? 
                        dayTasks.map(task => {
                          const colors = getTaskColor(task, chantierColorMap);
                          return `
                          <div class="task-item" style="background-color: ${colors.bg}; border-color: ${colors.border}; color: ${colors.text};">
                            <div class="task-title">${task.title}</div>
                            <div class="task-dates">
                              ${new Date(task.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - 
                              ${new Date(task.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </div>
                            ${task.chantier ? `<div class="task-dates">${task.chantier.nomChantier}</div>` : ''}
                          </div>
                        `;
                        }).join('') :
                        '<div class="empty-slot">Libre</div>'
                      }
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Créer le HTML pour le PDF avec les deux semaines
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          color: #333;
        }
        .page-break {
          page-break-after: always;
        }
        .page-break:last-child {
          page-break-after: avoid;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #f97316;
        }
        .header h1 {
          color: #f97316;
          margin: 0;
          font-size: 24px;
        }
        .header p {
          color: #666;
          margin: 5px 0 0 0;
        }
        .calendar-container {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        .calendar-container th,
        .calendar-container td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        .calendar-container th {
          background-color: #f97316;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        .resource-cell {
          background-color: #f9f9f9;
          font-weight: bold;
          width: 150px;
        }
        .day-header {
          text-align: center;
          background-color: #f97316;
          color: white;
        }
        .weekend {
          background-color: #f0f0f0;
        }
        .task-item {
          border: 1px solid;
          border-radius: 4px;
          padding: 4px;
          margin: 2px 0;
          font-size: 10px;
        }
        .task-title {
          font-weight: bold;
        }
        .task-dates {
          font-size: 9px;
        }
        .empty-slot {
          min-height: 60px;
          color: #999;
          font-style: italic;
        }
        .stats {
          margin-top: 30px;
          padding: 20px;
          background-color: #f5f5f5;
          border-radius: 8px;
        }
        .stats h3 {
          color: #f97316;
          margin-top: 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 15px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #f97316;
        }
        .stat-label {
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      ${generateWeekHTML(timeSlotsCurrent, `Semaine du ${timeSlotsCurrent[0].dayNumber} au ${timeSlotsCurrent[6].dayNumber} ${new Date(timeSlotsCurrent[0].date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`)}
      ${generateWeekHTML(timeSlotsNext, `Semaine du ${timeSlotsNext[0].dayNumber} au ${timeSlotsNext[6].dayNumber} ${new Date(timeSlotsNext[0].date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`)}
    </body>
    </html>
    `;

    // Vérifier que le service PDF distant est accessible
    console.log('🏥 Vérification du service PDF distant...');
    const isHealthy = await RemotePDFGenerator.checkHealth();
    if (!isHealthy) {
      throw new Error('Le service PDF distant n\'est pas accessible. Assurez-vous que le conteneur Docker est démarré.');
    }
    console.log('✅ Service PDF distant OK');

    // Générer le PDF avec le service distant
    console.log('📦 Génération du PDF via le service distant...');
    const pdfBuffer = await RemotePDFGenerator.generatePDF(html, {
      format: 'A3',
      orientation: 'landscape',
      margins: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    console.log(`✅ PDF généré avec succès (${pdfBuffer.length} bytes)`);

    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="planning-ressources-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Détails de l\'erreur:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération du PDF',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
