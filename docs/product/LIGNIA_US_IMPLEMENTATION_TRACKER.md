# LIGNIA — US Implementation Tracker
> Suivi d'implémentation des User Stories
> Mis à jour par Claude Read après chaque audit
> Ne jamais modifier manuellement sans audit préalable

---

## LÉGENDE

| Statut | Signification |
|---|---|
| ⬜ Non commencé | Pas de code, pas de table |
| 🔵 En cours | Partiellement implémenté |
| ✅ Implémenté | Code présent, non testé terrain |
| 🟢 Validé terrain | Testé par au moins 1 artisan réel |
| ❌ Bloqué | Dépendance manquante |

---

## BLOC C — CATALOGUE ET FOURNISSEURS

### US-C07a — Activer ses fournisseurs depuis la page Catalogue

| Élément | Statut | Détail |
|---|---|---|
| Table `catalog.tenant_suppliers` | ✅ | Créée — 4 fournisseurs × 7 tenants |
| RLS `tenant_suppliers_tenant` | ✅ | policy ALL, tenant-scoped |
| Seed fournisseurs existants | ✅ | Poujoulat + Joncoux actifs, KEMP + LIGNIA inactifs |
| Bandeau "Mes fournisseurs" Lovable | ⬜ | Ticket M1a — non commencé |
| Toggle actif/inactif UI | ⬜ | Ticket M1a — non commencé |
| Test Rita | ⬜ | Après M1a |

**Prochaine action :** envoyer ticket M1a à Lovable

---

### US-C07b — Recherche devis filtrée sur fournisseurs actifs

| Élément | Statut | Détail |
|---|---|---|
| `p_active_supplier_names` dans `search_quote_items_v2` | ✅ | Paramètre déjà présent |
| `useCatalogSearch` lit `tenant_suppliers` | ⬜ | Ticket M2 — après M1a validé |
| Bannière dashboard si 0 fournisseur actif | ⬜ | Ticket M3 — après M2 validé |
| Cas zéro résultat → lien autres fournisseurs | ⬜ | Ticket M2 |
| Test "coude 150" filtré | ⬜ | Après M2 |

**Dépendance :** M1a doit être validé avant M2

---

### US-C07c — Désactiver un fournisseur

| Élément | Statut | Détail |
|---|---|---|
| Toggle OFF dans `tenant_suppliers` | ⬜ | Inclus dans M1a |
| Devis signés non affectés (INVARIANT 4) | ✅ | Garanti par snapshot `quote_lines` |
| Test désactivation + vérification devis historiques | ⬜ | Après M1a |

---

### US-C07d — Explorer le catalogue par domaine métier

| Élément | Statut | Détail |
|---|---|---|
| `catalog_domain` peuplé sur `catalog_items` | ❌ | Dette critique — NULL sur Poujoulat |
| Onglets Fumisterie/Appareils/Prestations/SAV | ⬜ | Ticket M1b — après M1a |
| Compteurs par onglet | ⬜ | Ticket M1b |
| Recherche vidée au changement d'onglet | ⬜ | Ticket M1b |

**Bloquant :** `catalog_domain` doit être migré avant M1b

---

### US-C07e — Fournisseur préféré par projet (V2/V3)

| Élément | Statut | Détail |
|---|---|---|
| `preferred_supplier_name` dans `core.projects` | ⬜ | À créer en V2 — ne pas implémenter maintenant |
| UI fiche projet | ⬜ | V2/V3 |
| Logique IA priorité fournisseur | ⬜ | V3 |

**Statut :** Documenté, gelé jusqu'aux retours terrain US-C07a/b/c/d

---

## BLOC D — DEVIS

### US-D03 — Recherche catalogue contextualisée

| Élément | Statut | Détail |
|---|---|---|
| `search_quote_items_v2` | ✅ | RPC opérationnelle |
| Filtrage par `catalog_domain` | ❌ | `catalog_domain` NULL sur les articles |
| Filtrage par fournisseurs actifs | ⬜ | Ticket M2 |
| Onglets dans CatalogPopover | ⬜ | Après M1b validé |

---

### US-D04 — Remise fournisseur automatique

| Élément | Statut | Détail |
|---|---|---|
| `resolve_item_price` | ✅ | RPC opérationnelle, lit `tenant_supplier_discounts` |
| `tenant_supplier_discounts` peuplée | 🔵 | Remise globale V1 disponible |
| Remises par famille (D-22) | ⬜ | V2 — colonnes présentes, logique à développer |

---

## BLOC APP — APPAREILS

### US-APP-01 — Ajouter un appareil au devis

| Élément | Statut | Détail |
|---|---|---|
| `heating_appliances` en base | ✅ | Table présente |
| CatalogPopover onglet Appareils | ⬜ | Non branché — dette PILIER 1 |

---

## DETTE CRITIQUE NON BLOQUANTE

| Dette | Impact | Ticket |
|---|---|---|
| `catalog_domain` NULL sur 22 796 articles | Onglets M1b impossibles | Migration SQL à planifier |
| `import-poujoulat-chunk` Edge Function obsolète | Sécurité — `verify_jwt:false` | P0-B sécurité |
| `_import_staging_poujoulat` RLS désactivée | Sécurité | P1 sécurité |

---

## SÉQUENCE D'EXÉCUTION VALIDÉE

```
[EN ATTENTE TON GO]
  M1a → Lovable : bandeau "Mes fournisseurs" sur page Catalogue
         Test Rita : toggle Poujoulat ON/OFF
         ↓
  M1b → Lovable : onglets catalog_domain (après migration catalog_domain)
         ↓
  M2  → Lovable : useCatalogSearch lit tenant_suppliers
         Test "coude 150" filtré
         ↓
  M3  → Lovable : bannière dashboard si 0 fournisseur actif
         ↓
  TERRAIN : 5 artisans, 20 devis, retours
         ↓
  US-C07e + remises V2 : seulement après retours terrain
```

---

## TICKETS LOVABLE PRÊTS À ENVOYER

| Ticket | Statut | Périmètre |
|---|---|---|
| M1a | ✅ Prêt | Bandeau fournisseurs uniquement |
| M1b | ⬜ Bloqué | Attend migration `catalog_domain` |
| M2 | ⬜ En attente | Attend validation M1a |
| M3 | ⬜ En attente | Attend validation M2 |

---

*Dernière mise à jour : 2026-06-23 — Claude Analytics*
*Prochaine mise à jour : après exécution M1a — Claude Read*
