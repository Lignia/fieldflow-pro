# CE QU'IL NE FAUT SURTOUT PAS FAIRE MAINTENANT

## Anti-overengineering et refactors dangereux

---

### ❌ Composant `<QuoteDocument>` partagé Editor/Detail/PDF
Trois cycles de vie incompatibles (React state / Supabase read / jsPDF). Refactor massif pour un gain hypothétique. Le faire maintenant = 3 surfaces de régression simultanées.

### ❌ Auto-save dans QuoteEditor
`replace_quote_lines` est DELETE + INSERT. Un auto-save toutes les 30s viderait et remplirait le devis en boucle. Incompatible avec le FSM actuel qui trace chaque save dans `core.activities`.

### ❌ Migration vers un composant `<MoneyDisplay>` partagé
Nécessite un refactor de tous les affichages financiers dans tous les fichiers. Risque de régression disproportionné. Faire quand le design system est stabilisé.

### ❌ Refactor `QuoteDetail.tsx` en sous-composants extractibles
Lovable peut régénérer ce fichier à tout moment. Extraire des composants que Lovable réinlinera à la prochaine génération = dette perpétuelle. Stabiliser Lovable d'abord.

### ❌ Virtualisation du tableau de lignes (react-virtual, tanstack-virtual)
Nécessaire à partir de 100+ lignes. Actuellement 11 lignes en démo. Prématuré. À faire quand un devis réel dépasse 30 lignes.

### ❌ Service Worker / PWA offline
Supabase Realtime + RLS ne sont pas compatibles avec un offline naïf. Les devis non sauvegardés en offline créeraient des conflits de version. Décision produit complexe requise. Reporter à V2.

### ❌ Multi-rôles utilisateur (artisan / patron / secrétaire) avec vues différenciées
L'architecture RLS est prête (JWT `tenant_id` + `user_id`), mais l'UI et le backend ne distinguent pas encore les rôles. Ajouter la gestion des rôles UI maintenant = refactor de tous les composants. Reporter à V2.

### ❌ Dashboard rôle-aware (Patron vs Artisan vs Ramoneur)
Requiert `tenant_type` ou `user_role` sur chaque tenant/user. Pas en base. Décision produit + migration requises. Reporter.

### ❌ Refactoring `replace_quote_lines` pour la rendre non-destructive (UPDATE partiel)
La stratégie DELETE + INSERT avec `FOR UPDATE` est intentionnelle et garantit la cohérence. Passer à un UPDATE partiel introduit des risques de lignes orphelines et complexifie les rollbacks.

### ❌ Ajouter des colonnes `amount_paid` / `payment_tracking` sur billing.invoices
Nécessite une migration + un module de saisie paiements + des RPCs. Module complet, pas une simple colonne. Reporter à V2 post-premiers testeurs.

### ❌ Supprimer les routes `/design-system` et `/icon-showcase` maintenant
Pas bloquant, risque nul, mais Lovable peut les recréer. Traiter en batch de nettoyage dédié.

### ❌ Composant `<FsmTimeline>` réutilisable
Nécessite une décision sur les étapes par type d'objet (devis ≠ facture ≠ projet). Design system à stabiliser d'abord.
