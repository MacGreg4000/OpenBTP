# Contrat-cadre de sous-traitance — v2 (Checkinatwork / LIMOSA)

Suite à l'avertissement de l'Inspection du travail (CLS Liège, réf. LA20260198041,
23/09/2026).

**Principe :** les clauses sont intégrées au contrat-cadre, et **tous les
sous-traitants re-signent un contrat v2 complet** — un seul texte en vigueur
pour tout le monde, pas d'avenant.

## Mise en place (aucun déploiement nécessaire pour les clauses)

Le texte du contrat vit en base, pas dans le code. Pour passer en v2 :

1. **Administration → Templates de contrats** : dupliquer le template actif
   (copier son HTML dans un nouveau template).
2. Le nommer par exemple **`Contrat-cadre 2026-10 v2`** — ce nom est enregistré
   sur chaque contrat généré (`contrat.templateVersion`) et sert de numéro de
   version.
3. Y intégrer les blocs ci-dessous, puis **activer** ce template.

### Faire re-signer tout le monde

Une fois le template v2 activé, pour chaque sous-traitant actif :

1. Compléter sa fiche (**représentant légal** : prénom, nom, fonction, email,
   GSM) — sans cela, aucun contrat ne peut être généré.
2. Tableau des sous-traitants → icône **Historique des contrats** →
   **Renouveler** : un contrat v2 est généré et envoyé au représentant pour
   signature électronique.

Le nouveau contrat signé devient le contrat affiché ; les anciens restent
consultables dans l'historique.

Les contrats déjà générés ou signés ne changent pas : un contrat est toujours
signé avec le template qui a servi à le générer, même si un autre a été activé
entre-temps. Un contrat v1 non signé n'est plus renvoyé tel quel : l'envoi en
génère un nouveau avec le template actif.

## ⚠️ À ne pas modifier dans le template

L'insertion de la signature du sous-traitant repère le texte d'attente exact :

```html
Signature électronique via la plateforme
```

Il doit rester présent **dans chaque cadre de signature du sous-traitant**
(contrat et annexe), et nulle part ailleurs. S'il est absent ou modifié, la
signature échoue avec un message explicite plutôt que de produire un contrat
sans signature visible. Le titre et la mise en forme du cadre sont libres.

## Nouvelles variables disponibles

| Variable | Contenu |
|---|---|
| `{{representantSousTraitant}}` | Prénom + nom du représentant (plus jamais « Représentant ») |
| `{{fonctionRepresentantSousTraitant}}` | Fonction (ex. Gérant) |
| `{{emailRepresentantSousTraitant}}` | Email des rappels quotidiens |
| `{{gsmRepresentantSousTraitant}}` | GSM au format international (+351 912 345 678) |
| `{{versionContrat}}` | Nom du template (à mettre en pied de page) |
| `{{referenceContrat}}` | Référence CT-… — désormais identique sur le PDF envoyé et le PDF signé |

La génération et l'envoi sont **bloqués** tant que le représentant n'est pas
complet (nom, prénom, fonction, email, GSM) ou qu'aucune signature d'entreprise
n'est configurée.

## Bloc « SOUS-TRAITANT » — à compléter

```html
<strong>Représenté par :</strong> {{representantSousTraitant}}, {{fonctionRepresentantSousTraitant}}<br>
<strong>Email :</strong> {{emailRepresentantSousTraitant}}<br>
<strong>GSM :</strong> {{gsmRepresentantSousTraitant}}<br>
```

## Pied de page

```html
Contrat-cadre {{referenceContrat}} — version {{versionContrat}}
```

## Clauses

**Art. 8 — ajouter à la fin du premier alinéa :**

```html
<p>Pour l'application du présent article, les termes « personnel », « travailleurs » ou « personnes » visent toute personne physique que le sous-traitant fait intervenir sur le chantier, quel que soit son statut (salarié, associé, gérant, indépendant, intérimaire ou personne mise à disposition), ainsi que le sous-traitant lui-même lorsqu'il s'agit d'une personne physique.</p>
```

**Art. 8.5 — remplacer le premier tiret par :**

```html
<li>la déclaration LIMOSA, <strong>préalablement</strong> au début de l'occupation, pour lui-même et pour toute personne qu'il fait intervenir sur le chantier, ainsi que la détention sur le chantier des accusés de réception L-1 et leur présentation à première demande de l'entrepreneur principal ou de tout service d'inspection ;</li>
```

**Art. 8.6 — remplacer par :**

```html
<p><strong>8.6.1.</strong> Si les travaux sont soumis à l'enregistrement des présences (Section 4, Chapitre V de la loi du 4 août 1996), le sous-traitant veille à ce que chaque personne soit enregistrée <strong>avant</strong> de pénétrer, pour son compte, sur le chantier et, lorsque la réglementation l'impose, à ce qu'elle enregistre personnellement son arrivée et son départ (check-in / check-out). Il veille à ce que les données relatives à son entreprise soient correctement transmises à la base de données de l'ONSS.</p>
<p><strong>8.6.2. Rappels.</strong> Le sous-traitant accepte de recevoir, à l'adresse email et, le cas échéant, au numéro de GSM de son représentant mentionnés au présent contrat, des messages de service quotidiens de l'entrepreneur principal rappelant l'obligation d'enregistrement et communiquant les références d'enregistrement (numéro de déclaration Checkinatwork) et adresses des chantiers concernés. Il s'engage à relayer ces informations à toute personne qu'il fait intervenir et à signaler sans délai tout changement d'adresse email ou de numéro. Un rappel envoyé à l'adresse email mentionnée au présent contrat (ou à toute adresse communiquée ultérieurement par écrit) est réputé reçu par le sous-traitant. Ces rappels ne dispensent en rien le sous-traitant de ses obligations.</p>
<p><strong>8.6.3. Exclusion immédiate.</strong> Par dérogation aux articles 7.3 et 13.1, l'entrepreneur principal peut, sans mise en demeure préalable, refuser l'accès au chantier ou faire quitter immédiatement le chantier à toute personne non enregistrée ou ne pouvant présenter son L-1, jusqu'à régularisation, sans indemnité ni prolongation de délai au profit du sous-traitant.</p>
<p><strong>8.6.4.</strong> Le sous-traitant autorisé à faire appel à un tiers lui impose les obligations du présent article, à tous les échelons de la sous-traitance.</p>
```

*(Supprimer la référence à la loi du 8 décembre 1992, abrogée — voir 8.9.)*

**Art. 8.7 — fin du dernier alinéa, remplacer par :**

```html
…y compris toutes les sanctions financières liées à l'occupation de ressortissants en séjour illégal, ainsi que <strong>toutes amendes administratives ou pénales, sommes, frais de défense et pertes</strong> réclamés à l'entrepreneur principal ou supportés par lui en raison d'un manquement du sous-traitant aux articles 8.5 et 8.6, ou en application notamment des articles 30bis de la loi du 27 juin 1969, 402 CIR 1992 et/ou 35/2 de la loi du 12 avril 1965.
```

**Nouvel art. 8.8 — Pénalité forfaitaire** *(montant à écrire directement dans le template — c'est le seul blanc du texte)* :

```html
<p><strong>8.8.</strong> Sans préjudice de l'article 8.7, toute personne constatée sur chantier en infraction aux articles 8.5 ou 8.6 donne lieu, de plein droit et sans mise en demeure, à une pénalité forfaitaire de <strong>… €</strong> par personne et par jour, compensable avec toute somme due au sous-traitant.</p>
```

**Nouvel art. 8.9 — Données personnelles :**

```html
<p><strong>8.9.</strong> Les données à caractère personnel échangées dans le cadre du présent contrat sont traitées conformément au Règlement (UE) 2016/679 (RGPD), aux seules fins de l'exécution du contrat et du respect des obligations légales, notamment en matière d'enregistrement des présences, de détachement et de sécurité sur chantier.</p>
```

**Nouvel art. 8.10 — Évolution réglementaire :**

```html
<p><strong>8.10.</strong> Les parties prennent acte de l'évolution annoncée de l'enregistrement des présences vers un enregistrement personnel et en temps réel de l'arrivée et du départ (« Check In and Out at Work »). Dès son entrée en vigueur, le sous-traitant s'y conforme sans qu'un avenant soit nécessaire ; l'article 8.6 s'applique mutatis mutandis au check-out.</p>
```
