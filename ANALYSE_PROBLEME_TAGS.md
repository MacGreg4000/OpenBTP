# Analyse du problème : Tags "Rapport" sur photos mobiles

## Problème identifié
Les photos uploadées depuis la version mobile (`/mobile/photos`) ont le tag "Rapport" au lieu de "Interne" dans la version Desktop.

## Analyse Frontend (Mobile)

### Fichier : `src/app/mobile/photos/page.tsx`
- **Ligne 89** : `formData.append('tagsJsonString', JSON.stringify(['Interne']))` ✅ CORRECT
- **Ligne 90** : `formData.append('metadata', JSON.stringify({ source: 'photo-interne' }))` ✅ CORRECT
- **Ligne 93** : Upload vers `/api/chantiers/${chantierId}/documents` ✅ CORRECT

**Conclusion Frontend** : Le frontend envoie bien les bonnes données.

## Analyse Backend (API)

### Fichier : `src/app/api/chantiers/[chantierId]/documents/route.ts`

#### 1. Parsing des tags (lignes 158-171)
```typescript
const tagsJsonString = formData.get('tagsJsonString') as string | null;
let tagsToConnect: { nom: string }[] = [];
if (tagsJsonString) {
  try {
    const tagNames = JSON.parse(tagsJsonString) as string[];
    if (Array.isArray(tagNames) && tagNames.length > 0) {
      tagsToConnect = tagNames.map(nom => ({ nom }));
    }
  } catch (e) {
    console.error("Erreur lors du parsing du JSON des tags:", e);
  }
}
```
✅ **CORRECT** : Parse `['Interne']` en `[{ nom: 'Interne' }]`

#### 2. Traitement des métadonnées (lignes 190-216)
```typescript
if (documentType === 'photo-chantier') {
  const metadataStr = formData.get('metadata') as string;
  if (metadataStr) {
    try {
      metadata = JSON.parse(metadataStr) as JsonValue;
      const metadataObj = metadata as { source?: string };
      console.log('🔍 POST documents - metadata.source:', metadataObj?.source);
      
      if (metadataObj?.source === 'photo-interne') {
        console.log('✅ POST documents - Photo interne détectée, forçage du tag "Interne"');
        tagsToConnect = tagsToConnect.filter(tag => tag.nom.toLowerCase() !== 'rapport');
        const hasInterne = tagsToConnect.some(tag => tag.nom.toLowerCase() === 'interne');
        if (!hasInterne) {
          tagsToConnect.push({ nom: 'Interne' });
        }
      }
    } catch (e) {
      console.error('Erreur lors du parsing des métadonnées:', e);
    }
  }
}
```
✅ **CORRECT** : Devrait filtrer "Rapport" et ajouter "Interne"

#### 3. Création du document avec tags (lignes 280-287)
```typescript
...(tagsToConnect.length > 0 && { 
  tags: { 
    connectOrCreate: tagsToConnect.map(tagObj => ({
      where: { nom: tagObj.nom },
      create: { nom: tagObj.nom },
    }))
  } 
}),
```
✅ **CORRECT** : Syntaxe Prisma valide pour `connectOrCreate` avec tableau

#### 4. ⚠️ PROBLÈME IDENTIFIÉ - Vérification finale (lignes 324-335)
```typescript
await prisma.document.update({
  where: { id: document.id },
  data: {
    tags: {
      set: [],
      connectOrCreate: {
        where: { nom: 'Interne' },
        create: { nom: 'Interne' }
      }
    }
  }
});
```

**🚨 ERREUR CRITIQUE** : 
- `connectOrCreate` doit être un **TABLEAU**, pas un objet unique
- On ne peut pas utiliser `set: []` et `connectOrCreate` en même temps dans Prisma
- La syntaxe correcte serait :
  ```typescript
  tags: {
    set: [],
    connectOrCreate: [
      {
        where: { nom: 'Interne' },
        create: { nom: 'Interne' }
      }
    ]
  }
  ```
  OU
  ```typescript
  tags: {
    set: [
      {
        connectOrCreate: {
          where: { nom: 'Interne' },
          create: { nom: 'Interne' }
        }
      }
    ]
  }
  ```
  Mais en fait, pour une relation many-to-many, la syntaxe correcte est :
  ```typescript
  tags: {
    set: [
      {
        nom: 'Interne'
      }
    ]
  }
  ```
  OU mieux, utiliser `connect` si le tag existe déjà :
  ```typescript
  // D'abord créer/obtenir le tag
  const tagInterne = await prisma.tag.upsert({
    where: { nom: 'Interne' },
    create: { nom: 'Interne' },
    update: {}
  });
  
  // Puis connecter
  tags: {
    set: [{ nom: 'Interne' }]
  }
  ```

## Problèmes potentiels supplémentaires

### 1. Ordre d'exécution
La vérification finale (lignes 304-357) se fait APRÈS la création du document. Si les tags ont déjà été créés incorrectement, cette vérification devrait les corriger, mais elle échoue à cause de la syntaxe Prisma incorrecte.

### 2. Vérification de la base de données
Il est possible que :
- Des triggers/valeurs par défaut ajoutent le tag "Rapport"
- Des contraintes de base de données créent des tags automatiquement
- Des données existantes aient déjà le tag "Rapport" attaché

### 3. Conflit avec d'autres routes
- `/api/rapports/upload-photo` crée des documents avec `source: 'rapport-visite'` mais SANS tags explicites
- Il pourrait y avoir une logique ailleurs qui ajoute des tags par défaut

## Solutions recommandées

1. **Corriger la syntaxe Prisma ligne 329** : Utiliser la bonne syntaxe pour `set` et `connectOrCreate`
2. **Vérifier les logs serveur** : Voir si les logs `🔍 POST documents - metadata.source:` et `✅ POST documents - Photo interne détectée` apparaissent
3. **Vérifier les données en base** : Vérifier si les documents ont bien `metadata.source = 'photo-interne'`
4. **Ajouter des logs supplémentaires** : Logger `tagsToConnect` juste avant la création du document

## Actions à prendre

1. Vérifier les logs serveur lors d'un upload
2. Vérifier la base de données pour voir les tags réels
3. Corriger la syntaxe Prisma ligne 329
4. Tester l'upload d'une photo mobile et vérifier les tags créés

