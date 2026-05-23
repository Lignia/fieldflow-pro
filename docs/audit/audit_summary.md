# AUDIT ARCHITECTURE LIGNIA — Synthèse exécutive

**Date** : 2026-05-23 | **Sources** : Supabase advisors (live), GitHub HEAD, données réelles

---

## État général

LIGNIA est un SaaS métier en fin de phase MVP avec une architecture **techniquement correcte mais pas production-ready**. Le backend Supabase est structurellement sain (multi-tenant par JWT, RLS activée sur les tables critiques, RPCs transactionnelles). Le frontend React est fonctionnel mais accumule de la dette de génération Lovable (fichiers >50 KB, logique dupliquée, composants non extractibles).

**Ce qui est bien :** isolation tenant via `current_tenant_id()` + JWT, RPCs transactionnelles (`replace_quote_lines` avec `FOR UPDATE`), catalogue central + legacy séparés, audit trail `core.activities`, snapshots pricing dans `quote_lines`.

**Ce qui est dangereux :** 35+ fonctions `SECURITY DEFINER` exécutables par `anon` sans authentification, 1 table sans RLS exposée publiquement (`catalog._archive_joncoux_legacy_20260520`), `search_keywords = NULL` sur 6 093 articles Joncoux, aucun test automatisé, aucun monitoring erreurs, environnement unique (pas de staging).

---

## Niveau de risque global

| Domaine | Risque |
|---|---|
| Sécurité | 🔴 **ÉLEVÉ** — anon peut appeler `sign_quote_and_initialize`, `duplicate_quote`, `replace_quote_lines` |
| Données | 🟠 Moyen — pas de backup vérifiable, pas de rollback testé |
| Performance | 🟠 Moyen — 70+ FK sans index, 4 RLS policies avec `auth.uid()` non wrappé en `(select)` |
| Frontend | 🟠 Moyen — fichiers >50 KB (ProjectDetail 54 KB, InterventionDetail 52 KB, QuoteEditor ~60 KB), dette Lovable |
| PWA | 🟡 Faible — non préparé, pas bloquant V1 |
| Tests | 🔴 **ÉLEVÉ** — zéro test unitaire, zéro test E2E, régression Lovable incontrôlée |

---

## Niveau de maturité V1

**5.5/10** — Prêt pour 1-3 testeurs terrain internes. Pas prêt pour des clients payants sans corriger les items P0 sécurité et monitoring.

**Ce qui manque avant V1 commerciale :**
- Révoquer EXECUTE anon sur les RPCs critiques (30 min de SQL)
- RLS sur `_archive_joncoux_legacy_20260520` ou DROP de la table
- Monitoring erreurs frontend (Sentry ou équivalent)
- `search_keywords` indexés sur Joncoux (recherche catalogue cassée en production réelle)
- Leaked password protection (1 clic dashboard Supabase)
