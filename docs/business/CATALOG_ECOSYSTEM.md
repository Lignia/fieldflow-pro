# Référentiel stratégique LIGNIA — Acteurs du marché fumisterie et bois énergie

> **Statut : document métier de référence vivant.**
> Reflète la connaissance terrain au moment de sa rédaction.
> Sera mis à jour au fil des intégrations fournisseurs.
> Ce n'est pas un modèle SQL ni une spécification technique.
>
> Ce document décrit les acteurs du marché externe.
> Il ne décrit pas les objets métier internes de LIGNIA.
> Pour cela, voir `docs/business/LIGNIA_OBJECT_MODEL.md`.
> Pour le cycle commercial, voir `docs/business/LIGNIA_LIFECYCLE.md`.

---

## Objectif

Distinguer les différents rôles des acteurs du marché de la fumisterie
et du bois énergie afin d'éviter les erreurs de modélisation dans LIGNIA.

Un même acteur peut :
- fabriquer ses propres produits
- distribuer des produits tiers
- apparaître dans plusieurs catalogues
- être utilisé comme fournisseur d'achat par l'artisan

Ces rôles ne doivent jamais être confondus.

---

## Définitions clés

| Concept | Définition |
|---|---|
| Fabricant | Entreprise qui conçoit et produit réellement le produit |
| Marque | Nom commercial visible sur le marché (peut différer du fabricant) |
| Importateur | Société qui assure l'importation et le support national d'une marque étrangère |
| Distributeur spécialisé | Entreprise qui revend plusieurs marques sans fabriquer, dans un secteur donné |
| Distributeur généraliste | Négociant multi-secteurs (chauffage, sanitaire, plomberie...) |
| Réseau / Franchise | Ensemble de revendeurs agréés animé par un fabricant ou une marque |
| Fournisseur | Point d'achat réellement utilisé par l'artisan |
| Produit logique | Produit métier indépendant du fournisseur (ex : coude 45° Ø150) |
| Référence fabricant | Référence officielle du fabricant |
| Référence fournisseur | Référence utilisée pour commander chez ce fournisseur |
| Canal d'approvisionnement | Voie par laquelle l'artisan achète : direct, distributeur spécialisé, réseau, généraliste |

> Un même produit logique peut avoir une référence fabricant différente
> de la référence fournisseur. LIGNIA gère les deux niveaux.

> **Règle LIGNIA — domaine produit :**
> Le domaine produit est un attribut de l'**article**, pas du fournisseur.
> Un même fournisseur peut avoir des articles dans plusieurs domaines
> selon la nature de chaque article de son catalogue.

---

## Fabricants fumisterie

| Acteur | Fabricant | Vente directe pros | Via distributeurs | Distribue produits tiers | Particularités |
|---|---|---|---|---|---|
| Poujoulat | Oui | Oui | Oui | Oui (Kemp dans certains catalogues) | Leader français du marché |
| Joncoux | Oui | Oui | Oui (Lorflex, autres) | Oui (Kemp dans certains catalogues) | Fabricant historique français |
| Tubest | Oui | Oui | Oui | Oui (Kemp dans certains catalogues) | Très présent en tubage et rénovation |
| Modinox | Oui | Oui | Oui | Oui (Kemp dans certains catalogues) | Fabricant technique haut de gamme |
| Dinak | Oui | Oui | Oui | Non identifié à ce jour | Fabricant espagnol très présent en France |
| Bofill | Oui | Oui | Limité | Non identifié à ce jour | Modèle de distribution plus direct |
| Jeremias | Oui | Partiellement | Oui | Non identifié à ce jour | Forte présence via distributeurs |
| TEN | Oui | Oui | Oui | Non identifié à ce jour | Fabricant accessoires et tôlerie |

---

## Fabricants appareils bois énergie

> **Cette section est indicative.**
> Les modèles de distribution varient selon les marchés, les périodes
> et les accords commerciaux en vigueur.
> Ces informations doivent être vérifiées fournisseur par fournisseur
> avant toute intégration dans LIGNIA.
> En cas de doute, la valeur par défaut est : vente via réseau agréé.

| Acteur | Origine | Canal dominant connu | Particularités |
|---|---|---|---|
| MCZ | Italie | Réseau revendeurs agréés | Présence forte en France via réseau |
| Jøtul | Norvège | Via importateur + réseau | Programme Jøtul Partner en France |
| Edilkamin | Italie | Réseau revendeurs agréés | — |
| Palazzetti | Italie | Réseau revendeurs agréés | — |
| Rika | Autriche | Via importateur + réseau | — |
| Austroflamm | Autriche | Via importateur + réseau | — |
| Invicta | France | Direct + réseau | Fabricant français historique |
| Charnwood | Royaume-Uni | Via importateur + réseau | — |

La chaîne type pour les appareils importés est souvent :
```
Fabricant étranger
  ↓
Importateur national
  ↓
Réseau revendeurs agréés
  ↓
Artisan installateur
```
Le même appareil peut avoir une référence fabricant ET une référence importateur.

---

## Réseaux et franchises bois énergie

Ces acteurs animent un réseau de revendeurs ou d'installateurs agréés
autour d'une marque ou d'un concept commercial.
Ils ne sont ni fabricants au sens strict, ni distributeurs classiques.

| Réseau / Franchise | Modèle | Particularités |
|---|---|---|
| Turbo Fonte | Réseau de revendeurs spécialisés | Présence nationale, mix poêles et accessoires |
| Flammes du Monde | Réseau de revendeurs spécialisés | Positionnement showroom et conseil |
| Brisach | Fabricant + réseau agréé | Marque française, poêles et cheminées |
| Asgard | Réseau de revendeurs | Positionnement haut de gamme |
| Iceberg | Réseau de revendeurs | Spécialisation poêles à granulés |
| Jøtul Partner | Programme fabricant | Réseau officiel Jøtul en France |
| Seguin Premium | Fabricant + réseau agréé | Fabricant français, cheminées et poêles |

> Les membres d'un réseau peuvent bénéficier de conditions commerciales spécifiques.
> Le mode de gestion de ces conditions dans LIGNIA sera défini ultérieurement.

---

## Acteurs transversaux

Ces acteurs ne sont pas principalement fabricants de conduits complets
mais leurs produits apparaissent dans de nombreux catalogues.

| Acteur | Activité principale | Domaines produits concernés |
|---|---|---|
| Kemp | Accessoires techniques, arrivées d'air, ventilation | Fumisterie, Pièces détachées |
| Progalva | Ramonage, entretien, accessoires SAV | Fumisterie, Prestation, Pièces détachées |
| Wöhler | Diagnostic combustion et instrumentation | Pièces détachées |

---

## Cas particulier : Dixneuf

Dixneuf ne doit pas être modélisé comme un simple fabricant.
C'est un acteur hybride qui peut être simultanément fabricant,
distributeur, fournisseur et acteur habitat.

| Activité | Présence |
|---|---|
| Fabrication de produits propres | Oui |
| Distribution de produits tiers | Oui |
| Accessoires habitat et poêle | Oui |
| Distribution de certaines gammes Jeremias | Oui |
| Distribution de certaines gammes Poujoulat | Oui selon marchés |

---

## Distributeurs spécialisés bois énergie

Ces acteurs ne sont généralement pas fabricants.
Ils servent de canal d'approvisionnement spécialisé pour les artisans.

| Acteur | Rôle principal | Particularités |
|---|---|---|
| Lorflex | Distribution spécialisée fumisterie et bois énergie | Acteur majeur du marché français |
| Sodico | Distribution spécialisée fumisterie | Très présent chez les indépendants |
| Distri Flam | Distribution bois énergie | Couverture régionale importante |
| CDRF | Distribution chauffage bois | Présence spécialisée selon les régions |

---

## Distributeurs généralistes

Ces acteurs couvrent plusieurs secteurs (chauffage, sanitaire, plomberie...).
Ils ne sont pas la cible principale de LIGNIA en V1 mais font partie
de l'écosystème d'approvisionnement de certains artisans.

| Acteur | Secteurs couverts |
|---|---|
| Richardson | Chauffage, sanitaire, plomberie |
| Téréva | Chauffage, sanitaire, ventilation |
| CEDEO | Sanitaire, chauffage, plomberie |
| Brossette | Sanitaire, chauffage, plomberie |
| Sider | Acier, quincaillerie, matériaux |

---

## Exemple — multi-canal d'approvisionnement

**Produit logique :** Coude 45° isolé Ø150
**Fabricant :** Poujoulat
**Référence fabricant :** 450150TI

| Canal | Fournisseur | Référence fournisseur |
|---|---|---|
| Direct fabricant | Poujoulat | 450150TI |
| Via distributeur spécialisé A | Lorflex | *(exemple conceptuel — à vérifier dans le CSV)* |
| Via distributeur spécialisé B | Sodico | *(exemple conceptuel — à vérifier dans le CSV)* |

> Les vraies références distributeurs sont dans les fichiers CSV fournisseurs.
> Elles sont importées via les scripts d'import, jamais saisies manuellement.

Le produit est identique. Les remises, délais, franco et conditions commerciales
varient selon le fournisseur utilisé.

---

## Règle d'or LIGNIA

Un même produit peut être fabriqué par une entreprise, distribué par
plusieurs acteurs, commandé via différents fournisseurs selon l'artisan,
installé par une entreprise et entretenu par une autre.

LIGNIA doit représenter simultanément ces réalités sans les confondre.
