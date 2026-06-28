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
> Auteur : Claude Analytics — 28 juin 2026
> Version : 1.2 — Ajout vision IA plateforme métier + règle produit 15-30 min
> Propriétaire : Thomas
> Ne pas modifier sans GO Thomas

---

## VISION FONDATRICE

> LIGNIA n'est pas un CRM auquel on ajoute de l'IA.
> C'est une plateforme métier dont toutes les données sont structurées
> pour permettre à l'IA d'apporter une vraie valeur.

La différence est fondamentale.

Dans le premier cas : on ajoute ChatGPT qui génère du texte générique.

Dans le second : on construit une architecture où l'IA devient progressivement
le meilleur compagnon de l'artisan — parce qu'elle opère sur des données métier
réelles, structurées, vérifiées.

**Ce que ça signifie concrètement pour LIGNIA :**

L'IA de LIGNIA n'est pas de la génération de texte.
C'est de la recherche technique assistée par IA.

Quand un artisan dit "un coude Apollo concentrique 150 noir" :
```
Voix
↓
Transcription (Whisper)
↓
Extraction métier (diamètre, angle, technologie, finition)
↓
search_quote_items_v2
↓
article exact dans le catalogue réel
↓
ajout au devis avec prix remisé
```

Ce moteur existe déjà. `search_quote_items_v2` gère le ranking sémantique,
les synonymes fumisterie ("chapeau chinois" → terminal), les diamètres, les angles,
les finitions. L'IA vocale est une couche de transcription au-dessus d'un moteur
métier déjà opérationnel.

---

## RÈGLE PRODUIT IA — NON NÉGOCIABLE

> Aucune fonctionnalité IA ne part en développement tant qu'elle
> n'économise pas au moins 15 à 30 minutes sur une tâche réelle
> d'un artisan réel.

> Aucune fonctionnalité "classique" n'est développée si elle ne sera
> pas ensuite exploitable par l'IA.

Ces deux règles forcent le produit et l'IA à avancer ensemble :
- Le produit reste utilisable sans IA.
- L'architecture prépare l'IA dès aujourd'hui.
- L'IA n'est jamais un gadget — elle est toujours au service d'un parcours métier déjà éprouvé.

**La roadmap IA n'est pas dictée par un calendrier.
Elle est dictée par la valeur observée chez les artisans pilotes.**

---

## AVERTISSEMENT ÉPISTÉMIQUE

Ce document contient des affirmations à trois niveaux de certitude différents.
Il est essentiel de les distinguer.

| Niveau | Symbole | Signification |
|---|---|---|
| Fait vérifié | ✓ | Prouvé par code, base, loi, ou source officielle |
| Hypothèse de conception | ◈ | Choix raisonné non encore validé par des utilisateurs réels |
| À valider au pilote | ⚑ | Décision provisoire — à corriger selon les retours terrain |

**Nous n'avons aujourd'hui ni utilisateurs actifs en production, ni statistiques d'usage, ni retours terrain structurés.** Toute affirmation de supériorité est une hypothèse de conception, pas une vérité. Le pilote 5 artisans est précisément conçu pour valider ou invalider ces hypothèses.

---

## COMMENT LIRE CE DOCUMENT

Pour chaque décision de conception :

1. **Problème métier** — le problème humain réel que la fonctionnalité résout
2. **Flux de données** — comment l'information circule du problème à la solution
3. **Décision OpenFire** — pourquoi OpenFire a fait ce choix (leur contrainte, leur contexte)
4. **Décision LIGNIA** — notre choix, ses fondements, son niveau de confiance
5. **Verdict** — CONSERVER / DÉPASSER / ABANDONNER avec justification
6. **Leçon** — ce que LIGNIA apprend, formulé comme hypothèse quand non prouvé
7. **Conséquences à long terme** — impact sur IA, facturation, fournisseurs, scalabilité
8. **Critères de validation pilote** — comment savoir si la décision était bonne

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
14. [Matrice d'impact transverse à long terme](#14-matrice-dimpact-transverse)
15. [Synthèse — Ce que LIGNIA conserve, dépasse, abandonne](#15-synthèse)
16. [Obligations légales non négociables](#16-obligations-légales)

---

## 1. ARCHITECTURE CATALOGUE

### Problème métier

Thierry (artisan solo) cherche "coude 150 Poujoulat" dans son logiciel.
Il doit trouver en 2 secondes, avec le bon prix, la bonne référence.
S'il ne trouve pas, il ouvre un fichier Excel ou téléphone à son fournisseur.
Chaque minute perdue = marge perdue.

### Flux de données

```
Fabricant (Poujoulat) met à jour ses tarifs
  ↓
Catalogue central
  ↓
Artisan cherche "coude 150"
  ↓ résultat avec prix net remisé
Ligne de devis insérée + snapshot prix + référence
  ↓
Bon de commande futur → référence brute transmise au fournisseur
  ↓
Historique article → données d'entraînement IA
```

### Décision OpenFire

Import local à la demande. Quand un artisan utilise un article pour la première fois, il s'importe dans SA base locale. Mise à jour tarifs = action manuelle "Mettre à jour mes produits".

**Pourquoi ce choix ?** ✓ OpenFire est construit sur Odoo, une architecture mono-instance par client. Chaque artisan a son propre serveur. La base locale est structurellement obligatoire. L'import à la demande évite d'importer 50 000 articles inutilement.

### Décision LIGNIA

◈ Catalogue central partagé, lecture temps réel, sans import local.
✓ 22 796 articles en base (`is_central=true`, `tenant_id=NULL`) — prouvé Supabase.
✓ `search_quote_items_v2` interroge directement la table centrale — prouvé code SHA 9e54452.
◈ Hypothèse : quand LIGNIA met à jour les tarifs Poujoulat, tous les tenants voient la mise à jour immédiatement sans action manuelle.

### Verdict : CONSERVER (✓ décision architecturale, ◈ avantages à valider)

✓ La contrainte Odoo explique le choix OpenFire — LIGNIA sans cette contrainte ne doit pas la reproduire. C'est un fait.

◈ Hypothèse de conception : "Le catalogue SaaS central réduira la maintenance et améliorera la cohérence des données comparé à l'import local."

⚑ À valider au pilote : les artisans trouvent-ils les articles plus vite qu'avec leur catalogue actuel (Excel, site fournisseur) ? La mise à jour centralisée des tarifs est-elle perçue comme un avantage ou une perte de contrôle ?

### Leçon

✓ OpenFire a résolu le problème de performance avec l'import local parce que son architecture l'y contraint. LIGNIA n'a pas cette contrainte.

◈ Manque identifié : OpenFire notifie si le fabricant a annoncé une mise à jour de prix imminente. LIGNIA devrait signaler sur le devis si les tarifs ont été mis à jour depuis la dernière utilisation de l'article.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Devis (maintenant) | ✓ Recherche fulltext sur 22 796 articles, résultats filtrés par fournisseurs actifs |
| BDC V2 | ◈ La `supplier_ref` doit être brute pour que le fournisseur la reconnaisse — problème avec préfixes `POU_` actuels |
| IA — quand le socle le permet | ◈ Le catalogue central est la base d'entraînement pour `quote_suggest` — plus il est propre et cohérent, meilleure sera l'IA |
| 500 tenants | ◈ Performance de `search_quote_items_v2` à tester avec N tenants simultanés — index PostgreSQL à surveiller |
| Marketplace future | ◈ Un catalogue central ouvre la possibilité d'une marketplace où Poujoulat publie directement ses nouveaux produits |

### Critères de validation pilote

- Thierry trouve son article en < 3 secondes ? (mesurer)
- Les artisans signalent-ils des articles manquants non présents dans le catalogue ?
- La mise à jour centrale des tarifs crée-t-elle des problèmes dans les devis en cours ?

---

## 2. CONDITIONS TARIFAIRES

### Problème métier

Arnaud (patron showroom) a négocié 30% de remise globale sur Poujoulat, mais 40% sur les accessoires. Il veut que Sophie (vendeuse) bénéficie automatiquement de ces remises sans avoir à les connaître.

### Flux de données

```
Accord commercial fournisseur
  ↓ remise par famille
Catalogue central (prix public)
  ↓ prix remisé calculé par resolve_item_price
Ligne de devis
  ↓ prix net artisan caché (cost_price)
  ↓ prix de vente client visible (unit_price_ht)
Marge visible = unit_price_ht - cost_price
  ↓
Export comptable → marge réelle par affaire
```

### Décision OpenFire

✓ 3 niveaux de remise : marque → catégorie → article. Formules libres avec variables (`ppht`, `pa`, transport, coefficient). L'artisan clique "Appliquer les règles" pour recalculer.

**Pourquoi ce choix ?** ✓ OpenFire cible des showrooms multi-marques avec des accords complexes. Un revendeur Jotul peut avoir des remises différentes par ligne, un coût de revient incluant le transport, et un coefficient de vente saisonnier.

### Décision LIGNIA

✓ 2 niveaux : fournisseur → famille de produit. Remise en pourcentage direct.
✓ Calcul automatique via `resolve_item_price` à chaque insertion — prouvé code.
◈ Hypothèse : pour le pilote 5 artisans bois énergie, 2 niveaux suffisent.

### Verdict : CONSERVER pour V1 (◈ hypothèse simplification), ENRICHIR en V2

◈ Hypothèse de conception : "La majorité des artisans bois énergie ont des remises simples (un taux global par fournisseur, peut-être par famille). La complexité d'OpenFire n'est pas nécessaire pour ce segment."

⚑ À valider au pilote : est-ce qu'Arnaud a besoin d'un 3e niveau (remise par article) ? A-t-il des accords spécifiques sur des produits précis ?

### Leçon

✓ `discount_pct` dans `quote_lines` est à 0 sur 107/107 lignes en base. La remise est invisible à l'artisan. OpenFire la montre par ligne. Amélie (secrétaire) a besoin de voir "Remise appliquée : 30%" pour vérifier que le système a bien fonctionné.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pilote V1 | ⚑ Si un artisan a des remises complexes, le modèle 2 niveaux bloque |
| Export Pennylane V2 | ◈ Le prix de revient net (`unit_cost_price`) doit être exporté pour le calcul de marge réelle |
| 500 tenants | ◈ Chaque tenant a ses remises — `tenant_supplier_discounts` isolé par RLS ✓ |
| IA — quand le socle le permet | ◈ L'IA pourrait suggérer des remises optimales basées sur l'historique des marges |

### Critères de validation pilote

- Les 5 artisans configurent-ils leurs remises en < 10 minutes ?
- Les prix insérés dans les devis correspondent-ils aux prix réels pratiqués avec les fournisseurs ?
- Un artisan demande-t-il un 3e niveau de remise ?

---

## 3. KITS ET OUVRAGES

### Problème métier

Sophie (vendeuse) crée souvent le même ensemble : poêle + conduit 6m + sortie toiture = "Raccordement granulés standard". Elle veut l'insérer en 1 clic dans chaque devis.

### Flux de données

```
Ensemble de lignes sauvegardé (nom + prix consolidé)
  ↓
Réinsertion dans devis futur
  ↓
BDC futur → quelles références commander ?
  ↓
Mise à jour prix composant → bundle périmé ?
```

### Décision OpenFire

✓ Kit = objet produit avec composants liés. Si le prix d'un composant change, le prix du kit se recalcule. La liaison composant→kit est maintenue en base.

**Pourquoi ce choix ?** ✓ OpenFire a la gestion de stock. Un kit stockable doit mettre à jour le stock de chaque composant à la vente. La liaison est nécessaire pour la logistique.

### Décision LIGNIA

✓ `save_lines_as_bundle` crée un article `product_type='service'` avec prix consolidé — prouvé SHA 17e85e8.
✓ Les composants originaux ne sont pas liés — confirmé architecture.
⚑ Réinsertion via onglet "Mes ouvrages" — à implémenter (BUG-03).

◈ Hypothèse : sans gestion de stock, la liaison composants n'est pas nécessaire pour V1.

### Verdict : ACCEPTABLE pour V1 (◈ hypothèse), LIMITÉ pour les BDC V2

◈ Hypothèse de conception : "Pour le pilote, la réutilisation d'un bundle comme ligne unique (prix consolidé) suffit. La désagrégation en composants pour les bons de commande peut attendre V2."

⚑ À valider au pilote : les artisans s'attendent-ils à ce que le bundle reflète les prix actuels des composants, ou acceptent-ils le prix figé au moment de la sauvegarde ?

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| BDC V2 | ◈ Pour commander les articles d'un bundle, il faudra retrouver les composants — LIGNIA devra stocker `bundle_lines` JSONB |
| Catalogue fournisseur | ◈ Si Poujoulat sort une nouvelle version d'un conduit, le bundle "Raccordement granulés" ne le signale pas |
| IA — quand le socle le permet | ◈ L'IA pourrait suggérer des bundles basés sur l'historique des devis précédents |

### Critères de validation pilote

- Les artisans réutilisent-ils les bundles ou refont-ils les lignes à chaque devis ?
- Se plaignent-ils de prix obsolètes dans les bundles ?

---

## 4. DEVIS

### Problème métier

Thierry doit produire un devis légalement valide, professionnel, envoyable par email, signable électroniquement, avec date de validité. En 15 minutes.

### Flux de données

```
Client + adresse
  ↓
Lignes produits + sections + notes + TVA
  ↓
Date expiration (mention légale)
  ↓
Signature électronique
  ↓
Snapshot immuable → bon de commande → acompte
  ↓
Facture → export comptable → Pennylane
```

### Décision OpenFire

✓ Devis ultra-complet : adresse facturation distincte, date expiration, liste de prix, position fiscale, conditions de paiement, étapes Kanban, envoi email avec PDF joint.

**Pourquoi ce choix ?** ✓ OpenFire cible des showrooms de 5-10 personnes avec des processus de validation, des clients récurrents avec des tarifs négociés, et une ADV qui pilote le suivi.

### Décision LIGNIA

✓ Fonctionnel : sections, sous-totaux, signature, PDF, lignes libres, remises.
✓ `expiry_date` ET `tva_context` existent dans `billing.quotes` — prouvé Supabase (97 devis tous remplis).
✓ Manque UX : expiry_date non exposée dans l'interface. tva_context non exposé dans l'interface.

◈ Hypothèse : les artisans bois énergie solo ou petites structures n'ont pas besoin de la richesse OpenFire pour commencer.

### Verdict : CORRECT sur la simplification (◈), EXPOSER ce qui existe déjà (✓)

✓ Fait : `expiry_date` et `tva_context` existent en base et sont remplis sur 97/97 devis. Ce ne sont pas des features à créer — ce sont des champs à exposer dans l'UI.

◈ Hypothèse : les fonctionnalités avancées d'OpenFire (Kanban, étapes, listes de prix par client) ne sont pas nécessaires pour des structures de 1-3 personnes.

⚑ À valider au pilote : les artisans demandent-ils l'envoi email depuis LIGNIA ou continuent-ils avec leur messagerie habituelle ?

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pennylane V2 | ◈ Le devis doit porter `tva_context` avant l'export pour que les taux soient corrects |
| Factur-X V3 | ◈ La position fiscale du devis doit se retrouver dans la facture puis dans le XML Factur-X |
| IA — quand le socle le permet | ◈ L'IA pourrait pré-remplir `tva_context` depuis les données de la visite technique |

### Critères de validation pilote

- Les artisans envoient-ils le PDF manuellement depuis leur messagerie ou demandent-ils l'envoi depuis LIGNIA ?
- Les artisans utilisent-ils la fonctionnalité de signature électronique ?

---

## 5. ACOMPTE

### Problème métier

Après la signature, Thierry a besoin d'une facture d'acompte. Si il l'oublie, il finance le stock sur ses fonds propres. Le client doit voir clairement que l'acompte sera déduit du total final.

### Flux de données

```
Devis signé
  ↓ déclenche acompte automatiquement (LIGNIA) ou manuellement (OpenFire)
Facture acompte créée
  ↓ envoyée au client
Paiement reçu
  ↓ déclenche commande fournisseur
Travaux réalisés
  ↓ facture solde = total - acompte déduit
  ↓
Export Pennylane → deux pièces liées
```

### Décision OpenFire

✓ Action manuelle après confirmation du bon de commande. L'artisan choisit le pourcentage ou le montant fixe. La ligne acompte dans la commande est protégée et déduite automatiquement de la facture solde.

**Pourquoi ce choix ?** ✓ Certains clients paient 30%, d'autres 50%. La décision est commerciale et variable selon l'accord avec le client.

### Décision LIGNIA

✓ `sign_quote_and_initialize` crée l'acompte automatiquement à la signature — prouvé code SHA 0e891fa.
✓ `invoice_kind='deposit'`, 3 factures en base — prouvé Supabase.
✓ `parent_invoice_id` absent de la facture solde — prouvé base (colonne existe, jamais remplie).

◈ Hypothèse : l'automatisation à la signature réduit les oublis et améliore le cash flow des artisans.

### Verdict : CONSERVER l'automatisation (◈ hypothèse), COMPLÉTER la déduction (✓ manque)

◈ Hypothèse de conception : "Automatiser l'acompte à la signature élimine un oubli fréquent et améliore le cash flow."

✓ Fait : `parent_invoice_id` n'est jamais rempli dans le code actuel. La déduction automatique de l'acompte dans la facture solde n'est pas implémentée. C'est un manque prouvé.

⚑ À valider au pilote : les artisans ont-ils tous le même pourcentage d'acompte, ou varient-ils selon le client ?

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pilote maintenant | ⚑ Si un artisan veut 50% au lieu du montant par défaut, il est bloqué |
| Facture solde V2 | ✓ `parent_invoice_id` doit être rempli pour la déduction automatique — manque prouvé |
| Pennylane V2 | ◈ L'acompte et le solde doivent être exportés comme deux pièces liées avec la même référence commande |
| Factur-X V3 | ◈ La norme Factur-X a une gestion spécifique des acomptes (champ `AdvancePayment`) |

### Critères de validation pilote

- Combien d'artisans utilisent un pourcentage d'acompte différent de celui par défaut ?
- L'artisan voit-il clairement que l'acompte sera déduit de la facture finale ?

---

## 6. FACTURE

### Problème métier

Sabrina (comptable) reçoit les factures. Elle a besoin d'un numéro unique séquentiel, d'une date légale, des montants HT/TVA/TTC, du SIRET client, des mentions obligatoires.

### Flux de données

```
Bon de commande validé
  ↓ lignes → invoice_lines
Numéro séquentiel sans trou (obligation légale)
  ↓
Date légale (pas antérieure à la dernière facture)
  ↓
SIRET client (obligatoire Factur-X)
  ↓
Export CSV → Pennylane / Sage
  ↓
Factur-X XML → Chorus Pro (2027)
```

### Décision OpenFire

✓ La facture est une pièce comptable native. Chaque ligne génère une écriture dans le grand livre. La facture ne peut pas être antidatée. États : Brouillon → Comptabilisée (immuable) → Annulée.

**Pourquoi ce choix ?** ✓ OpenFire intègre la comptabilité complète. La facture = pièce comptable est obligatoire dans cette architecture Odoo.

### Décision LIGNIA

✓ La facture est un document commercial, pas une pièce comptable.
✓ `billing.invoices` — `facturx_xml` et `einvoice_status` colonnes présentes mais vides — prouvé Supabase.
✓ 3 factures en base, toutes en `invoice_status='draft'` — prouvé Supabase.
◈ Hypothèse : la comptabilité déléguée à Pennylane est plus efficace qu'une comptabilité intégrée pour les artisans.

### Verdict : CONSERVER la séparation CRM/compta (◈ hypothèse stratégique), COMPLÉTER les garde-fous légaux (✓ manques)

◈ Hypothèse de conception : "Les artisans bois énergie ont déjà un comptable qui utilise Pennylane. Dupliquer la comptabilité dans LIGNIA crée de la confusion et de la re-saisie."

✓ Fait légal : impossibilité d'antidater une facture = obligation (Art. 289 CGI). Protection absente dans LIGNIA.

⚑ À valider au pilote : les comptables des artisans acceptent-ils un export CSV ou demandent-ils du Factur-X ?

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Légal maintenant | ✓ Pas de garde-fou antidatage — à implémenter V2 |
| Pennylane V2 | ◈ Format d'export CSV normalisé à définir avec Pennylane |
| Sage/Evoliz V2 | ◈ Formats différents par logiciel comptable — abstraction nécessaire |
| Chorus Pro V3 | ✓ Obligation légale 2027 PME — colonnes anticipées en base (`facturx_xml`) |
| SIRET V2 | ✓ Champ `siret` existe dans `core.customers` — à exposer dans l'UI |

### Critères de validation pilote

- Les comptables des artisans pilotes acceptent-ils le format d'export proposé ?
- Un artisan signale-t-il un problème de chronologie de facturation ?

---

## 7. COMMANDE FOURNISSEUR

### Problème métier

Après la signature, Thierry doit commander le poêle et les conduits chez Poujoulat. Il reprend le devis, identifie les articles, les recopie dans un email ou sur le site pro. 20 minutes de ressaisie par chantier.

### Flux de données

```
Devis signé
  ↓ lignes groupées par fournisseur
Bon de commande Poujoulat (supplier_ref brute + quantités)
  ↓ adresse livraison = chantier (drop shipping)
Confirmation Poujoulat
  ↓
Réception marchandise
  ↓
Installation planifiée
```

### Décision OpenFire

✓ BDC depuis le devis. 4 formats PDF. Connecteurs EDI (Poujoulat, Modinox...). Approbation managériale configurable. Livraison directe client disponible.

**Pourquoi ce choix ?** ✓ La commande fournisseur est le maillon manquant entre le devis et le chantier. C'est la douleur #1 des artisans multi-fournisseurs.

✓ Révélation : le "BDC sans prix" d'OpenFire est brillant — il permet de passer commande même si les tarifs en base ne sont pas à jour, sans exposer des prix potentiellement faux au fournisseur.

### Décision LIGNIA

✓ Tables présentes (`billing.purchase_orders`, `billing.purchase_order_lines`), RPC `create_purchase_order` existe — prouvé Supabase.
✓ `catalog.supplier_connectors` structuré (13 colonnes) — prouvé Supabase.
✓ 0 ligne en base, zéro front — prouvé.

◈ Hypothèse : l'architecture anticipée est correcte et suffisante pour implémenter le BDC en V2 sans refonte.

### Verdict : EN RETARD (✓ fait), ARCHITECTURE CORRECTE (◈ hypothèse)

✓ Fait : le module est absent de l'UX. Les artisans ressaisissent manuellement à chaque chantier.

✓ Fait bloquant : `supplier_ref` Poujoulat et KEMP contient des préfixes (`POU_conduit_150`, `KEMP_PEB120B`). Le fournisseur attend la référence brute. Une décision doit être prise avant d'implémenter les connecteurs.

◈ Estimation de valeur : 20 minutes × 3 chantiers/semaine × 50 semaines = 50 heures/an/artisan. À confirmer au pilote.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| V2 | ◈ BDC automatique depuis devis signé = argument de vente fort |
| supplier_ref | ✓ Préfixes existants = blocage technique — décision Thomas requise |
| Drop shipping | ◈ Poujoulat livre chez le client final — `delivery_address` = adresse installation |
| IA — quand le socle le permet | ◈ L'IA pourrait regrouper automatiquement les articles par fournisseur et optimiser la commande |

### Critères de validation pilote

- Combien de temps Thierry passe-t-il à ressaisir les commandes fournisseurs ?
- Quels fournisseurs sont prioritaires pour une intégration ?

---

## 8. CONNECTEURS FOURNISSEURS

### Problème métier

Thierry veut que ses 15 références Poujoulat apparaissent directement dans son espace pro Poujoulat depuis LIGNIA, sans retaper.

### Flux de données

```
BDC LIGNIA (supplier_ref + quantités)
  ↓
Connecteur (email structuré ou push panier web)
  ↓
Espace pro fournisseur (validation finale par Thierry)
  ↓
Confirmation commande → log dans supplier_order_logs
```

### Décision OpenFire

✓ "Push panier" web vers le site pro du fournisseur. Connecteurs actifs : Poujoulat, Modinox, Laudevco, Lorflex, Turbofonte. La validation finale reste sur le site fournisseur.

**Pourquoi ce choix ?** ✓ Le "push panier" est techniquement plus simple qu'un EDI complet. L'artisan garde le contrôle. Pas d'API bidirectionnelle à maintenir.

### Décision LIGNIA

✓ `catalog.supplier_connectors` avec `connector_type`, `order_email`, `api_endpoint`, `api_format`, `field_mapping` — prouvé Supabase.
✓ 0 ligne, zéro implémentation — prouvé.
◈ Hypothèse : commencer par le push email (plus simple) avant le push panier web.

### Verdict : ARCHITECTURE CORRECTE (◈), IMPLÉMENTATION MANQUANTE (✓)

◈ Hypothèse de conception : "Le push email (email formaté envoyé automatiquement au fournisseur) est plus simple à implémenter que le push panier web, et suffit pour commencer."

✓ Fait bloquant : `supplier_ref` préfixée. Doit être résolu avant toute implémentation connecteur.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| V2 | ◈ Push email Poujoulat = première intégration |
| supplier_ref | ✓ Préfixes = blocage — DECISION_LOG D-33 requis |
| Partenariat Poujoulat | ◈ Contact commercial nécessaire pour les spécifications d'API |
| IA — quand le socle le permet | ◈ L'IA pourrait envoyer automatiquement la commande après validation artisan |

---

## 9. CONTRATS DE MAINTENANCE

### Problème métier

Luc (ramoneur) a 200 clients avec un entretien annuel. Il doit planifier 200 interventions, envoyer 200 rappels, créer 200 factures. Sans système, il en oublie 30 = perte de 3 000€ de CA.

### Flux de données

```
Client + installation (appareil + ancienneté)
  ↓
Contrat (périodicité, fréquence, mois de visite)
  ↓
Rappel automatique N jours avant
  ↓
DI créée automatiquement
  ↓
RDV planifié → intervention réalisée
  ↓
Facture générée (à la prestation, après réalisation)
  ↓
Certificat de ramonage généré
  ↓
Prochaine DI créée automatiquement
```

### Décision OpenFire

✓ Deux modes : contrat simplifié et contrat avancé. Le contrat avancé orchestre facturation ET planification. Mode "à la prestation" : facture générée uniquement après réalisation — seul mode légalement sûr pour des prestations futures incertaines.

### Décision LIGNIA

✓ `core.installations.has_maintenance_contract` (booléen), `maintenance_contract_start/end` (dates) — prouvé Supabase.
✓ Zéro logique, zéro DI automatique, zéro facturation récurrente — prouvé.

◈ Hypothèse : le pilote 5 artisans peut fonctionner sans contrats de maintenance si les artisans sélectionnés ne sont pas des ramoneurs purs.

### Verdict : GAP STRATÉGIQUE MAJEUR (✓ pour les ramoneurs)

✓ Fait : Luc (PER002) ne peut pas utiliser LIGNIA pour son activité principale dans l'état actuel.

◈ Hypothèse de conception à confirmer : "Le module contrats de maintenance est V2 prioritaire pour le segment ramonage."

⚑ Question pilote : y a-t-il des ramoneurs dans les 5 artisans pilotes ? Si oui, le gap est bloquant dès V1.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pilote | ⚑ Bloquant si pilote inclut un ramoneur |
| V2 | ✓ Module contrats = priorité haute pour le segment ramonage |
| IA — quand le socle le permet | ◈ Cas d'usage parfait : "Luc, tes 200 interventions de ramonage sont à planifier en octobre-novembre selon l'historique. Voici un planning optimisé par géolocalisation." Valide la règle 15-30 min — c'est 2h/semaine économisées. |
| Cash flow | ◈ La facturation récurrente automatique améliore la prévisibilité du CA |

### Critères de validation pilote

- Y a-t-il des ramoneurs dans le pilote ?
- Comment gèrent-ils aujourd'hui leurs contrats d'entretien ?

---

## 10. SAV

### Problème métier

Michel appelle : son poêle ne démarre plus. Amélie doit : identifier l'installation de Michel, créer une DI SAV, qualifier la panne, devis pièces + MO, planifier Yohan, facturer.

### Flux de données

```
Appel client
  ↓ identification installation dans parc installé
DI SAV créée
  ↓ diagnostic → devis SAV (lien manquant dans LIGNIA)
Devis validé → commande pièce
  ↓ RDV planifié → intervention réalisée
Facture solde générée
```

### Décision OpenFire

✓ SAV = 3 flux (commercial + logistique + technique). Bouton "Générer devis" depuis la DI, pré-rempli avec client et installation. Vue Kanban. 3 statuts automatiques.

### Décision LIGNIA

✓ Module fonctionnel (`ServiceRequestCreate.tsx` 32Ko, `ServiceRequestDetail.tsx` 20Ko) — prouvé code.
✓ Manque : bouton "Créer un devis depuis ce SAV" — prouvé absent.
◈ Hypothèse : le module actuel suffit pour le pilote si les artisans n'ont pas de volumes SAV importants.

### Verdict : BON DÉBUT (✓), LIEN COMMERCIAL MANQUANT (✓)

✓ Fait : Amélie doit naviguer manuellement entre la DI SAV et la création du devis. OpenFire automatise cette transition.

◈ Hypothèse : la douleur est réelle mais acceptable pour le pilote si le volume SAV est < 5 par semaine par artisan.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| V1 pilote | ⚑ Volume SAV des artisans pilotes à mesurer |
| V2 | ◈ Bouton "Créer devis depuis SAV" = transition critique |
| IA — quand le socle le permet | ◈ L'IA pourrait suggérer un diagnostic basé sur l'historique de l'installation. Valide la règle 15-30 min si Amélie passe 20 min à identifier la panne manuellement. |

### Critères de validation pilote

- Combien d'interventions SAV par semaine pour chaque artisan ?
- Combien de temps pour créer un devis depuis une DI SAV manuellement ?

---

## 11. MOBILE

### Problème métier

Yohan (poseur) termine une mise en service. Il doit valider l'installation, faire signer le client, générer la facture de solde, changer la TVA si chantier neuf, encaisser. Depuis son van.

### Décision OpenFire

✓ Application mobile native iOS + Android. Toutes les fonctions disponibles hors-ligne. Modification TVA en 2 clics. Facture générée depuis le mobile.

### Décision LIGNIA

✓ Interface web responsive — pas d'application native, pas de mode offline.
◈ Hypothèse : pour le pilote 5 artisans, le web responsive suffit si les artisans ont une connexion 4G correcte.

### Verdict : EN RETARD pour le terrain (✓ fait), ACCEPTABLE pour le pilote (◈ hypothèse)

✓ Fait : pas d'application mobile native = limitation réelle pour les poseurs terrain.
◈ Hypothèse : le web responsive sur smartphone est suffisant pour les structures avec une secrétaire au bureau qui prend en charge le suivi administratif.

⚑ Question pilote : Yohan (les poseurs) utilisent-ils le logiciel sur le terrain, ou le suivi est-il fait par Amélie au bureau ?

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pilote | ⚑ À mesurer : utilisation terrain vs bureau |
| V2 | ◈ PWA (Progressive Web App) = compromis raisonnable sans développement natif |
| V3 | ◈ Application native si > 100 artisans actifs avec usage terrain confirmé |
| IA — quand le socle le permet | ◈ "Ce logement date de 1987" → IA suggère TVA 5.5% automatiquement. Valide la règle 15-30 min si l'artisan cherche le bon taux manuellement sur chaque chantier. |

### Critères de validation pilote

- Yohan et Felicien utilisent-ils le logiciel depuis leur smartphone sur le chantier ?
- Signalent-ils des problèmes de connectivité ou d'ergonomie mobile ?

---

## 12. TVA

### Problème métier

Sophie crée un devis pour Claire (maison de 1987 = taux réduit). Si la TVA est fausse, l'artisan est exposé à un redressement fiscal. Si elle est à 20% au lieu de 5.5%, le devis est 7% plus cher qu'un concurrent = perte commerciale.

### Flux de données

```
Ancienneté logement (>2 ans = taux réduit possible)
  ↓
Type d'article (appareil 5.5%, fumisterie 5.5%, entretien 10%)
  ↓
TVA ligne de devis
  ↓ snapshot immuable
TVA facture (héritée du devis)
  ↓
Attestation client TVA (obligation légale >300€ TTC)
  ↓
Export Pennylane (taux par ligne)
  ↓
Factur-X 2027 (codes TVA normalisés : S, AE, Z)
```

### Décision OpenFire

✓ Position fiscale : objet qui mappe les taux TVA selon le contexte du chantier. L'artisan sélectionne "rénovation" et tous les articles héritent du bon taux.

### Décision LIGNIA

✓ TVA portée par l'article dans `catalog_items.vat_rate` — prouvé Supabase.
✓ `tva_context = 'renovation_15ans'` sur 97/97 devis en base — prouvé Supabase.
✓ 16 529 articles Poujoulat à `vat_rate=20` alors que doctrine D-25 dit 5.5% pour fumisterie rénovation — prouvé Supabase. Migration non validée par Thomas.
✓ BUG-01 corrigé pour `addAppliance()` (5.5% au lieu de 20%) — prouvé commit 613122a.
◈ Hypothèse : `tva_context` au niveau projet + taux par défaut dans l'article = solution optimale.

### Verdict : APPROCHE HYBRIDE NÉCESSAIRE (✓ décision, ◈ paramétrage)

✓ Fait : la TVA dépend du contexte chantier, pas uniquement du produit (OpenFire a raison sur ce point).
✓ Fait : 16 529 articles Poujoulat avec vat_rate incorrect — migration décision Thomas.
✓ `tva_context` existe en base et est utilisé (97 devis). L'UI ne l'expose pas encore.

◈ Hypothèse de conception : "taux suggéré dans l'article + tva_context au niveau projet = le meilleur compromis entre simplicité et exactitude."

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Devis maintenant | ✓ TVA incorrecte Poujoulat = devis faux fiscalement |
| Attestation V2 | ✓ Document légal obligatoire >300€ TTC — absent de LIGNIA |
| Pennylane V2 | ◈ Les taux TVA doivent être exportés avec les codes comptables corrects |
| Factur-X V3 | ✓ Codes normalisés (S, AE, Z) — mapping depuis 5.5/10/20 requis |

### Critères de validation pilote

- Les artisans modifient-ils la TVA sur des lignes individuelles ?
- Identifient-ils des taux incorrects dans le catalogue Poujoulat ?

---

## 13. PLANNING

### Problème métier

Amélie doit coordonner Yohan et Felicien sur 8 chantiers cette semaine. Elle a besoin de voir visuellement qui fait quoi, quand, où.

### Décision OpenFire

✓ Planning calendrier multi-vues, drag & drop, optimisation des tournées, prise de RDV en ligne.

### Décision LIGNIA

✓ `Planning.tsx` = 679 octets, stub vide — prouvé code.
✓ `operations.interventions` a `start_datetime`, `end_datetime`, `assigned_to` — prouvé Supabase.
◈ Hypothèse : une vue semaine simple suffit pour le pilote.

### Verdict : GAP RÉEL (✓), MINIMUM VIABLE IDENTIFIÉ (◈)

✓ Fait : pas de planning = Amélie ne peut pas coordonner son équipe visuellement.
◈ Hypothèse : une vue semaine simple (sans drag & drop, sans optimisation) suffit pour les structures < 5 techniciens.

### Conséquences à long terme

| Horizon | Impact |
|---|---|
| Pilote | ⚑ Bloquant pour les structures avec 2+ techniciens |
| V2 | ◈ Vue semaine par technicien = minimum viable |
| V3 | ◈ Optimisation tournées + géolocalisation |
| IA — quand le socle le permet | ◈ Suggestion automatique du technicien selon compétences et localisation |

### Critères de validation pilote

- Amélie utilise-t-elle un autre outil pour coordonner l'équipe (Google Calendar, WhatsApp) ?
- La vue semaine suffit-elle ou demande-t-elle des fonctions avancées ?

---

## 14. MATRICE D'IMPACT TRANSVERSE À LONG TERME

Pour chaque décision majeure, les conséquences quand LIGNIA aura 500 tenants, une IA opérationnelle et des connecteurs comptables actifs.

| Décision | Impact IA | Impact Facturation/Compta | Impact Fournisseurs | Impact Scalabilité |
|---|---|---|---|---|
| Catalogue SaaS central | ◈ Base d'entraînement unifiée pour `quote_suggest` | ◈ Tarifs toujours à jour dans les exports | ✓ Tarifs synchronisés pour tous les tenants | ◈ N tenants lisent 1 catalogue — performance à monitorer |
| Snapshots immuables | ◈ Données historiques fiables pour l'IA | ✓ Cohérence devis → facture garantie | ✓ `supplier_ref` figé dans le snapshot | ✓ RLS protège chaque snapshot |
| Séparation CRM/compta | ◈ L'IA peut se concentrer sur le métier, pas la compta | ◈ Export CSV/Factur-X = interface avec Pennylane | 🚫 Pas de comptabilité achat | ✓ Moins de complexité = plus facile à scaler |
| Acompte auto signature | ◈ L'IA peut prédire le cash flow si les acomptes sont systématiques | ✓ `parent_invoice_id` requis pour déduction solde | 🚫 Sans lien commande fournisseur | ◈ Pattern reproductible pour tous les tenants |
| Bundle sans composants | ◈ L'IA ne peut pas suggérer les composants à commander | ◈ Impossible de décomposer en lignes pour l'export | ✓ Références brutes non retrouvables pour BDC | ◈ Risque de bundles périmés à grande échelle |
| supplier_ref préfixée | ◈ L'IA confond références LIGNIA et références fournisseur | 🚫 Impact nul sur comptabilité | ✓ Bloque tous les connecteurs fournisseurs | ◈ Dette à résoudre avant toute croissance commande |
| Contrats maintenance absents | ◈ L'IA ne peut pas prédire les interventions récurrentes | ◈ Aucune facturation récurrente automatique | 🚫 | ◈ Segment ramonage inaccessible à l'échelle |
| TVA dans l'article | ◈ L'IA doit connaître le contexte chantier pour suggérer le bon taux | ✓ Taux par ligne dans l'export — compatible Pennylane | 🚫 | ◈ Migration Poujoulat requise avant scaling |

---

## 15. SYNTHÈSE — CE QUE LIGNIA CONSERVE, DÉPASSE, ABANDONNE

### DÉCISIONS À CONSERVER — avec niveau de confiance

| Décision | Confiance | Preuve |
|---|---|---|
| Catalogue central SaaS temps réel | ◈ Hypothèse forte, non prouvée en production | Architecture validée, usage à confirmer |
| Snapshot immuable `quote_lines` | ✓ Décision légale et contractuelle | INVARIANT 4, droit des contrats |
| Séparation CRM / comptabilité | ◈ Hypothèse stratégique | Décision architecturale fondatrice |
| Acompte automatique à la signature | ◈ Hypothèse UX | Non testé avec artisans réels |
| Remises calculées automatiquement | ◈ Hypothèse simplicité vs flexibilité | SupplierDiscounts.tsx fonctionnel |
| Relevé technique DTU spécialisé | ✓ Différenciant prouvé — OpenFire n'a pas ça | `core.technical_surveys` 133 colonnes |
| Parc installé comme actif stratégique | ◈ Hypothèse valeur long terme | Architecture correcte |

### DÉCISIONS À DÉPASSER — avec condition

| Décision OpenFire | Ce que LIGNIA vise | Condition |
|---|---|---|
| Import local à la demande | Catalogue central avec alerte "tarif mis à jour" | ◈ Si la performance tient à 500 tenants |
| Push panier vers site fournisseur | Push email automatique puis API directe | ✓ Après résolution des préfixes supplier_ref |
| Bundle = composants liés | Bundle + composants JSONB pour BDC | ◈ Quand les BDC seront implémentés |
| Modification TVA manuelle | Suggestion IA basée sur visite technique | ◈ Quand l'IA aura validé la règle 15-30 min |
| Contrat maintenance manuel | DI automatiques + planning optimisé | ◈ V2 — segment ramonage |

### DÉCISIONS À ABANDONNER — définitives

| Décision OpenFire | Raison | Certitude |
|---|---|---|
| Comptabilité intégrée | Délégué à Pennylane/Sage | ✓ Décision architecturale fondatrice |
| Gestion de stock complète | Artisans bois énergie = contremarque | ✓ Confirmé par les cas d'usage |
| Rapprochement bancaire | Délégué au logiciel comptable | ✓ |
| Import local de catalogue | Incompatible avec architecture SaaS | ✓ |

### INNOVATIONS UNIQUEMENT LIGNIA

| Innovation | Statut | Valeur si validée |
|---|---|---|
| Référentiel ADEME 1 516 appareils Flamme Verte | ✓ Prouvé en base | MaPrimeRénov directement dans le devis |
| Moteur IA `ai.interactions` anticipé | ◈ Schéma présent, 0 usage | voice_match, quote_suggest, dtu_assist |
| DTU compliance (ENUM `dtu_result`) | ✓ Prouvé en base | Conformité EN13384 automatique |
| Traçabilité `heating_appliance_id` → installation | ◈ Colonne présente, UI absente | Garanties auto-calculées |
| Doctrine TVA D-25 par famille | ✓ Document + code | Seul logiciel avec TVA 5.5% fumisterie par défaut |
| search_quote_items_v2 avec ranking sémantique | ✓ Moteur prouvé, actif | Base de l'IA vocale — déjà opérationnel |

---

## 16. OBLIGATIONS LÉGALES NON NÉGOCIABLES

Ces éléments ne sont pas des fonctionnalités — ce sont des obligations légales françaises vérifiées.

| Obligation | Source légale | Statut LIGNIA | Priorité |
|---|---|---|---|
| Date de validité du devis | Art. L.441-1 Code de commerce | ✓ `expiry_date` existe en base, non exposé dans UI | **Exposer dans l'UI** |
| Numérotation séquentielle sans trou | Art. 242 nonies A CGI | ✓ Trigger `t2_set_invoice_number` actif | ✅ Couvert |
| SIRET sur la facture | Art. 242 nonies A CGI | ✓ `siret` existe dans `core.customers`, non exposé | Exposer dans l'UI |
| Mentions TVA par taux sur facture | Art. 289 CGI | ⚠️ Partiellement — UI incomplète | V2 |
| Impossibilité d'antidater une facture | Art. 289 CGI | ✓ Garde-fou ABSENT | V2 |
| Attestation TVA réduite (>300€ TTC) | BOI-TVA-LIQ-30-20-90-20 | ✓ ABSENTE | V2 |
| Factur-X PME (2027) | Ordonnance 2019-359 | ⚠️ Colonnes anticipées, 0 implémentation | V3 |

---

*LIGNIA DESIGN DOCTRINE — v1.2*
*28 juin 2026 — Claude Analytics*
*v1.1 : hypothèses explicites + niveaux de confiance + impacts transverses (corrections OpenAI)*
*v1.2 : vision IA plateforme métier + règle produit 15-30 min (OpenAI) + corrections factuelles (expiry_date, tva_context, siret existent déjà)*
*Sources : OpenFire 10 pages + GitHub + Supabase + D-25 + USER_STORIES_V3*
*Prochain enrichissement : après retours pilote 5 artisans*
