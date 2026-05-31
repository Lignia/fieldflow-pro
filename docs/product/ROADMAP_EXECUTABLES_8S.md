# LIGNIA — Feuille de route exécutable 8 semaines

> Auteur : Claude Analytics — rôle CPO + Architecte métier + Architecte logiciel  
> Date : mai 2026  
> Horizon : 5 pilotes puis 50 clients  
> Contrainte : 400–600 heures, budget limité, solo founder

---

## PARTIE 1 — Les 5 sujets les plus dangereux

### D1 — `appliance_id` non persisté en base
**Pourquoi dangereux :** C'est la rupture de chaîne la plus silencieuse. L'artisan ajoute un poêle MCZ dans son devis. Il le voit à l'écran. Il sauvegarde. Le lien disparaît. Quand le Parc installé arrivera, aucun devis signé ne pourra alimenter automatiquement une installation. Tout l'historique commercial pre-V2 sera inexploitable. Chaque jour sans ce fix est un jour de données perdues définitivement.

**Risque si ignoré jusqu'aux pilotes :** Les 5 premiers devis signés avec appareils n'auront pas de `appliance_id` en base. Migration des données après coup = impossible à reconstruire rétroactivement.

### D2 — Ligne appareil envoyable à 0 €
**Pourquoi dangereux :** Risque business direct. Un devis envoyé à un client avec un poêle à 0 € crée soit un litige commercial (le client réclame le prix affiché) soit une perte de crédibilité. C'est le seul bug qui peut tuer la relation avec un pilote dès la première semaine.

### D3 — Rupture Devis → Installation (aucun lien en base)
**Pourquoi dangereux :** `core.installations` n'a ni `quote_id` ni `quote_line_id`. Quand le Parc installé sera développé, l'alimentation depuis le devis devra être construite manuellement rétroactivement. Plus il y a de devis signés sans ce pont, plus la migration sera coûteuse.

### D4 — `core.installations` sans lien vers `heating_appliances`
**Pourquoi dangereux :** Tout le SAV intelligent repose sur la connaissance de l'appareil installé — diamètre conduit pour le ramonage, garantie constructeur pour facturer ou non, éligibilité Flamme Verte pour les contrats entretien. Sans ce lien, le SAV sera toujours du SAV "aveugle" qui dépend de la mémoire de l'artisan.

### D5 — UX : barre d'action et prix 0 € non bloquant
**Pourquoi dangereux :** Les pilotes formeront leur modèle mental dans les 3 premières sessions. Si l'UX est confuse dès le départ, les feedbacks pilotes porteront sur l'UX plutôt que sur la valeur métier. Un pilote perdu sur "comment ajouter un appareil" ne teste pas le produit — il teste sa propre patience.

---

## PARTIE 2 — Les 5 sujets les plus rentables

### R1 — Fix `appliance_id` dans `replace_quote_lines`
**ROI :** Débloque toute la chaîne Cycle 1 → Cycle 2 → Cycle 3. Effort : 2h Claude Exec (SQL + RPC) + 1h Lovable (payload frontend). Impact : permanent sur toute la base de données future.

### R2 — Bloc client visible en tête du devis
**ROI :** Un artisan qui voit le nom de son client pendant la saisie fait moins d'erreurs, travaille plus vite, et perçoit le produit comme professionnel. Impact immédiat sur la satisfaction pilote. Effort : 30 min Lovable.

### R3 — Garde prix 0 € pour les appareils
**ROI :** Élimine le seul scénario qui peut créer un litige commercial avant même que les pilotes aient signé leur premier vrai devis. Effort : 15 min Lovable.

### R4 — Colonne `heating_appliance_id` dans `core.installations`
**ROI :** Pose le fondement du Parc installé intelligent. Effort : 30 min Claude Exec (migration SQL). Ne nécessite aucun changement frontend. Activable immédiatement.

### R5 — `appliance_snapshot` dans `replace_quote_lines`
**ROI :** Même si le lien `appliance_id` vers la base ADEME évolue, le snapshot JSONB garantit que les données techniques de l'appareil au moment du devis sont toujours accessibles. Filet de sécurité permanent. Effort : 1h Claude Exec.

---

## PARTIE 3 — Plan semaine par semaine

### SEMAINE 1 — Fondations données (non négociable)

**Objectif :** Corriger les P0 avant que le premier vrai devis terrain soit sauvegardé.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Fix SQL : ajouter `appliance_id` dans INSERT de `replace_quote_lines` | Claude Exec | 1h | Patch RPC uniquement |
| Fix frontend : ajouter `appliance_id` + `appliance_snapshot` dans payload `handleSave` | Lovable | 1h | 3 champs dans le map `p_lines` |
| Migration SQL : colonne `heating_appliance_id` dans `core.installations` | Claude Exec | 30min | ALTER TABLE + FK nullable |
| Garde Lovable : bloquer envoi si ligne appareil à prix 0 | Lovable | 30min | Condition dans `handleSave(true)` |
| Test terrain : créer 1 devis avec un appareil, sauvegarder, recharger, vérifier `appliance_id` en base | Fondateur | 30min | Vérification manuelle |

**Critère de sortie S1 :** `SELECT appliance_id FROM billing.quote_lines WHERE appliance_id IS NOT NULL` retourne des résultats après sauvegarde.

---

### SEMAINE 2 — UX devis pilote-ready

**Objectif :** L'artisan pilote peut créer un devis complet en moins de 10 minutes sans hésitation.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Bloc client visible en haut du devis (nom + numéro projet) | Lovable | 30min | Lecture depuis `projectInfo.customer_name` |
| Header colonnes sticky | Lovable | 1h | Position sticky sur la grille |
| Barre d'action toujours visible (déjà patchée — vérifier) | Fondateur | 15min | Vérification visuelle |
| Placeholder contextuel : "Tapez le prix de vente" sur ligne appareil vide | Lovable | 20min | Condition sur `appliance_id` |
| Toast persistant sur ligne appareil à 0 € (pas éphémère) | Lovable | 20min | Remplacement toast par badge inline |

**Critère de sortie S2 :** Démonstration sans explication préalable à 1 artisan externe. Il doit pouvoir créer un devis complet seul.

---

### SEMAINE 3 — 5 vrais devis terrain

**Objectif :** Créer les 5 premiers devis avec de vrais chantiers, vrais prix, vrais appareils.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Créer 5 devis sur des projets réels | Fondateur | 3h | Poêles granulés + fumisterie + pose |
| Vérifier `appliance_id` persisté pour chaque devis | Fondateur | 30min | Query Supabase |
| Documenter les frictions rencontrées | Fondateur | 1h | Liste brute, sans filtre |
| Identifier les 3 frictions les plus fréquentes | Fondateur | 30min | Priorisation terrain |

**Critère de sortie S3 :** 5 devis sauvegardés avec `appliance_id` non null. Liste de frictions terrain documentée.

---

### SEMAINE 4 — Corrections terrain + Commande fournisseur V1

**Objectif :** Corriger les frictions S3 + poser la fondation commande.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Corriger les 3 frictions terrain identifiées en S3 | Lovable | 2h | Patches UX ciblés uniquement |
| Schéma `billing.purchase_orders` + `billing.purchase_order_lines` | Claude Exec | 2h | Tables déjà présentes — vérifier et compléter |
| Vue "Liste des articles à commander" depuis un devis signé | Lovable | 2h | Agrégation par fournisseur |
| Remise Poujoulat 40% — vérifier que le SQL est bien appliqué | Claude Exec | 15min | Vérification `tenant_supplier_discounts` |

**Critère de sortie S4 :** Un devis signé permet d'exporter une liste d'articles fournisseur groupée par Poujoulat / Joncoux.

---

### SEMAINE 5 — Parc installé V1

**Objectif :** À la clôture d'un chantier, créer l'installation depuis le devis signé.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Bouton "Clôturer le chantier" sur la fiche Projet | Lovable | 2h | Déclenche création `core.installations` |
| Pré-remplissage depuis la ligne devis appareil | Lovable | 2h | `brand`, `model`, `heating_appliance_id`, `catalog_item_id` |
| Saisie manuelle : `serial_number`, `commissioning_date` | Lovable | 1h | Champs requis à la clôture |
| Vue Parc installé par client | Lovable | 2h | Liste des installations avec statut |

**Critère de sortie S5 :** Un devis signé avec un appareil peut générer une installation pré-remplie en 2 clics.

---

### SEMAINE 6 — Onboarding pilote 1

**Objectif :** Accueillir le premier pilote et valider le workflow complet en conditions réelles.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Session onboarding pilote 1 (2h) | Fondateur | 2h | Présentation + premier devis en live |
| Corrections immédiates post-session | Lovable | 2h | Frictions bloquantes uniquement |
| Entretien retour 48h après | Fondateur | 1h | Feedback structuré |
| Documentation des workflows validés | Fondateur | 1h | Base pour l'onboarding des pilotes 2-5 |

**Critère de sortie S6 :** Le pilote 1 a créé son premier devis seul sans assistance.

---

### SEMAINE 7 — Pilotes 2 et 3 + SAV fondation

**Objectif :** Passer à 3 pilotes actifs + poser la fondation SAV.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Onboarding pilotes 2 et 3 | Fondateur | 4h | Sessions individuelles |
| `operations.service_requests` : formulaire création SAV depuis installation | Lovable | 3h | Lien installation → demande SAV |
| Vue "SAV en cours" par technicien | Lovable | 2h | Liste demandes + statut |

**Critère de sortie S7 :** 3 pilotes actifs. Une demande SAV peut être créée depuis une fiche installation.

---

### SEMAINE 8 — Consolidation + pilotes 4 et 5

**Objectif :** 5 pilotes actifs. Bilan. Décision sur la roadmap post-pilote.

| Tâche | Qui | Durée | Détail |
|---|---|---|---|
| Onboarding pilotes 4 et 5 | Fondateur | 4h | |
| Bilan des 5 pilotes : frictions, usages, manques | Fondateur | 2h | |
| Décision roadmap S9-S16 basée sur terrain | Fondateur | 2h | Priorisation data-driven |
| Remise Joncoux (si contrat signé) | Claude Exec | 30min | SQL `tenant_supplier_discounts` |

**Critère de sortie S8 :** 5 pilotes actifs avec au moins 1 devis signé chacun. Roadmap post-pilote arbitrée.

---

## PARTIE 4 — Prompts à envoyer

### Prompts Claude Exec

**CE-01 — Fix `replace_quote_lines` (S1, P0)**
```
Mission : patch SQL uniquement. Aucune modification frontend. Aucun commit Lovable.

Ajouter `appliance_id` et `appliance_snapshot` dans la RPC billing.replace_quote_lines.

Modifications requises :
1. Dans la liste des colonnes de l'INSERT, ajouter : appliance_id, appliance_snapshot
2. Dans les VALUES, ajouter :
   - CASE WHEN (v_line->>'appliance_id') IS NOT NULL THEN (v_line->>'appliance_id')::uuid ELSE NULL END
   - CASE WHEN (v_line->>'appliance_snapshot') IS NOT NULL THEN (v_line->>'appliance_snapshot')::jsonb ELSE NULL END

Contraintes :
- Ne pas modifier le reste de la RPC
- Ne pas modifier replace_quote_lines dans son comportement existant
- Utiliser apply_migration pour le patch
- Vérifier que la colonne appliance_id existe dans billing.quote_lines avant de patcher
```

**CE-02 — Migration `installations.heating_appliance_id` (S1, P0)**
```
Mission : migration SQL uniquement. Aucun commit frontend.

Ajouter une colonne heating_appliance_id dans core.installations avec FK vers catalog.heating_appliances.

SQL attendu :
ALTER TABLE core.installations
  ADD COLUMN IF NOT EXISTS heating_appliance_id uuid
  REFERENCES catalog.heating_appliances(id) ON DELETE SET NULL;

Utiliser apply_migration. Nommer la migration : add_heating_appliance_id_to_installations
```

**CE-03 — Vérification remise Poujoulat (S4)**
```
Mission : vérification uniquement. Aucune modification si déjà en place.

Vérifier que la remise Poujoulat 40% est active pour le tenant Ambiance Chaleur :
SELECT * FROM catalog.tenant_supplier_discounts
WHERE supplier_name = 'Poujoulat'
AND tenant_id = 'dbd5a19f-9d11-4ba8-93f7-046b642192ed';

Si absent, insérer :
INSERT INTO catalog.tenant_supplier_discounts (tenant_id, supplier_name, discount_pct, is_active)
VALUES ('dbd5a19f-9d11-4ba8-93f7-046b642192ed', 'Poujoulat', 40, true)
ON CONFLICT (tenant_id, supplier_name) DO UPDATE SET discount_pct = 40, is_active = true;
```

---

### Prompts Lovable

**LV-01 — Fix payload appliance (S1, P0)**
```
Dans QuoteEditor.tsx, dans la fonction handleSave, dans le map qui construit p_lines,
ajouter les deux champs manquants pour les lignes appareils :

appliance_id: li?.appliance_id ?? null,
appliance_snapshot: li?.appliance_id ? {
  id: li.appliance_id,
  brand: li.brand,
  label: li.label,
  nominal_power_kw: null,
  flamme_verte_stars: null,
} : null,

Contraintes absolues :
- Ne toucher qu'au map p_lines dans handleSave
- Ne pas modifier replace_quote_lines
- Ne pas modifier ApplianceSearchTab
- Ne pas modifier le reste de handleSave
```

**LV-02 — Garde prix 0 € appareil (S1, P0)**
```
Dans QuoteEditor.tsx, dans handleSave(finalize = true),
ajouter une garde AVANT le bloc setSavingAll(true) :

const appliancesAtZero = itemLines.filter(
  (l) => l.appliance_id && (l.unit_price_ht ?? 0) === 0
);
if (finalize && appliancesAtZero.length > 0) {
  toast.error(
    `${appliancesAtZero.length} appareil(s) sans prix de vente. Renseignez le prix avant d'envoyer.`
  );
  return;
}

Contraintes :
- Cette garde s'applique uniquement à handleSave(true) (envoi), pas handleSave(false) (enregistrement)
- Ne pas modifier le reste de la validation
- Ne pas toucher à ApplianceSearchTab ni replace_quote_lines
```

**LV-03 — Bloc client visible en tête (S2, P1)**
```
Dans QuoteEditor.tsx, dans le header sticky,
après le bloc qui affiche quote_number + badges,
ajouter le nom du client s'il est disponible :

{projectInfo?.customer_name && (
  <span className="text-sm font-semibold text-foreground">
    {projectInfo.customer_name}
  </span>
)}

Le nom du client doit être visible sans avoir à chercher.
Pas de refonte du header. Ajout uniquement.
Ne pas modifier les autres éléments du header.
```

**LV-04 — Badge inline prix manquant sur ligne appareil (S2, P1)**
```
Dans ItemRow, si la ligne a un appliance_id et unit_price_ht === 0,
afficher un badge discret sous la désignation :

{row.appliance_id && (row.unit_price_ht ?? 0) === 0 && (
  <span className="text-[10px] text-warning font-medium">
    ⚠️ Prix de vente à renseigner
  </span>
)}

Ne pas modifier le reste d'ItemRow.
Ne pas modifier le layout de la grille.
```

---

## PARTIE 5 — Ce que je refuserais catégoriquement de faire maintenant

### REFUS 1 — Refactoring QuoteEditor.tsx
La dette est documentée. Le timing est mauvais. Refactorer 1543 lignes sans avoir 5 clients qui valident le modèle, c'est optimiser un produit dont les fonctionnalités ne sont pas encore stabilisées. Coût : 20-40h. Bénéfice à ce stade : zéro pour l'utilisateur.

### REFUS 2 — Fusion heating_appliances / catalog_items
Architecturalement tentant. Opérationnellement risqué. La colonne `heating_appliance_id` dans `catalog_items` suffit pour créer le pont nécessaire. Une migration destructive des deux tables avant 5 clients payants serait une erreur de priorité classique.

### REFUS 3 — Virtualisation des lignes et optimisation des re-renders
Imperceptible à 15 lignes. Les devis bois-énergie V1 font rarement plus de 20-25 lignes. Traiter ce sujet si et seulement si un pilote se plaint de lenteur sur un grand devis.

### REFUS 4 — Résoudre les 5 libellés concurrents
Problème réel, invisible pour l'artisan à ce stade. Bloquant uniquement quand plusieurs canaux de sortie (PDF vs email vs espace client) divergent. Pas avant 20 clients avec des exports multiples en production.

### REFUS 5 — Note de calcul simplifiée V3
Feature à haute valeur perçue mais à coût de développement élevé. À construire une fois que le devis de base est validé terrain par les pilotes. Construire une note de calcul sur un devis dont le UX n'est pas stabilisé, c'est construire sur du sable.

### REFUS 6 — Visite technique complète
La table `core.technical_surveys` existe. Le schéma est en place. Mais le formulaire de visite technique a besoin du feedback terrain sur les devis pour être correctement conçu (quelles informations manquent au moment de la saisie du devis ?). À construire en S9-S12, pas avant.

### REFUS 7 — Design system — tokens sémantiques
Les couleurs `warning/info/success` utilisées comme palette catégorielle sont une dette réelle. Elle ne bloque aucun workflow utilisateur. À traiter lors d'une session design system dédiée après les pilotes.

---

## Synthèse — La règle des 8 semaines

```
S1-S2  : Corriger ce qui peut tuer une relation pilote (données perdues, prix à 0)
S3     : Terrain. Créer de vrais devis. Observer.
S4     : Corriger ce que le terrain a révélé.
S5     : Premier module aval (Parc installé V1)
S6     : Premier pilote externe.
S7-S8  : 5 pilotes actifs. SAV fondation. Bilan.
```

Tout ce qui n'entre pas dans ce cadre attend S9.
