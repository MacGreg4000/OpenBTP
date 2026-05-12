-- Insertion/mise à jour des modules de fonctionnalités
-- Utilise INSERT ... ON DUPLICATE KEY UPDATE pour être idempotent

INSERT INTO feature_modules (id, code, name, description, category, icon, isActive, isSystem, ordre, createdAt, updatedAt)
VALUES
  (UUID(), 'dashboard',            'Dashboard',                 'Page d\'accueil avec statistiques et vue d\'ensemble',     'system',        'ChartBarIcon',                  1, 1,  0, NOW(), NOW()),
  (UUID(), 'chantiers',            'Chantiers',                 'Gestion des chantiers, commandes et états d\'avancement',  'system',        'BuildingOfficeIcon',             1, 1,  1, NOW(), NOW()),
  (UUID(), 'crm',                  'CRM Prospects',             'Gestion des prospects et contacts commerciaux',            'commercial',    'BuildingOffice2Icon',            1, 0,  2, NOW(), NOW()),
  (UUID(), 'clients',              'Clients',                   'Gestion de la base clients',                               'commercial',    'UsersIcon',                     1, 0,  3, NOW(), NOW()),
  (UUID(), 'devis',                'Devis',                     'Création et gestion des devis clients',                    'commercial',    'DocumentTextIcon',              1, 0,  3, NOW(), NOW()),
  (UUID(), 'sous_traitants',       'Sous-traitants',            'Gestion des sous-traitants et ouvriers',                   'commercial',    'UserGroupIcon',                 1, 0,  4, NOW(), NOW()),
  (UUID(), 'inventory',            'Inventaire',                'Gestion des matériaux, racks et équipements',              'logistique',    'CubeIcon',                      1, 0, 10, NOW(), NOW()),
  (UUID(), 'outillage',            'Outillage',                 'Gestion des machines et prêts d\'outillage',               'logistique',    'WrenchScrewdriverIcon',         1, 0, 11, NOW(), NOW()),
  (UUID(), 'planning',             'Planning',                  'Planning des chantiers et ressources',                     'organisation',  'CalendarIcon',                  1, 0, 20, NOW(), NOW()),
  (UUID(), 'planning_chargements', 'Planification chargements', 'Gestion des planifications de chargements',                'logistique',    'TruckIcon',                     1, 0, 21, NOW(), NOW()),
  (UUID(), 'documents',            'Documents administratifs',  'Gestion des documents et administratif',                   'administratif', 'DocumentTextIcon',              1, 0, 30, NOW(), NOW()),
  (UUID(), 'bons_regie',           'Bons de régie',             'Gestion des bons de régie',                                'administratif', 'ClipboardDocumentListIcon',     1, 0, 31, NOW(), NOW()),
  (UUID(), 'choix_clients',        'Choix client',              'Gestion des choix et sélections clients',                  'commercial',    'SwatchIcon',                    1, 0, 32, NOW(), NOW()),
  (UUID(), 'sav',                  'SAV',                       'Service après-vente et tickets',                           'commercial',    'LifebuoyIcon',                  1, 0, 33, NOW(), NOW()),
  (UUID(), 'metres',               'Métrés soumis',             'Gestion des métrés et devis',                              'commercial',    'DocumentDuplicateIcon',         1, 0, 34, NOW(), NOW()),
  (UUID(), 'journal',              'Journal',                   'Journal d\'activité et historique',                        'administratif', 'CalendarDaysIcon',              1, 0, 40, NOW(), NOW()),
  (UUID(), 'messagerie',           'Messagerie',                'Chat et messagerie entre utilisateurs',                    'communication', 'ChatBubbleLeftRightIcon',       1, 0, 50, NOW(), NOW()),
  (UUID(), 'chat',                 'Assistant IA',              'Chatbot intelligent avec RAG',                             'ia',            'SparklesIcon',                  1, 0, 51, NOW(), NOW()),
  (UUID(), 'notifications',        'Notifications',             'Système de notifications email et in-app',                 'system',        'BellIcon',                      1, 0, 52, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  description = VALUES(description),
  isActive    = VALUES(isActive),
  ordre       = VALUES(ordre),
  updatedAt   = NOW();
