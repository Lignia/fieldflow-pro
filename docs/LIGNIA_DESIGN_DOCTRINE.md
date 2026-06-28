# LIGNIA DESIGN DOCTRINE

> Ce document n'est pas un benchmark.
> C'est le manuel de conception de LIGNIA.
> Il explique pourquoi LIGNIA est conçu comme il l'est,
> en utilisant OpenFire comme professeur — pas comme concurrent.
>
> Sources : 10 pages OpenFire lues intégralement (juin 2026)
> + code GitHub Lignia/fieldflow-pro SHA 4b83bfd
> + Supabase hejxvqghsyaauwzkfikg
> + User Stories V3 + DECISION_LOG D-01→D-32
>
> Auteur : Claude Analytics — 27 juin 2026
> Propriétaire : Thomas
> Ne pas modifier sans GO Thomas

---

## COMMENT LIRE CE DOCUMENT

Pour chaque décision de conception :

1. **Problème métier artisan** — le vrai problème humain que la fonctionnalité résout
2. **Données impliquées** — le flux de données du problème à la solution
3. **Décision OpenFire** — pourquoi OpenFire a fait ce choix
4. **Décision LIGNIA** — notre choix et ses fondements
5. **Verdict** — CONSERVER / DÉPASSER / ABANDONNER + justification
6. **Leçon** — ce que LIGNIA apprend de cette analyse
7. **Impact** — base de données, user stories, backlog, intégrations, IA

---

## TABLE DES MATIÈRES

1. [Architecture catalogue — Import local vs SaaS central](#1-architecture-catalogue)
2. [Conditions tarifaires — Remises par marque vs remises par famille](#2-conditions-tarifaires)
3. [Kits et ouvrages — Composants vs bundle consolidé](#3-kits-et-ouvrages)
4. [Devis — Richesse documentaire vs fluidité d'usage](#4-devis)
5. [Acompte — Action manuelle vs automatisation à la signature](#5-acompte)
6. [Facture — Pièce comptable vs document commercial](#6-facture)
7. [Commande fournisseur — Workflow achat vs flux devis→BDC](#7-commande-fournisseur)
8. [Connecteurs fournisseurs — Redirection panier vs intégration directe](#8-connecteurs-fournisseurs)
9. [Contrats de maintenance — Objet récurrent vs colonnes isolées](#9-contrats-de-maintenance)
10. [SAV — Workflow tri-flux vs module simplifié](#10-sav)
11. [Mobile — Application native vs web responsive](#11-mobile)
12. [TVA — Position fiscale globale vs doctrine par famille](#12-tva)
13. [Planning — Calendrier opérationnel vs stub vide](#13-planning)
14. [Synthèse — Ce que LIGNIA conserve, dépasse, abandonne](#14-synthèse)

---

## 1. ARCHITECTURE CATALOGUE

### Problème métier artisan

Thierry (artisan solo) cherche "coude 150 Poujoulat" dans son logiciel.
Il doit trouver en 2 secondes, avec le bon prix, la bonne référence.
S'il ne trouve pas, il ouvre un fichier Excel ou téléphone à son fournisseur.
Chaque minute perdue = marge perdue.

### Données impliquées

```
Fabricant (Poujoulat)
  ↓ met à jour ses tarifs
Catalogue central
  ↓ article disponible
Artisan cherche "coude 150"
  ↓ résultat avec prix net remisé
Ligne de devis insérée
  ↓ snapshot prix + référence
Bon de commande futur
  ↓ référence brute transmise au fournisseur
```

### Décision OpenFire

Import local à la demande. Le catalogue central est une base partagée entre tous les artisans OpenFire. Quand un artisan utilise un article pour la première fois dans un devis, cet article s'importe dans SA base locale. Il travaille ensuite sur sa copie. Mise à jour tarifs = action manuelle "Mettre à jour mes produits".

**Pourquoi ce choix ?** OpenFire est construit sur Odoo. Odoo est une architecture mono-instance par client. Chaque artisan a son propre serveur Odoo (ou sa propre instance cloud). Il ne peut pas lire la base d'un autre artisan. La base locale est donc structurellement obligatoire. L'import à la demande est un compromis intelligent pour éviter d'importer 50 000 articles inutilement.

### Décision LIGNIA

Catalogue central partagé, lecture temps réel, sans import local.
22 796 articles en base centrale (`is_central=true`, `tenant_id=NULL`).
`search_quote_items_v2` interroge directement la table centrale avec RLS.
Quand LIGNIA met à jour les tarifs Poujoulat, tous les 7 tenants (puis 500) voient la mise à jour immédiatement.

**Pourquoi ce choix ?** LIGNIA est SaaS natif. Supabase avec RLS permet à 500 tenants de lire le même catalogue central sans isolation de données problématique — le `tenant_id IS NULL` sur les articles centraux signifie "accessible à tous". C'est le modèle multi-tenant moderne.

### Verdict : DÉPASSER — décision LIGNIA supérieure

| Critère | OpenFire | LIGNIA |
|---|---|---|
| Mise à jour tarifs | Manuelle par artisan | Centrale automatique |
| Cohérence données | Risque de désynchronisation | Toujours à jour |
| Scalabilité | 1 base par tenant | 1 catalogue pour N tenants |
| Architecture | Odoo mono-instance | SaaS multi-tenant natif |

### Leçon

OpenFire a résolu le problème de performance avec l'import local parce que son architecture l'y contraint. LIGNIA n'a pas cette contrainte. Le catalogue central SaaS est une décision conservée définitivement.

**Ce qui manque dans LIGNIA vs OpenFire** : l'alerte "tarif bientôt obsolète" sur le devis. OpenFire notifie si le fabricant a annoncé une mise à jour de prix imminente. LIGNIA devrait signaler sur le devis si les tarifs ont été mis à jour depuis la dernière utilisation de l'article.

### Impact

- `catalog.catalog_items.is_central` : décision architecturale fondamentale — ne jamais changer
- V2 backlog : ajouter `catalog_items.last_price_update` + alerte devis si article utilisé avant la mise à jour
- IA future : le catalogue central est la base d'entraînement des suggestions de devis

---

## 2. CONDITIONS TARIFAIRES

### Problème métier artisan

Arnaud (patron showroom) a négocié 30% de remise globale sur Poujoulat, mais 40% sur les accessoires et un prix fixe sur le poêle AMSTERDAM ESTAILLADE. Il veut que ces remises s'appliquent automatiquement sans que Sophie (vendeuse) ait à les mémoriser.

### Données impliquées

```
Accord commercial fournisseur
  ↓ remise par famille
Catalogue central (prix public)
  ↓ prix remisé calculé
Ligne de devis
  ↓ prix net artisan caché (cost_price)
  ↓ prix de vente client visible (unit_price_ht)
Marge = unit_price_ht - cost_price
```

### Décision OpenFire

3 niveaux de remise : marque (global) → catégorie (surcharge le global) → article spécifique (surcharge tout). Les remises utilisent des formules libres avec variables (`ppht`, `pa`, transport, coefficient). L'artisan clique "Appliquer les règles" pour recalculer. La structure de prix peut inclure frais de transport, coefficient de vente, taxes diverses.

**Pourquoi ce choix ?** OpenFire vise des showrooms multi-marques avec des accords commerciaux complexes. Un revendeur Jotul peut avoir des remises différentes par ligne de produit, un prix de revient incluant le transport, et un coefficient de vente différent selon la saison. La flexibilité des formules répond à cette complexité.

### Décision LIGNIA

2 niveaux : fournisseur → famille de produit. Remise en pourcentage direct. Calcul automatique à chaque insertion via `resolve_item_price`. L'artisan configure une seule fois dans SupplierDiscounts.tsx.

**Pourquoi ce choix ?** Pour le pilote 5 artisans, 2 niveaux suffisent. La complexité OpenFire nécessite une formation de plusieurs heures. Le principe LIGNIA est que la configuration doit être apprise en moins de 30 secondes — un seul écran, une remise par famille, c'est tout.

### Verdict : CONSERVER pour V1, ENRICHIR en V2

La simplicité LIGNIA est un choix produit délibéré. Le 3e niveau (remise article spécifique) sera nécessaire pour les artisans ayant des accords négociés sur un produit particulier. La structure de prix (transport, coefficient) sera pertinente quand LIGNIA gérera les commandes fournisseurs.

### Leçon

OpenFire a sur-investi dans la flexibilité des remises au détriment de la simplicité. Pour 80% des artisans bois énergie, une remise par famille suffit. Le 20% complexe attendra V2.

**Ce que LIGNIA doit anticiper** : le champ `discount_pct` dans `quote_lines` est à 0 sur 107/107 lignes. La remise est invisible à l'artisan. OpenFire la montre. Amélie a besoin de voir "Remise appliquée : 30%" sur la ligne.

### Impact

- `catalog.tenant_supplier_discounts` : architecture correcte, à enrichir (3e niveau article)
- `billing.quote_lines.discount_pct` : doit être rempli par `resolve_item_price`
- V2 backlog : afficher la remise appliquée sur chaque ligne de devis
- Intégration Pennylane : le prix de revient net doit être exporté pour le calcul de marge

---

## 3. KITS ET OUVRAGES

### Problème métier artisan

Sophie (vendeuse showroom) crée souvent le même ensemble : poêle Godin + conduit 6m + sortie toiture + raccordement = "Raccordement granulés standard". Elle veut l'insérer en 1 clic dans chaque devis au lieu de retaper 4 lignes.

### Données impliquées

```
Ensemble de lignes sauvegardé
  ↓ nom + composants + prix
Réutilisation dans devis futur
  ↓ insertion rapide
Mise à jour prix composant
  ↓ impact sur le kit ?
```

### Décision OpenFire

Le kit est un objet produit avec des composants liés. `pack_ok: VRAI` + `pack_component_price: totalized`. Les composants sont des articles indépendants. Si le prix d'un composant change, le prix du kit se recalcule. Import kit = 3 fichiers : composants, kit, liaisons. La liaison composant→kit est maintenue en base.

**Pourquoi ce choix ?** OpenFire est un ERP avec gestion de stock. Un kit qui se compose de 3 articles stockables doit mettre à jour le stock de chaque composant à la vente. La liaison est nécessaire pour la logistique.

### Décision LIGNIA

`save_lines_as_bundle` crée un article `product_type='service'` dans le catalogue interne. Le bundle est stocké comme un prix consolidé, pas comme une structure de composants. Les composants originaux ne sont pas liés. Réinsertion via l'onglet "Mes ouvrages" (BUG-03, à implémenter).

**Pourquoi ce choix ?** LIGNIA n'a pas de stock. La liaison composant→bundle n'est pas nécessaire pour l'instant. La simplicité prévaut.

### Verdict : ACCEPTABLE pour V1, LIMITÉ pour V2

Le bundle LIGNIA résout 80% du besoin : réutilisation rapide, insertion en 1 clic. Il ne résout pas la mise à jour automatique de prix si Poujoulat change le tarif d'un conduit. Dans OpenFire, le kit se recalcule. Dans LIGNIA, le bundle garde le prix au moment de la sauvegarde.

### Leçon

OpenFire a construit la structure de composants pour la gestion de stock et la logistique. LIGNIA n'en a pas besoin aujourd'hui. Mais quand LIGNIA génèrera des bons de commande depuis les devis, il faudra retrouver les composants de chaque bundle pour commander les bonnes quantités.

**Risque V2** : si un artisan sauvegarde "Raccordement granulés" et que Poujoulat sort une nouvelle version du conduit 6m, le bundle ne s'adapte pas. L'artisan ne sait pas que son bundle est périmé.

### Impact

- `catalog.save_lines_as_bundle` : décision correcte pour V1
- V2 : ajouter `bundle_lines` JSONB dans l'article bundle pour conserver les composants
- V2 : alerte "bundle créé avec des prix datant de X jours"
- BDC futur : éclater le bundle en lignes composants pour commander les bons articles

---

## 4. DEVIS

### Problème métier artisan

Thierry (artisan solo) doit produire un devis légalement valide, professionnel, envoyable par email, signable électroniquement, avec mention de la visite technique et date de validité. Tout ça en 15 minutes.

### Données impliquées

```
Client + adresse (facturation ≠ livraison possible)
  ↓
Lignes produits + sections + notes
  ↓
TVA par ligne
  ↓
Sous-totaux par section
  ↓
Date expiration (mention légale)
  ↓
Signature électronique
  ↓
Bon de commande → déclenche acompte
```

### Décision OpenFire

Devis ultra-complet : adresse facturation distincte, adresse livraison, date visite technique, date expiration, liste de prix par client, position fiscale, conditions de paiement, politique de facturation (quantités commandées vs livrées), onglet suivi avec étapes Kanban, notes d'intervention héritées dans les DI. L'envoi par email génère le PDF joint avec modèle configurable. Sections avec sous-totaux HT et TTC. "Article principal" marqué (le poêle).

**Pourquoi ce choix ?** OpenFire cible des showrooms avec plusieurs vendeurs, des processus de validation, des clients récurrents avec des listes de prix négociées. La richesse est justifiée pour une structure commerciale de 5-10 personnes.

### Décision LIGNIA

Devis fonctionnel mais moins riche. Sections avec sous-totaux ✅. Signature ✅. PDF ✅. Lignes libres ✅. Remises ✅. Manquent : date expiration, envoi email, adresse facturation distincte, position fiscale (tva_context), conditions de paiement configurables, étapes Kanban.

### Verdict : EN RETARD sur 3 points critiques pour la légalité

| Fonctionnalité | OpenFire | LIGNIA | Priorité |
|---|---|---|---|
| Date d'expiration | ✅ | ❌ | **V1 — mention légale** |
| Envoi email | ✅ | ❌ | **V1 — usage quotidien** |
| Adresse facturation ≠ client | ✅ | ❌ | V2 |
| Position fiscale (tva_context) | ✅ | ❌ | V1.5 |
| Conditions de paiement | ✅ | ❌ | V2 |
| Étapes Kanban suivi | ✅ | ❌ | V2 |
| Reste à facturer visible | ✅ | ❌ | V2 |

### Leçon

OpenFire a surspécifié le devis pour des structures commerciales complexes. LIGNIA doit s'arrêter à ce qui est légalement requis (date expiration, envoi email) et à ce qui est commercialement nécessaire (position fiscale). Le reste peut attendre.

**Décision légale** : un devis sans date de validité n'a pas de valeur contractuelle en France (article L.441-1 Code de commerce). C'est un bug légal, pas une amélioration optionnelle.

### Impact

- `billing.quotes` : ajouter `expires_at DATE` — migration V1.5
- `billing.quotes` : ajouter `tva_context` — migration V1.5
- V1 backlog : envoi email devis depuis Lovable
- DECISION_LOG : documenter la décision de simplifier le devis vs OpenFire

---

## 5. ACOMPTE

### Problème métier artisan

Après la signature, Thierry a besoin d'une facture d'acompte pour commencer les travaux. Le client paie 30%, le reste à la livraison. Si Thierry oublie l'acompte, il finance le stock sur ses fonds propres.

### Données impliquées

```
Devis signé
  ↓ déclenche acompte (%)
Facture acompte créée
  ↓ envoyée au client
Paiement reçu
  ↓ déclenche commande fournisseur
Travaux réalisés
  ↓ facture solde = total - acompte
```

### Décision OpenFire

L'acompte est une action manuelle après confirmation du bon de commande. L'artisan choisit "Acompte pourcentage" ou "Acompte montant fixe". OpenFire pré-sélectionne selon l'échéancier. La ligne acompte dans la commande est protégée — elle sera déduite automatiquement de la facture solde. L'artisan peut configurer les pourcentages par défaut dans les paramètres.

**Pourquoi ce choix ?** OpenFire vise des structures avec des acomptes variables selon le client et le projet. Certains clients paient 30%, d'autres 50%. La décision est commerciale, pas technique.

### Décision LIGNIA

`sign_quote_and_initialize` crée l'acompte automatiquement à la signature. Zéro clic supplémentaire. `invoice_kind='deposit'`. Le montant est fixé par le système (non configurable dans l'UI actuelle).

**Pourquoi ce choix ?** La signature = intention d'achat. L'acompte doit suivre immédiatement sans que l'artisan y pense. Pour le pilote, un pourcentage fixe est suffisant. La flexibilité attendra.

### Verdict : CONSERVER l'automatisation, ENRICHIR la flexibilité

L'automatisation LIGNIA est supérieure à l'action manuelle OpenFire pour 80% des cas. Mais l'absence de configuration du pourcentage et l'absence de déduction dans la facture solde sont des manques critiques pour V2.

**Problème non résolu** : `parent_invoice_id` existe dans `billing.invoices` pour lier l'acompte à la facture solde. Cette colonne n'est jamais remplie dans le code actuel. La déduction automatique n'est pas implémentée.

### Leçon

OpenFire a raison sur un point : l'artisan doit VOIR que l'acompte sera déduit de la facture finale. Cette transparence évite les litiges avec le client. LIGNIA doit afficher "Acompte déduit : -500€ HT" dans la facture solde.

### Impact

- `billing.invoices.parent_invoice_id` : à remplir lors de la création de la facture solde
- V2 : configurer le % d'acompte par défaut dans les paramètres tenant
- V2 : afficher déduction acompte dans la facture solde
- Intégration Pennylane : l'acompte et le solde doivent être exportés comme deux pièces distinctes avec liaison

---

## 6. FACTURE

### Problème métier artisan

Sabrina (comptable, PER011) reçoit les factures de l'artisan. Elle a besoin : d'un numéro unique séquentiel, d'une date légale, des montants HT/TVA/TTC par taux, du SIRET client, des mentions obligatoires. Si la facture est mal construite, le client conteste ou l'administration fiscale redresse.

### Données impliquées

```
Bon de commande validé
  ↓ lignes → invoice_lines
Chaque ligne = écriture comptable (compte 706/707)
  ↓
Numéro séquentiel obligatoire
  ↓
Date légale (pas antérieure à la dernière facture)
  ↓
Export FEC pour clôture fiscale
```

### Décision OpenFire

La facture est une pièce comptable native. Chaque ligne de facture génère une écriture dans le grand livre (compte 706 prestations, 707 ventes marchandises). L'affectation des comptes est automatique. La facture ne peut pas être antidatée. États : Brouillon → Comptabilisée (immuable) → Annulée. "Crédits en circulation" détectés automatiquement.

**Pourquoi ce choix ?** OpenFire intègre la comptabilité complète. La facture = pièce comptable est obligatoire dans cette architecture. C'est le modèle Odoo.

### Décision LIGNIA

La facture est un document commercial, pas une pièce comptable. `billing.invoices` avec `total_ht`, `total_vat`, `total_ttc`. Colonnes comptables anticipées (`facturx_xml`, `einvoice_status`) mais vides. La comptabilité est déléguée à Pennylane/Evoliz/Sage via export futur.

**Pourquoi ce choix ?** Décision architecturale fondamentale et délibérée. LIGNIA est un CRM/ERP métier, pas un logiciel de comptabilité. L'artisan a déjà un comptable qui utilise Pennylane. Dupliquer la comptabilité dans LIGNIA crée de la confusion et de la re-saisie.

### Verdict : CONSERVER la séparation CRM/compta — c'est un différenciant

La décision de ne pas faire de comptabilité intégrée est correcte. Mais elle crée une obligation : l'export vers les outils comptables doit être irréprochable.

**Ce qui est urgent** : les 3 factures en base sont toutes en `invoice_status='draft'`. Elles n'ont jamais été "envoyées" ni "comptabilisées". Le cycle de vie de la facture n'est pas complet.

**Ce qui est légal** : la numérotation séquentielle sans trou est une obligation légale en France (article 242 nonies A de l'annexe II du CGI). Le trigger `t2_set_invoice_number` est en place — mais la protection "pas d'antidatage" n'existe pas dans LIGNIA.

### Leçon

OpenFire a raison sur les garde-fous légaux : pas de facture antidatée, pas de modification après validation, numérotation inviolable. LIGNIA doit implémenter ces garde-fous même sans comptabilité intégrée — ce sont des obligations légales, pas des fonctionnalités optionnelles.

### Impact

- `billing.invoices` : ajouter garde-fou "date ≥ dernière facture validée" — migration V2
- `billing.invoices.invoice_status` : implémenter le workflow draft → sent → paid
- V2 : export CSV normalisé vers Pennylane/Sage (lignes avec codes TVA)
- V3 : Factur-X XML — colonnes déjà anticipées en base (`facturx_xml`, `einvoice_status`)
- SIRET client : champ absent de `core.customers` — obligatoire pour Factur-X 2027

---

## 7. COMMANDE FOURNISSEUR

### Problème métier artisan

Après la signature du devis, Thierry doit commander le poêle et les conduits chez Poujoulat. Il reprend le devis, identifie les articles Poujoulat, les recopie dans un email ou sur le site pro Poujoulat. 20 minutes de ressaisie par chantier.

### Données impliquées

```
Devis signé
  ↓ lignes par fournisseur
Bon de commande Poujoulat
  ↓ references brutes (supplier_ref)
  ↓ quantités
  ↓ adresse livraison (chantier ou entrepôt)
Réception marchandise
  ↓ bon de livraison
  ↓ stock disponible
Installation planifiée
```

### Décision OpenFire

BDC depuis le devis via "Livraison → Approvisionnement". 4 formats PDF : demande de prix, BDC, BDC sans prix, commande sous-traitant. Envoi par email ou connecteur EDI (Poujoulat, Modinox, Lorflex, Turbofonte). Approbation managériale configurable par montant. Livraison directe client (drop shipping) disponible.

**Pourquoi ce choix ?** La commande fournisseur est le maillon manquant entre le devis et le chantier. Sans elle, l'artisan ressaisit à la main. OpenFire a investi massivement ici parce que c'est LA douleur #1 des artisans multi-fournisseurs.

**Décision architecturale OpenFire révélée** : le format "BDC sans prix" est brillant. Il permet de passer commande même si les tarifs en base ne sont pas à jour. L'artisan commande les bonnes références sans exposer des prix potentiellement faux.

### Décision LIGNIA

Tables présentes (`billing.purchase_orders`, `billing.purchase_order_lines`), RPC `create_purchase_order` existe, `catalog.supplier_connectors` structuré. Zéro front, 0 ligne en base. Module entièrement absent de l'UX.

### Verdict : EN RETARD — manque stratégique V2 prioritaire

C'est le manque le plus coûteux en temps artisan. 20 minutes de ressaisie × 3 chantiers/semaine × 50 semaines = 50 heures par an par artisan. À 50€/heure = 2 500€ de valeur créée par artisan par an.

**Décision architecturale à prendre** : le `supplier_ref` Poujoulat et KEMP est déjà préfixé (`POU_`, `KEMP_`) dans la base. Pour passer commande, il faut soit nettoyer les préfixes, soit mapper les références dans le connecteur. C'est une décision technique bloquante pour la commande fournisseur.

### Leçon

OpenFire a raison d'avoir investi ici. La commande fournisseur est l'argument de vente #2 de LIGNIA après le catalogue. "Depuis votre devis signé, 1 clic pour commander chez Poujoulat" = différenciant commercial fort.

**Décision architecturale révélée** : la livraison directe client (drop shipping) est le cas réel des artisans bois énergie. Poujoulat livre directement chez Michel (le client particulier). LIGNIA doit prévoir `delivery_address = installation.property_address` dans le bon de commande.

### Impact

- `catalog.supplier_ref` : décider du nettoyage des préfixes avant V2
- `billing.purchase_orders` : l'architecture est prête, construire le front V2
- `catalog.supplier_connectors` : implémenter le connecteur Poujoulat en mode "push email" d'abord
- `billing.delivery_notes` : livraison directe client = adresse chantier
- DECISION_LOG : créer D-33 sur la stratégie commande fournisseur

---

## 8. CONNECTEURS FOURNISSEURS

### Problème métier artisan

Thierry veut commander 15 références Poujoulat. Il a le bon de commande LIGNIA sous les yeux. Il veut que ça apparaisse directement dans son espace pro Poujoulat sans retaper.

### Données impliquées

```
BDC LIGNIA (supplier_ref + quantités)
  ↓
Connecteur Poujoulat
  ↓
Panier pré-rempli sur espace.poujoulat.fr
  ↓
Validation finale par Thierry
  ↓
Confirmation commande par Poujoulat
  ↓
Mise à jour stock LIGNIA (si disponible)
```

### Décision OpenFire

"Push panier" vers le site pro du fournisseur. Le clic "Commande Poujoulat" pré-remplit le panier sur l'espace pro Poujoulat. La validation finale reste sur le site Poujoulat. Les produits non reconnus s'affichent en rouge. Connecteurs actifs : Poujoulat, Modinox, Laudevco, Lorflex, Turbofonte.

**Pourquoi ce choix ?** Le "push panier" est techniquement plus simple et plus robuste qu'un EDI complet. L'artisan garde le contrôle sur la validation finale. Pas de problème de stock temps réel, pas d'API bidirectionnelle à maintenir.

**Révélation** : les produits doivent être "connectés" (importés depuis le catalogue centralisé) pour que le connecteur fonctionne. Si l'article n'a pas de référence reconnue par Poujoulat, il s'affiche en rouge. C'est pourquoi la `supplier_ref` brute est critique.

### Décision LIGNIA

`catalog.supplier_connectors` avec `connector_type`, `order_email`, `api_endpoint`, `api_key_ref`, `api_format`, `field_mapping`. L'architecture anticipe deux modes : email structuré et API directe. Aucun des deux n'est implémenté.

**Pourquoi ce choix ?** LIGNIA a anticipé une intégration plus profonde qu'OpenFire (API directe), mais l'a pas encore construite.

### Verdict : CONSERVER l'architecture, COMMENCER par l'email

Le "push email" (commande envoyée par email formaté au fournisseur) est plus simple que le "push panier" web et moins dépendant des APIs fournisseurs. `catalog.supplier_connectors.order_email` et `email_subject_template` sont déjà prévus. C'est le bon point de départ.

### Leçon

OpenFire a négocié des partenariats avec les fournisseurs. LIGNIA devra faire pareil. La `supplier_ref` préfixée (`POU_`, `KEMP_`) est un problème — le fournisseur attend la référence brute, pas le préfixe LIGNIA. **C'est la dette technique la plus urgente à résoudre avant d'implémenter les connecteurs.**

### Impact

- `catalog.catalog_items.supplier_ref` : audit et décision sur les préfixes — BLOQUANT pour V2
- `catalog.supplier_connectors` : architecture correcte, implémenter push email V2
- `catalog.supplier_order_logs` : traçabilité des commandes envoyées — déjà structuré
- Partenariat Poujoulat : contact commercial pour obtenir les spécifications de leur API

---

## 9. CONTRATS DE MAINTENANCE

### Problème métier artisan

Luc (ramoneur, PER002) a 200 clients avec un entretien annuel. Chaque automne, il doit planifier 200 interventions, envoyer 200 rappels, créer 200 devis/factures. Sans système, il en oublie 30, perd 3 000€ de CA.

### Données impliquées

```
Client + installation
  ↓
Contrat (périodicité annuelle)
  ↓
Rappel automatique N jours avant
  ↓
DI créée automatiquement
  ↓
RDV planifié
  ↓
Intervention réalisée
  ↓
Facture générée (à la prestation)
  ↓
Certificat de ramonage
  ↓
Prochaine DI créée automatiquement
```

### Décision OpenFire

Deux modes : contrat simplifié (DI récurrentes) et contrat avancé. Le contrat avancé lie : client, sites multiples, fréquence, produit à facturer, prix, modèle d'intervention, mois de visite, équipements. Il génère automatiquement les DI ET les commandes/factures. Deux types de facturation : récurrente (mensuelle/trimestrielle) ou à la prestation (facturable à la réalisation). Compte analytique par contrat pour la rentabilité.

**Pourquoi ce choix ?** Le contrat est l'objet métier central du ramoneur et de l'entreprise d'entretien. Sans contrat, pas de récurrence, pas de prévisibilité, pas de cash flow. OpenFire a investi massivement ici parce que c'est le cœur de l'activité maintenance.

**Révélation architecturale** : le mode "facturation à la prestation" est crucial. La facture n'est générée que quand l'intervention est réalisée. C'est le seul mode légal pour un artisan qui facture une prestation future incertaine (le client peut annuler).

### Décision LIGNIA

`core.installations.has_maintenance_contract` (booléen), `maintenance_contract_start/end` (dates). C'est tout. Deux colonnes. Aucune logique. Aucune DI automatique. Aucune facturation récurrente.

### Verdict : EN RETARD — gap stratégique majeur pour les ramoneurs

Luc (PER002) ne peut pas utiliser LIGNIA pour son activité principale. C'est un blocage pour tout le segment ramonage.

**Ce que LIGNIA doit construire** :
1. Objet `contracts` lié à `installations`
2. Génération automatique de DI depuis le contrat
3. Facturation à la prestation après réalisation
4. Rappels automatiques client (email)

### Leçon

OpenFire a eu raison de faire du contrat un objet de premier niveau. LIGNIA a voulu simplifier et a perdu toute la logique. La solution n'est pas de copier OpenFire — c'est de construire un objet `maintenance_contract` qui automatise davantage qu'OpenFire (suggestions de dates basées sur l'historique, géolocalisation des tournées).

**Décision IA future** : le contrat de maintenance est le cas d'usage parfait pour une IA prédictive. "Les interventions de Luc dans le Morvan se concentrent en octobre-novembre. Proposer automatiquement un planning optimisé par géolocalisation."

### Impact

- `core.installations` : colonnes présentes, logique à construire
- V2 backlog prioritaire : module contrats de maintenance
- `operations.interventions` : ajouter `contract_id` FK
- `billing.quotes` : ajouter `contract_id` FK pour facturation récurrente
- IA V3 : optimisation planning tournées depuis les contrats géolocalisés

---

## 10. SAV

### Problème métier artisan

Michel (PER009C) appelle Ambiance Chaleur : son poêle ne démarre plus depuis ce matin. Amélie (secrétaire) doit créer une DI SAV, identifier l'installation de Michel, qualifier la panne, devis pièces + MO, commander la pièce, planifier Yohan, facturer.

### Données impliquées

```
Appel client
  ↓
Identification installation (parc installé)
  ↓
DI SAV créée
  ↓
Diagnostic : pièce défectueuse ?
  ↓ oui → devis pièce + MO
  ↓ non → RDV diagnostic
Devis validé
  ↓
Commande pièce (BDC fournisseur)
  ↓
RDV Yohan planifié
  ↓
Intervention réalisée
  ↓
Facture solde générée
  ↓
Stock mis à jour
```

### Décision OpenFire

SAV = 3 flux parallèles : commercial (devis→commande→facture), logistique (stock pièces→BL→sortie stock), technique (planification→réalisation→CR mobile). Vue Kanban avec étapes personnalisables. 3 statuts automatiques : planification, réalisation, facturation. Le technicien génère la facture depuis son mobile à la clôture.

**Pourquoi ce choix ?** Le SAV est un processus complexe qui implique 3 acteurs : la secrétaire (commercial + logistique), le technicien (terrain), le client (signature + paiement). OpenFire a modélisé cette réalité.

**Révélation** : le SAV sous garantie avec "commande à 0€" est une solution élégante pour sortir les pièces du stock sans facturer le client. LIGNIA n'a pas de stock mais devra gérer les pièces garantie.

### Décision LIGNIA

Module SAV fonctionnel (`ServiceRequestCreate.tsx` 32Ko, `ServiceRequestDetail.tsx` 20Ko). Mais sans : bouton "Générer devis depuis SAV", gestion des pièces détachées, vue Kanban, facturation mobile, statuts automatiques.

### Verdict : BON DÉBUT, manque le lien commercial

Le module existe et fonctionne. La lacune principale : l'artisan doit naviguer manuellement entre la DI SAV et la création du devis. OpenFire a un bouton "Générer devis" qui pré-remplit avec le client et l'installation. Ce bouton manque dans LIGNIA.

### Leçon

Le SAV est un flux, pas un écran. La valeur est dans les transitions automatiques : DI créée → devis généré → bon de commande pièce → intervention planifiée → facture clôturée. Chaque transition manuelle = risque d'oubli.

### Impact

- `operations.service_requests` : ajouter `quote_id` FK pour lier le devis SAV
- V1 backlog : bouton "Créer un devis depuis ce SAV" dans ServiceRequestDetail
- V2 : statuts automatiques calculés (planification/réalisation/facturation)
- IA V3 : suggestion de diagnostic basée sur l'historique de l'installation

---

## 11. MOBILE

### Problème métier artisan

Yohan (poseur, PER003c) termine une mise en service. Il doit : valider l'installation, prendre des photos, faire signer le client, générer la facture de solde, changer la TVA (chantier neuf découvert = 20% au lieu de 5.5%), encaisser. Tout ça depuis son van, sans 4G parfaite.

### Données impliquées

```
Smartphone technicien terrain
  ↓
Compte-rendu intervention
  ↓
Photos attachées
  ↓
Signature client sur écran
  ↓
Modification TVA si neuf
  ↓
Facture solde générée
  ↓
Encaissement immédiat (CB, virement)
  ↓
Synchronisation back-office
```

### Décision OpenFire

Application mobile native iOS + Android. Toutes les fonctions disponibles hors-ligne. Modification TVA en 2 clics depuis l'intervention. Facture générée et envoyée depuis le mobile. Encaissement possible. Cerfa 15497 (certificat ramonage) remplissable depuis le mobile.

**Pourquoi ce choix ?** Le poseur terrain ne revient pas au bureau. S'il ne peut pas facturer sur place, la facture part 2 jours plus tard. Le client oublie les détails. La signature sur place évite les litiges.

### Décision LIGNIA

Interface web responsive. Pas d'application native. Pas de mode offline.

### Verdict : EN RETARD — limitation pour les poseurs terrain

Pour Arnaud (patron showroom) avec Amélie au bureau, le web responsive suffit. Pour Yohan sur un chantier avec un signal 4G instable, c'est insuffisant.

**Ce que LIGNIA peut faire sans app native** : PWA (Progressive Web App) avec service worker pour le mode offline basique. Lovable peut générer une PWA depuis l'interface existante. Ce n'est pas une app native mais c'est installable sur l'écran d'accueil du smartphone.

**Ce que LIGNIA ne fera pas en V1-V2** : mode offline complet. Le pilote 5 artisans peut fonctionner avec le web responsive.

### Leçon

OpenFire a raison sur le besoin terrain. Mais une app native = 6-12 mois de développement. La PWA est le compromis V2 raisonnable. L'investissement dans une vraie app native ne se justifie qu'après 50+ artisans actifs.

**Décision architecture IA** : la modification de TVA mobile révèle un besoin clé. L'IA pourrait suggérer automatiquement le bon taux TVA basé sur l'ancienneté du logement (si renseignée dans la visite technique). "Ce logement date de 1987, TVA applicable : 5.5%."

### Impact

- V2 : PWA avec manifest + service worker basique
- V2 : optimisation mobile de QuoteEditor et InterventionDetail
- V3 : application native si > 100 artisans actifs
- IA V2 : suggestion TVA automatique depuis les données visite technique

---

## 12. TVA

### Problème métier artisan

Sophie crée un devis pour Claire (particulier). Claire habite dans une maison de 1987. Le poêle = 5.5%. Les conduits Poujoulat = 5.5% (travaux induits). La pose = 5.5% (indissociable). Si la TVA est fausse, LIGNIA expose l'artisan à un redressement fiscal.

### Données impliquées

```
Ancienneté logement (>2 ans = taux réduit)
  ↓
Nature du travail (rénovation vs neuf)
  ↓
Type d'article (appareil, fumisterie, prestation)
  ↓
TVA ligne de devis (5.5 / 10 / 20)
  ↓
TVA facture (même taux)
  ↓
Attestation client TVA
  ↓
Déclaration TVA comptable
  ↓
Factur-X (code TVA normalisé)
```

### Décision OpenFire

Position fiscale : un objet qui mappe les taux de TVA selon le contexte du client (rénovation, neuf, intracommunautaire). L'artisan sélectionne la position fiscale au niveau du devis. Tous les articles héritent du taux de la position fiscale sauf si configuré différemment au niveau de l'article. Modification mobile du taux TVA possible en cours d'intervention.

**Pourquoi ce choix ?** La TVA dépend du contexte du chantier (rénovation vs neuf), pas du produit. Un même conduit Poujoulat est à 5.5% en rénovation et à 20% en neuf. OpenFire résout ça au niveau du devis avec la position fiscale.

### Décision LIGNIA

TVA portée par l'article dans `catalog_items.vat_rate`. Doctrine D-25 par famille. `suggestedVat()` comme fallback. `tva_context` prévu dans D-25 mais absent de la base. BUG-01 corrigé pour les appareils (5.5% au lieu de 20%).

**Problème critique identifié** : 16 529 articles Poujoulat ont `vat_rate=20` alors que la doctrine D-25 dit 5.5% pour les familles fumisterie éligibles. La migration n'a pas encore été validée par Thomas.

### Verdict : MODIFIER — décision hybride nécessaire

OpenFire a raison sur le principe : le taux TVA dépend du contexte chantier, pas seulement du produit. Le `tva_context` au niveau projet est la bonne solution.

LIGNIA a raison sur un point : avoir un taux par défaut dans l'article permet à l'artisan de ne pas avoir à configurer chaque chantier manuellement. Les deux ne sont pas incompatibles.

### Leçon

La solution optimale est la combinaison : taux suggéré dans l'article (valeur par défaut) + `tva_context` au niveau projet (surcharge si chantier neuf). L'artisan coche "Ce chantier est en rénovation" et tous les taux s'ajustent. Pour les exceptions, il peut modifier ligne par ligne.

**Conséquence Factur-X** : la TVA française a des codes normalisés (S pour standard, AE pour autoliquidation, Z pour exonéré). LIGNIA stocke 5.5/10/20 — il faudra un mapping vers les codes Factur-X pour 2027.

### Impact

- `billing.quotes.tva_context` : migration V1.5 — champ TEXT obligatoire avant Factur-X
- `catalog.catalog_items.vat_rate` Poujoulat : migration après validation Thomas
- V3 : mapping TVA → codes Factur-X (`S`, `AE`, `Z`)
- Attestation client : à documenter dans les user stories V2

---

## 13. PLANNING

### Problème métier artisan

Amélie (secrétaire showroom) doit coordonner Yohan et Felicien sur 8 chantiers cette semaine. Elle a besoin de voir visuellement qui fait quoi, quand, où. Sans planning, elle gère ça dans sa tête ou dans Excel.

### Données impliquées

```
Techniciens (Yohan, Felicien)
  ↓
Interventions planifiées
  ↓
Durées estimées
  ↓
Localisations (adresses chantiers)
  ↓
Disponibilités (congés, absences)
  ↓
Optimisation tournées (si géolocalisation)
```

### Décision OpenFire

Planning calendrier multi-vues (jour/semaine/mois/liste/carte). Vues par technicien. Drag & drop pour réassigner. Optimisation automatique des tournées. Prise de RDV en ligne. Recherche de créneaux disponibles. Gestion des horaires techniciens. Couleurs par type d'intervention.

**Pourquoi ce choix ?** Le planning est la fonctionnalité #1 des logiciels d'intervention. Sans elle, une entreprise avec 2+ techniciens ne peut pas fonctionner.

### Décision LIGNIA

`Planning.tsx` = 679 octets. Stub vide. Route `/planning` active mais sans contenu.

### Verdict : EN RETARD — lacune critique pour les structures multi-techniciens

Pour Thierry (artisan solo), l'absence de planning est acceptable — il planifie dans sa tête. Pour Arnaud (showroom avec Yohan et Felicien), c'est un blocage réel.

**Ce que LIGNIA peut construire rapidement** : une vue semaine par technicien avec les interventions existantes (`operations.interventions` a `start_datetime`, `end_datetime`, `assigned_to`). Pas d'optimisation de tournées, pas de drag & drop — juste l'affichage. 1 ticket Lovable.

### Leçon

OpenFire sur-investit dans le planning (optimisation, tournées, carte). LIGNIA doit construire le minimum viable : voir qui fait quoi cette semaine. L'optimisation viendra si le besoin est confirmé par les artisans pilotes.

### Impact

- `operations.interventions` : colonnes `start_datetime`, `assigned_to`, `status` suffisantes pour une vue semaine
- V1/V2 backlog : vue semaine simple par technicien
- V3 : optimisation tournées depuis les adresses d'installation
- IA V3 : suggestion automatique du meilleur technicien selon ses compétences et sa localisation

---

## 14. SYNTHÈSE — CE QUE LIGNIA CONSERVE, DÉPASSE, ABANDONNE

### DÉCISIONS À CONSERVER DÉFINITIVEMENT

| Décision | Pourquoi garder | Source |
|---|---|---|
| Catalogue central SaaS temps réel | Architecture multi-tenant supérieure à l'import local Odoo | D-09, INVARIANT 1 |
| Acompte automatique à la signature | Zéro oubli, zéro clic | sign_quote_and_initialize |
| Snapshot immuable quote_lines | Protection contractuelle et légale | INVARIANT 4 |
| Séparation CRM / comptabilité | LIGNIA exporte, Pennylane comptabilise | Décision architecturale fondatrice |
| Remises calculées automatiquement | Supérieur à l'application manuelle OpenFire | resolve_item_price |
| Relevé technique DTU spécialisé | Unique sur le marché, valeur différenciante | core.technical_surveys |
| Parc installé comme actif stratégique | Historique 15 ans, base pour IA | core.installations |

### DÉCISIONS À DÉPASSER (LIGNIA peut faire mieux)

| Décision OpenFire | Ce que LIGNIA peut faire mieux | Horizon |
|---|---|---|
| Import local à la demande | Catalogue central avec alerte "tarif mis à jour" | V2 |
| Push panier vers site fournisseur | API directe ou push email automatique | V2 |
| Bundle = composants liés | Bundle + détail composants pour BDC automatique | V2 |
| Modification TVA manuelle mobile | Suggestion IA basée sur ancienneté logement | V3 |
| Contrat maintenance manuel | Contrats avec DI automatiques + optimisation planning | V2 |
| Vue Kanban SAV | Statuts calculés automatiquement + suggestions IA | V2 |

### DÉCISIONS À ABANDONNER

| Décision OpenFire | Raison d'abandon LIGNIA | Décision |
|---|---|---|
| Comptabilité intégrée (grand livre, journaux) | Délégué à Pennylane/Sage | JAMAIS |
| Gestion de stock complète (inventaire, valorisation) | Artisans bois énergie = commande à la contremarque | JAMAIS |
| Rapprochement bancaire | Délégué au logiciel comptable | JAMAIS |
| Import local de catalogue | Incompatible avec architecture SaaS multi-tenant | JAMAIS |

### DÉCISIONS UNIQUEMENT LIGNIA (absentes d'OpenFire)

| Innovation LIGNIA | Valeur |
|---|---|
| Référentiel ADEME (1 516 appareils Flamme Verte) | MaPrimeRénov directement dans le devis |
| Moteur AI (`ai.interactions`) anticipé | voice_match, quote_suggest, dtu_assist |
| DTU compliance checking (ENUM dtu_result : pass/warn/fail) | Conformité EN13384 intégrée |
| Traçabilité `heating_appliance_id` → installation | Garanties calculées à la mise en service |
| `tva_context` doctrine D-25 | Seul logiciel avec TVA 5.5% fumisterie par défaut |

---

## OBLIGATIONS LÉGALES IDENTIFIÉES (non négociables)

Ces éléments ne sont pas des fonctionnalités — ce sont des obligations légales françaises.

| Obligation | Source légale | Statut LIGNIA | Priorité |
|---|---|---|---|
| Date de validité du devis | Art. L.441-1 Code commerce | ❌ Absent | **V1** |
| Numérotation séquentielle sans trou | Art. 242 nonies A CGI | ✅ Trigger actif | ✅ |
| SIRET sur la facture | Art. 242 nonies A CGI | ❌ `immat_number` absent | V2 |
| Mentions TVA par taux sur facture | Art. 289 CGI | ⚠️ Partiellement | V2 |
| Impossibilité d'antidater une facture | Art. 289 CGI | ❌ Absent | V2 |
| Attestation TVA réduite (>300€ TTC) | BOI-TVA-LIQ-30-20-90-20 | ❌ Absent | V2 |
| Factur-X (obligation 2027 PME) | Ordonnance 2019-359 | ⚠️ Colonnes anticipées | V3 |

---

*LIGNIA DESIGN DOCTRINE — v1.0*
*27 juin 2026 — Claude Analytics*
*Sources : OpenFire 10 pages + GitHub + Supabase + D-25 + USER_STORIES_V3*
*Prochain enrichissement : après retours pilote 5 artisans*
