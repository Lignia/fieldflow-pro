# LIGNIA_CANONICAL_TRUTH_AUDIT — v2

> Auteur : Claude Analytics  
> Date : mai 2026 — post-arbitrages D-26 / D-28 / D-30  
> Remplace : v1 (e0b44d9)  
> Périmètre : LIGNIA_V1_MASTER · LIGNIA_LIFECYCLE · LIGNIA_OBJECT_MODEL · ESTIMATE_TO_INSTALLATION_WORKFLOW · HEATING_APPLIANCE_EXECUTION_PLAN · DECISION_LOG

---

## Principe

Ce document est la réconciliation finale des six documents de référence.  
Il liste uniquement ce qui reste contradictoire, non résolu, ou risqué pour l'exécution.  
Il ne théorise pas. Il ne propose pas de nouvelles features.  
Il sert de point de départ obligatoire pour toute session d'exécution.

---

## PARTIE 1 — Contradictions résolues par D-26 / D-28 / D-30

Ces contradictions existaient dans v1. Elles sont closes.

| Contradiction | Résolution | Document aligné |
|---|---|---|
| C-01 : Signature vs clôture pour créer l'installation | D-28 : signature = draft, clôture = active. LIGNIA_LIFECYCLE est la référence. | ESTIMATE_TO_INSTALLATION_WORKFLOW ✅ |
| C-05 : priorité `catalog_items.heating_appliance_id` | D-30 : P1, ne bloque pas les pilotes | HEATING_APPLIANCE_EXECUTION_PLAN — à corriger |
| DI-02 : 1 installation = 1 ou N appareils | D-26 : 1 installation = 1 appareil principal. `heating_appliance_id` scalaire. | ESTIMATE_TO_INSTALLATION_WORKFLOW ✅ |

---

## PARTIE 2 — Contradictions restantes

### C-01r — HEATING_APPLIANCE_EXECUTION_PLAN dit encore P0-05

**Fichier :** `docs/product/HEATING_APPLIANCE_EXECUTION_PLAN.md`  
**Problème :** "P0-05 — `catalog_items.heating_appliance_id` — Priorité : P0"  
**Réalité après D-30 :** P1  
**Bloque l'exécution :** non, mais génère une confusion de priorité.  
**Action A-04 :** déplacer P0-05 → P1 dans ce fichier.

---

### C-02 — LIGNIA_OBJECT_MODEL dit commande fournisseur = V2

**Fichier :** `docs/business/LIGNIA_OBJECT_MODEL.md`  
**Problème :** "Bon de commande — Vision cible : V2"  
**Réalité :** P1-06, vue lecture seule avant les pilotes.  
**Périmètre V1 à figer :** liste articles groupée par fournisseur, lecture seule, pas d'envoi électronique, pas de réconciliation comptable.  
**Bloque l'exécution :** oui — Lovable lisant ce document construira une commande V2 complète.  
**Action A-02 :** corriger LIGNIA_OBJECT_MODEL + créer D-28 dans DECISION_LOG avec périmètre V1 précis.

---

### C-03 — LIGNIA_OBJECT_MODEL dit ouvrages = "Non implémenté"

**Fichier :** `docs/business/LIGNIA_OBJECT_MODEL.md`  
**Problème :** état actuel inexact — `save_lines_as_bundle` RPC existe, bouton présent dans QuoteEditor.  
**Réalité :** sauvegarde implémentée. Consultation et réinsertion depuis bibliothèque : à construire.  
**Bloque l'exécution :** non.  
**Action A-02 :** corriger l'état actuel dans LIGNIA_OBJECT_MODEL.

---

### C-04 — ENGINEERING_PRINCIPLES dit "ne jamais modifier CatalogPopover"

**Fichier :** `docs/ENGINEERING_PRINCIPLES.md`  
**Problème :** règle en violation du code actuel (commit 5ef05449 a modifié CatalogPopover).  
**Bloque l'exécution :** non, mais toute revue de conformité déclenchera une fausse alarme.  
**Action A-03 :** reformuler : "Ne jamais modifier le comportement des onglets existants. L'ajout de nouveaux onglets isolés est permis."

---

### C-05 — ENGINEERING_PRINCIPLES mentionne `AddLineDrawer` inexistant

**Fichier :** `docs/ENGINEERING_PRINCIPLES.md`  
**Problème :** règles sur `AddLineDrawer` — composant fictif. L'onglet Appareils vit dans `ApplianceSearchTab` dans `CatalogPopover`.  
**Bloque l'exécution :** non, mais pollue les prompts Lovable.  
**Action A-03 :** remplacer références `AddLineDrawer` par `ApplianceSearchTab` ou supprimer les règles inapplicables.

---

### C-06 — LIGNIA_V1_MASTER Backlog P0 absent du fix `appliance_id`

**Fichier :** `docs/LIGNIA_V1_MASTER.md`  
**Problème :** le fix `replace_quote_lines` n'est pas dans le Backlog P0.  
**Impact :** un Claude Exec lisant uniquement LIGNIA_V1_MASTER ne verra pas ce P0 critique.  
**Bloque l'exécution :** oui.  
**Action A-01 :** ajouter dans Backlog P0 :
```
- [ ] Fix replace_quote_lines : persister appliance_id
- [ ] Payload frontend handleSave : passer appliance_id  
- [ ] Garde : bloquer envoi si ligne appliance_id avec unit_price_ht = 0
```

---

## PARTIE 3 — Décisions ouvertes (ne pas exécuter sans résolution)

| Ref | Sujet | Impact si non décidé |
|---|---|---|
| D-27 | Contenu minimal de `appliance_snapshot` | Snapshot vide ou JSON non défini. Risque sur l'immuabilité des données devis. |
| D-29 | `catalog_domain` dans `quote_lines` : créer la colonne ou utiliser `appliance_id IS NOT NULL` | Valeur `"APPAREIL"` perdue silencieusement à chaque save. Dette invisible permanente. |

---

## PARTIE 4 — Vérité canonique par sujet

En cas de conflit entre documents, ce tableau prévaut.

### Système devis

| Sujet | Vérité | Source |
|---|---|---|
| Types | `estimate` / `final` / `service` — 3 objets aux règles distinctes | LIGNIA_V1_MASTER |
| `estimate` | Non contractuel, pas d'acompte, pas de `signed_at`, pas de déclenchement installation | LIGNIA_V1_MASTER |
| `final` | Contractuel signable, signature → installation `draft` + acompte | LIGNIA_V1_MASTER + D-28 |
| `service` | SAV/entretien, ultra-compact, 1-3 lignes, pas de sections Appareil/Fumisterie/Pose | LIGNIA_V1_MASTER |
| Signature `final` | Crée `core.installations` avec `status = 'draft'` | D-28 |
| Clôture chantier | Passe `draft` → `active`, calcule garanties + `next_sweep_date` | D-28 + LIGNIA_LIFECYCLE |

### Installation et appareil

| Sujet | Vérité | Source |
|---|---|---|
| Cardinalité | 1 installation = 1 appareil principal. N installations par client/propriété. | D-26 |
| `heating_appliance_id` | Scalaire UUID, FK vers `catalog.heating_appliances`, pas de table pivot V1 | D-26 |
| `appliance_id` dans `quote_lines` | Colonne + FK existent. **Jamais écrite par la RPC.** → P0-01 critique. | Supabase vérifié |
| `catalog_items.heating_appliance_id` | N'existe pas. À créer en P1. | D-30 |
| Données appareils | 1 516 ADEME. `flue_diameter_mm` = 0/1516. `flamme_verte_stars` = 0/1516. | Supabase vérifié |

### Catalogue et pricing

| Sujet | Vérité | Source |
|---|---|---|
| `supplier_name` | Canal d'achat qui facture l'artisan | D-09 + D-21 |
| `manufacturer_name` | Fabricant réel | D-09 + D-21 |
| `catalog.*` RPCs | Interface Lovable. `public.*` = implémentation. Jamais `public.*` depuis Lovable. | D-08 |
| `cost_price` | Jamais importé, jamais stocké, jamais lu frontend | ENGINEERING_PRINCIPLES |
| TVA catalogue | Suggestion ergonomique. `quote_lines.vat_rate` = vérité contractuelle. | D-24 |
| Import | Staging obligatoire. Jamais import direct en catalogue central. | D-02 |

### Priorités d'exécution consolidées

| Priorité | Action | Responsable |
|---|---|---|
| **P0** | Fix `replace_quote_lines` : persister `appliance_id` | Claude Exec |
| **P0** | Payload frontend `handleSave` : passer `appliance_id` | Lovable |
| **P0** | Garde : bloquer envoi si ligne appareil à 0€ | Lovable |
| **P0** | Migration `core.installations.heating_appliance_id` | Claude Exec |
| **P1** | Import Invicta | Claude Exec |
| **P1** | Import Nova (`flamme_verte_stars`, `flue_diameter_mm`) | Claude Exec |
| **P1** | Vue commande fournisseur V1 lecture seule | Lovable |
| **P1** | Migration `catalog_items.heating_appliance_id` | Claude Exec |
| **P2** | Clôture chantier → installation active | Lovable |
| **P2** | Formulaire VT | Lovable |
| **P2** | SAV depuis installation | Lovable |
| **P3** | Note de calcul V3 | — |
| **Forbidden** | Refactoring QuoteEditor | — |

---

## PARTIE 5 — Actions documentaires avant exécution

| Ref | Document | Action |
|---|---|---|
| A-01 | `LIGNIA_V1_MASTER.md` | Ajouter 3 items P0 : fix appliance_id, payload, garde 0€ |
| A-02 | `LIGNIA_OBJECT_MODEL.md` | Commande fournisseur P1 lecture seule / V2 complet. Ouvrages partiellement implémentés. |
| A-03 | `ENGINEERING_PRINCIPLES.md` | Reformuler règle CatalogPopover. Supprimer/remplacer AddLineDrawer. |
| A-04 | `HEATING_APPLIANCE_EXECUTION_PLAN.md` | P0-05 → P1 |
| A-05 | `DECISION_LOG.md` | Ajouter D-25 à D-30 |

Ces actions sont documentaires. Elles ne débloquent pas l'exécution P0 mais préviennent les fausses alarmes.

---

## PARTIE 6 — Règle de validation pour toute recommandation future

Déclarer explicitement avant tout prompt :

**COMPATIBLE** — respecte tous les documents et ce tableau  
**COMPLÈTE** — ajoute ce qui manquait, ne contredit rien  
**CONTREDIT [doc X, règle Y]** — justification obligatoire avant exécution

### Table de référence rapide

| Recommandation | Statut |
|---|---|
| Fix `replace_quote_lines` + `appliance_id` | COMPATIBLE — P0-01 |
| Créer `AddLineDrawer` distinct | CONTREDIT [LIGNIA_V1_MASTER Forbidden] |
| Fusionner `heating_appliances` + `catalog_items` | CONTREDIT [D-02, D-03, D-08] |
| Créer colonne `catalog_domain` dans `quote_lines` | COMPLÈTE — résout D-29 si et seulement si D-29 est décidé |
| Vue commande fournisseur lecture seule | COMPATIBLE — P1-06 |
| Note de calcul V3 maintenant | CONTREDIT [LIGNIA_V1_MASTER P3] |
| Refactoring QuoteEditor | CONTREDIT [LIGNIA_V1_MASTER Forbidden] |
| Import Invicta | COMPATIBLE — P1-01 |

---

*Prochaine mise à jour : après clôture du chantier Heating Appliances et décisions D-27 / D-29.*
