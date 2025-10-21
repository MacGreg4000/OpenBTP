# ⚡ Démarrage Rapide - OpenBTP

Guide ultra-rapide pour démarrer avec OpenBTP en moins de 10 minutes.

---

## 🚀 Installation en 5 étapes

### 1️⃣ Prérequis
✅ Node.js 18+ installé (`node --version`)  
✅ MySQL 8+ installé (`mysql --version`)  
✅ Git installé

### 2️⃣ Télécharger

```bash
git clone https://github.com/MacGreg4000/OpenBTP.git
cd OpenBTP
npm install
```

### 3️⃣ Base de données

```bash
# Créer la base
mysql -u root -p
CREATE DATABASE openbtp;
EXIT;
```

### 4️⃣ Configuration

Créer le fichier `.env` :

```env
DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/openbtp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="changez_moi_par_une_cle_aleatoire_de_32_caracteres_minimum"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

💡 Générer un secret : `openssl rand -base64 32`

### 5️⃣ Initialiser et démarrer

```bash
npx prisma generate
npx prisma db push
npm run dev
```

➡️ **Ouvrez** http://localhost:3000

---

## 🎯 Première utilisation

### Page de setup (automatique)

Au premier accès, créez :

1. **Compte administrateur**
   - Email : `admin@votre-entreprise.com`
   - Nom : Votre nom
   - Mot de passe : **FORT** (min. 8 caractères)

2. **Informations entreprise**
   - Nom de votre entreprise
   - Adresse
   - TVA
   - Téléphone

3. **Email (optionnel - peut se faire plus tard)**
   - SMTP : `smtp.gmail.com` (ou autre)
   - Port : `587`
   - Utilisateur : `votre.email@gmail.com`
   - Mot de passe d'application

### Connexion

1. Vous êtes redirigé vers `/login`
2. Connectez-vous avec vos identifiants admin
3. Vous arrivez sur le **Dashboard** 🎉

---

## 📝 Créer votre premier chantier (2 minutes)

### Étape 1 : Créer un client

1. **Chantiers** → **Nouveau chantier**
2. Cliquer sur **"+ Nouveau client"**
3. Remplir :
   ```
   Nom : DUPONT SARL
   Email : contact@dupont.fr
   Téléphone : 01 23 45 67 89
   Adresse : 123 Rue de Paris, 75001 Paris
   ```
4. Enregistrer

### Étape 2 : Créer le chantier

1. Remplir le formulaire :
   ```
   Nom : Rénovation Villa Dupont
   Client : DUPONT SARL (sélectionner)
   Adresse : 456 Avenue des Champs, 75008 Paris
   Date début : Aujourd'hui
   État : En préparation
   ```
2. **Créer le chantier**

### Étape 3 : Créer la commande

1. Sur la fiche du chantier → Icône **€** (Commande)
2. **"Créer une commande"**
3. Ajouter des lignes :
   ```
   Ligne 1:
   - Article : Démolition cloisons
   - Type : QP
   - Quantité : 1
   - Unité : Ens
   - Prix : 2500
   
   Ligne 2:
   - Article : Pose cloison placo BA13
   - Type : DP
   - Quantité : 25
   - Unité : m²
   - Prix : 45
   ```
4. **Verrouiller la commande** (pour permettre les états d'avancement)

✅ **Votre premier chantier est prêt !**

---

## 📊 Créer un état d'avancement (1 minute)

1. **Chantier** → **États d'avancement**
2. **"Nouvel état d'avancement"**
3. Pour chaque ligne, indiquer les quantités réalisées :
   ```
   Démolition : 1.00 (100% fait)
   Cloison placo : 15.00 (60% fait)
   ```
4. Ajouter un commentaire : "Avancement octobre 2025"
5. **Finaliser l'état**
6. Icône **📧** → Envoyer au client par email

---

## 📄 Créer un rapport de visite (3 minutes)

1. **Chantier** → **Rapports** → **"Nouveau rapport"**
2. **Date** : Aujourd'hui
3. **Personnes présentes** :
   - Ajouter : "Jean Dupont - Chef de chantier"
   - Ajouter : "Marie Martin - Client"
4. **Tags** : Créer "Plomberie", "Électricité"
5. **Notes** :
   - Note 1 : "Problème fuite salle de bain" → Tag "Plomberie"
   - Note 2 : "Tableaux électriques OK" → Tag "Électricité"
6. **Photos** : Ajouter des photos avec annotations et tags
7. **Enregistrer**

**Bonus** : Générer un rapport filtré "Plomberie" pour l'envoyer au plombier uniquement !

---

## 🛠️ Fonctionnalités à tester

### Essayez ces fonctionnalités dès maintenant :

#### 1. Sous-traitants (5 min)
- Créer un sous-traitant
- Générer un contrat
- Créer une commande sous-traitant
- Créer son état d'avancement

#### 2. SAV (3 min)
- **SAV** → **Nouveau ticket**
- Décrire un problème
- Assigner à un technicien
- Ajouter des photos

#### 3. Outillage (2 min)
- **Outillage** → **Nouvelle machine**
- Scanner le QR Code généré
- Créer un prêt
- Retourner la machine

#### 4. Bon de régie public (2 min)
- Accéder à `/public/bon-regie`
- Remplir le formulaire
- Signer avec la souris/doigt
- Enregistrer
- Associer au chantier depuis l'admin

#### 5. Réception (5 min)
- **Chantier** → **Réception**
- Créer une réception
- Générer un code PIN
- Accéder avec le code PIN sur `/public/reception`
- Ajouter une remarque avec photo
- Valider la remarque depuis l'admin

---

## 🎨 Personnalisation rapide

### Logo de l'entreprise

1. **Paramètres** → **Informations de l'entreprise**
2. Section **"Logo"**
3. Upload votre logo (PNG, fond transparent recommandé)
4. Enregistrer

➡️ Le logo apparaîtra sur tous les documents générés !

### Templates de contrats

1. **Admin** → **Templates de contrats**
2. Modifier le template "Contrat Professionnel"
3. Personnaliser selon vos besoins
4. Activer le template

---

## 💡 Astuces

### Raccourcis clavier

- `F12` : Ouvrir la console développeur
- `Ctrl/Cmd + K` : Recherche globale (à venir)

### Navigation rapide

Utilisez le **fil d'Ariane** en haut de chaque page pour naviguer.

### Mode sombre

Icône **🌙/☀️** en haut à droite pour changer de thème.

### Filtres et recherche

Presque toutes les listes ont :
- 🔍 Barre de recherche
- 🏷️ Filtres par tags/statut
- 📄 Pagination

---

## 🔧 Commandes utiles

```bash
# Démarrer l'app
npm run dev

# Voir la base de données
npx prisma studio

# Logs en temps réel (NAS)
tail -f logs/app-*.log

# Vérifier les erreurs
npm run lint

# Compiler pour production
npm run build
```

---

## ❓ Questions fréquentes

### Puis-je modifier un état finalisé ?
❌ Non. Créez un nouvel état pour corriger.

### Comment récupérer un mot de passe oublié ?
Via la page `/reset-password` (fonctionnalité à implémenter).

### Combien d'utilisateurs puis-je créer ?
✅ Illimité.

### L'application fonctionne-t-elle hors ligne ?
⚠️ Partiellement (rapports de visite uniquement).

### Mes données sont-elles sécurisées ?
✅ Oui, auto-hébergement = vos données restent chez vous.

---

## 📚 Pour aller plus loin

| Guide | Quand le consulter |
|-------|-------------------|
| **[GUIDE_UTILISATEUR.md](./GUIDE_UTILISATEUR.md)** | Apprendre toutes les fonctionnalités en détail |
| **[INSTALLATION.md](./INSTALLATION.md)** | Installation sur NAS ou serveur distant |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Développeurs : comprendre le code |
| **[README_DEMARRAGE_AUTO_NAS.md](./README_DEMARRAGE_AUTO_NAS.md)** | Démarrage automatique sur NAS |

---

## ✅ Checklist de démarrage

- [ ] Application installée et démarrée
- [ ] Compte admin créé
- [ ] Informations entreprise remplies
- [ ] Logo uploadé
- [ ] Premier utilisateur créé
- [ ] Premier client créé
- [ ] Premier chantier créé
- [ ] Première commande créée et verrouillée
- [ ] Premier état d'avancement créé
- [ ] Email de test envoyé
- [ ] Sous-traitant ajouté
- [ ] Ticket SAV testé
- [ ] Machine outillage ajoutée
- [ ] Bon de régie créé

🎉 **Félicitations ! Vous maîtrisez les bases d'OpenBTP !**

---

**Besoin d'aide ?** → Consultez [GUIDE_UTILISATEUR.md](./GUIDE_UTILISATEUR.md) ou créez une issue sur GitHub.

---

**Version** : 0.1.0  
**Dernière mise à jour** : Octobre 2025

