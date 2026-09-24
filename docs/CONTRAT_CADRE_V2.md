# Contrat-cadre de sous-traitance — v2 (Checkinatwork / LIMOSA)

Suite à l'avertissement de l'Inspection du travail (CLS Liège, réf. LA20260198041,
23/09/2026).

> ✅ **Clauses 8 à 8.10 validées par le conseil juridique de Secotech le
> 24/09/2026.** Elles peuvent être intégrées au template et activées.
>
> Le cadre de l'avenant n°1 (préambule, prise d'effet, dispositions finales —
> section en fin de document) a été rédigé ensuite pour reprendre ces clauses
> telles quelles : à lui soumettre pour un dernier regard avant envoi.

**Deux documents :**

1. **Le contrat-cadre v2** — pour tout nouveau sous-traitant et tout
   renouvellement (sections ci-dessous).
2. **L'avenant n°1** — pour les sous-traitants déjà sous contrat v1, afin que
   les nouvelles obligations s'appliquent sans attendre l'échéance de leur
   contrat. Premier destinataire : M V DIAS UNIPESSOAL LDA
   (contrat CT-1780732286260).

## Mise en place (aucun déploiement nécessaire pour les clauses)

Le texte du contrat vit en base, pas dans le code. Pour passer en v2 :

1. **Administration → Templates de contrats** : dupliquer le template actif
   (copier son HTML dans un nouveau template).
2. Le nommer par exemple **`Contrat-cadre 2026-10 v2`** — ce nom est enregistré
   sur chaque contrat généré (`contrat.templateVersion`) et sert de numéro de
   version.
3. Y intégrer les blocs ci-dessous, puis **activer** ce template.

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

**Nouvel art. 8.8 — Pénalité forfaitaire** *(montant à écrire directement dans le template — c'est le seul blanc du texte validé)* :

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

---

# Avenant n°1 au contrat-cadre de sous-traitance

Pour les sous-traitants dont le contrat-cadre v1 est déjà signé. Il intègre les
clauses validées ci-dessus **sans les modifier** ; seuls le préambule et les
dispositions finales sont propres à l'avenant.

À compléter pour chaque sous-traitant : les zones `[…]`. Même montant de
pénalité (art. 8.8) que dans le contrat-cadre v2.

```html
<h1>AVENANT N°1 AU CONTRAT-CADRE DE SOUS-TRAITANCE [RÉFÉRENCE DU CONTRAT, ex. CT-1780732286260]</h1>

<p><strong>ENTRE :</strong><br>
Secotech SRL, Rue Frumhy 20, 4671 Barchon, BCE BE 0537.822.042, représentée par Grégory Maccio, gérant,<br>
ci-après dénommée « l'entrepreneur principal »,</p>

<p><strong>ET :</strong><br>
[DÉNOMINATION DU SOUS-TRAITANT], [ADRESSE], n° d'entreprise [NUMÉRO],<br>
représentée par [PRÉNOM NOM], [FONCTION],<br>
email : [EMAIL DU REPRÉSENTANT] — GSM : [GSM DU REPRÉSENTANT],<br>
ci-après dénommée « le sous-traitant ».</p>

<h2>PRÉAMBULE</h2>
<p>Les parties sont liées par le contrat-cadre de sous-traitance [RÉFÉRENCE] signé le [DATE DE SIGNATURE] (ci-après « le contrat-cadre »).</p>
<p>Afin de renforcer le respect des obligations en matière d'enregistrement des présences sur chantier (Checkinatwork) et de déclaration LIMOSA, les parties conviennent de compléter et de modifier l'article 8 du contrat-cadre comme suit.</p>

<h2>ARTICLE 1 — MODIFICATIONS DE L'ARTICLE 8 DU CONTRAT-CADRE</h2>

<p><strong>1.1.</strong> Le premier alinéa de l'article 8 est complété comme suit :</p>
<p>« Pour l'application du présent article, les termes « personnel », « travailleurs » ou « personnes » visent toute personne physique que le sous-traitant fait intervenir sur le chantier, quel que soit son statut (salarié, associé, gérant, indépendant, intérimaire ou personne mise à disposition), ainsi que le sous-traitant lui-même lorsqu'il s'agit d'une personne physique. »</p>

<p><strong>1.2.</strong> Le premier tiret de l'article 8.5 est remplacé par :</p>
<p>« – la déclaration LIMOSA, préalablement au début de l'occupation, pour lui-même et pour toute personne qu'il fait intervenir sur le chantier, ainsi que la détention sur le chantier des accusés de réception L-1 et leur présentation à première demande de l'entrepreneur principal ou de tout service d'inspection ; »</p>

<p><strong>1.3.</strong> L'article 8.6 est remplacé par :</p>
<p>« 8.6.1. Si les travaux sont soumis à l'enregistrement des présences (Section 4, Chapitre V de la loi du 4 août 1996), le sous-traitant veille à ce que chaque personne soit enregistrée avant de pénétrer, pour son compte, sur le chantier et, lorsque la réglementation l'impose, à ce qu'elle enregistre personnellement son arrivée et son départ (check-in / check-out). Il veille à ce que les données relatives à son entreprise soient correctement transmises à la base de données de l'ONSS.</p>
<p>8.6.2. Rappels. Le sous-traitant accepte de recevoir, à l'adresse email et, le cas échéant, au numéro de GSM de son représentant mentionnés au présent contrat, des messages de service quotidiens de l'entrepreneur principal rappelant l'obligation d'enregistrement et communiquant les références d'enregistrement (numéro de déclaration Checkinatwork) et adresses des chantiers concernés. Il s'engage à relayer ces informations à toute personne qu'il fait intervenir et à signaler sans délai tout changement d'adresse email ou de numéro. Un rappel envoyé à l'adresse email mentionnée au présent contrat (ou à toute adresse communiquée ultérieurement par écrit) est réputé reçu par le sous-traitant. Ces rappels ne dispensent en rien le sous-traitant de ses obligations.</p>
<p>8.6.3. Exclusion immédiate. Par dérogation aux articles 7.3 et 13.1, l'entrepreneur principal peut, sans mise en demeure préalable, refuser l'accès au chantier ou faire quitter immédiatement le chantier à toute personne non enregistrée ou ne pouvant présenter son L-1, jusqu'à régularisation, sans indemnité ni prolongation de délai au profit du sous-traitant.</p>
<p>8.6.4. Le sous-traitant autorisé à faire appel à un tiers lui impose les obligations du présent article, à tous les échelons de la sous-traitance. »</p>
<p>Pour l'application de l'article 8.6.2, « le présent contrat » s'entend du contrat-cadre tel que modifié par le présent avenant, et les coordonnées du représentant sont celles mentionnées en tête du présent avenant.</p>

<p><strong>1.4.</strong> La fin du dernier alinéa de l'article 8.7 est remplacée par :</p>
<p>« …y compris toutes les sanctions financières liées à l'occupation de ressortissants en séjour illégal, ainsi que toutes amendes administratives ou pénales, sommes, frais de défense et pertes réclamés à l'entrepreneur principal ou supportés par lui en raison d'un manquement du sous-traitant aux articles 8.5 et 8.6, ou en application notamment des articles 30bis de la loi du 27 juin 1969, 402 CIR 1992 et/ou 35/2 de la loi du 12 avril 1965. »</p>

<p><strong>1.5.</strong> Il est inséré un article 8.8 rédigé comme suit :</p>
<p>« 8.8. Sans préjudice de l'article 8.7, toute personne constatée sur chantier en infraction aux articles 8.5 ou 8.6 donne lieu, de plein droit et sans mise en demeure, à une pénalité forfaitaire de [MONTANT] € par personne et par jour, compensable avec toute somme due au sous-traitant. »</p>

<p><strong>1.6.</strong> Il est inséré un article 8.9 rédigé comme suit :</p>
<p>« 8.9. Les données à caractère personnel échangées dans le cadre du présent contrat sont traitées conformément au Règlement (UE) 2016/679 (RGPD), aux seules fins de l'exécution du contrat et du respect des obligations légales, notamment en matière d'enregistrement des présences, de détachement et de sécurité sur chantier. »</p>

<p><strong>1.7.</strong> Il est inséré un article 8.10 rédigé comme suit :</p>
<p>« 8.10. Les parties prennent acte de l'évolution annoncée de l'enregistrement des présences vers un enregistrement personnel et en temps réel de l'arrivée et du départ (« Check In and Out at Work »). Dès son entrée en vigueur, le sous-traitant s'y conforme sans qu'un avenant soit nécessaire ; l'article 8.6 s'applique mutatis mutandis au check-out. »</p>

<p><strong>1.8.</strong> Toute référence à la loi du 8 décembre 1992 relative à la protection de la vie privée figurant dans le contrat-cadre est supprimée et remplacée par une référence à l'article 8.9.</p>

<h2>ARTICLE 2 — PRISE D'EFFET</h2>
<p>Le présent avenant prend effet à la date de sa signature par les deux parties et s'applique à toutes les prestations exécutées à partir de cette date, y compris dans le cadre des conventions de sous-traitance particulières en cours.</p>

<h2>ARTICLE 3 — DISPOSITIONS FINALES</h2>
<p>Toutes les autres dispositions du contrat-cadre demeurent inchangées et restent pleinement applicables. En cas de contradiction, le présent avenant prévaut. Il fait partie intégrante du contrat-cadre et en suit la durée.</p>

<p>Fait en deux exemplaires, chaque partie reconnaissant avoir reçu le sien, le [DATE].</p>

<div class="signature-boxes">
  <div class="signature-box">
    <div class="signature-title">L'Entrepreneur principal</div>
    <div class="signature-name">Grégory Maccio, gérant — Secotech SRL</div>
    <div class="signature-line"></div>
  </div>
  <div class="signature-box">
    <div class="signature-title">Le Sous-traitant</div>
    <div class="signature-name">[PRÉNOM NOM], [FONCTION] — [DÉNOMINATION]</div>
    <div class="signature-line"></div>
    <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">
      Signature électronique via la plateforme
    </div>
  </div>
</div>
```

### Envoi de l'avenant — en attendant une génération dans l'application

OpenBTP ne sait pas encore générer ni faire signer un avenant (un contrat y est
toujours un contrat-cadre complet). Deux possibilités :

- **Tout de suite** : compléter ce texte, le faire signer en PDF (signature
  manuscrite ou électronique qualifiée) et l'archiver dans les documents du
  sous-traitant.
- **Dans OpenBTP** (étape suivante du plan) : ajouter l'avenant comme second
  type de document signable, avec le même circuit de signature et d'audit que
  le contrat-cadre.

À noter pour M V DIAS : son contrat v1 a été signé avant le correctif du
24/09 et ne porte probablement pas la signature de Secotech. L'avenant, signé
par les deux parties, règle aussi ce point pour l'avenir ; si une preuve
complète du contrat d'origine est nécessaire, le faire re-signer.
