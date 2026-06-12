# POUJOULAT — Matrice item_family V1

> Statut : OFFICIEL — figé juin 2026. Source de données pour Claude Exec (implémentation `map_supplier.py`).
> Source : `of_seller_product_category_name` du CSV Poujoulat (16 529 lignes, 127 catégories, 100 % renseigné).
> Cible : 13 valeurs `item_family` du CHECK `catalog_items_item_family_check`.
> Méthode : voir suppliers/SUPPLIER_MAPPING_STRATEGY_V1.md (Niveau C-2). Séquence : CATALOG_EXECUTION_PLAN_V1_FINAL.md.
> Décisions sources : D-31 (product_type axe universel), D-32 (item_family conditionnel fumisterie).

---

## Préambule — provenance des données

Les 127 catégories de cette matrice proviennent **directement de la colonne
`of_seller_product_category_name` du CSV source Poujoulat** (fichiers `poujoulat.csv` et
`poujoulat_product_template` en CSV et XLS, 16 529 lignes), et **non** d'une donnée déjà
transformée en base. C'est une taxonomie fournisseur native, lue à la source, à 100 %
renseignée. La matrice ci-dessous est donc directement applicable à un réimport frais depuis le
CSV, sans dépendre de l'état actuel de `catalog_items`.

## Principe

La catégorie encode la **gamme commerciale Poujoulat** (préfixe) + un sous-type (suffixe). Le
mapping vise la famille fonctionnelle dominante de la gamme. Clé du mapping :
`of_seller_product_category_name` (PAS le libellé `name`). Couverture : **100 % des 16 529
lignes, sans résidu NULL**.

**Dans les fichiers Poujoulat audités pour V1, aucun appareil n'a été identifié.** Cette
observation porte sur le corpus audité, pas sur l'ensemble du catalogue fournisseur. Sur ce
corpus, tous les articles relèvent de `product_type='part'` (fumisterie physique) ou
`consumable` (consommables explicites). La matrice ci-dessous alimente donc `item_family` pour
100 % des lignes du corpus, conformément à D-32 (obligatoire pour la fumisterie).

**Catégorie inconnue (hors matrice) : pas de repli silencieux.** Conformément à la règle P-00
(plan d'exécution) : stop de l'item + `data_quality_status='needs_review'`, import bloqué
jusqu'à arbitrage, + rapport obligatoire. Toute extension de gamme passe par une mise à jour
explicite de cette matrice.

## Arbitrages figés (rappel des décisions humaines)

- `manufacturer_name` : statique « Poujoulat ». Jamais déduit par parsing.
- `supplier_range` : source explicite ou NULL. N'est PAS inféré depuis le préfixe de catégorie.
  Les préfixes (THRM, ST.., DUAL…) servent uniquement de justification de mapping `item_family`,
  pas à peupler `supplier_range`.
- `product_type` : `part` par défaut pour la fumisterie physique ; `consumable` réservé aux
  catégories explicitement consommables (peinture, consommables de ramonage). Voir tableau.

## Niveaux de confiance

- **ÉLEVÉE** : préfixe de gamme univoque + exemples convergents.
- **MOYENNE** : gamme claire mais pièces de fonctions mixtes (raffinement par mot-clé sur `name`
  possible ultérieurement ; non bloquant V1).
- **FAIBLE** : catégorie fourre-tout, ambiguë, ou exemple contredisant le préfixe → mapping
  raisonné, à surveiller.

---

## A. sortie_toiture — gamme ST.. (Sortie de Toit)

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| ST../TCP | 1279 | sortie_toiture | ÉLEVÉE | Chapeaux traditionnels terre cuite | CHAPEAU TRADITIONNEL-CR BLA CASS |
| ST../STI | 496 | sortie_toiture | ÉLEVÉE | Sorties inox | SORTIE INOX 0à120G 130TZ H1160 |
| ST../OPTI | 256 | sortie_toiture | ÉLEVÉE | Chapeaux gamme Optimale | CHAPEAU KIT DESIGN OPTIMALE |
| ST../TRP | 233 | sortie_toiture | ÉLEVÉE | Chapeaux traditionnels crépi | CHAPEAU TRADITIONNEL CREPI USR |
| ST../LUM | 103 | sortie_toiture | ÉLEVÉE | Chapeaux France Design | CHAPEAU FRANCE DESIGN STC |
| ST../STB | 60 | sortie_toiture | ÉLEVÉE | Sortie toit STB | S T B 100-150 PGI |
| ST../STF | 44 | sortie_toiture | ÉLEVÉE | Sortie toit STF | S T F 100 ZI |
| ST../STP | 62 | sortie_toiture | MOYENNE | Embases d'étanchéité de sortie | EMBASE D'ETANCHEITE PROVENCE |
| ST../STVR | 23 | sortie_toiture | ÉLEVÉE | Sortie STMP Noirmoutier | STMP 230 NOIRMOUTIER |
| ST../STBP | 21 | sortie_toiture | ÉLEVÉE | Sortie STBP | S T B P 150 ZI DROITE |
| ST../STDC | 17 | sortie_toiture | MOYENNE | Embase d'étanchéité | EMBASE D'ETANCHEITE à 111% |
| ST../STL | 16 | sortie_toiture | ÉLEVÉE | Sortie Languedoc | S T 150 H:1450 LANGUEDOC |
| ST../STPS | 15 | sortie_toiture | ÉLEVÉE | Sortie "S" Provence | ST "S" 100/150 PGI PROVENCE |
| ST../STVF | 7 | sortie_toiture | ÉLEVÉE | Sortie Vendée faîtage | ST VENDEE 150 FAITAGE + KIT |
| ST../ST | 22 | sortie_toiture | MOYENNE | Embase étanchéité ST | EMBASE D'ETANCHEITE 68,1à70,8 |
| ST../STRP | 9 | sortie_toiture | MOYENNE | Embase étanchéité | EMBASE D'ETANCHEITE à 20% |
| ST../SHP | 29 | sortie_toiture | MOYENNE | Embase multi ardoise | EMBASE MULT ARDOISE 40à100% |
| ST.. (seul) | 101 | sortie_toiture | FAIBLE | Bandeaux décor de sortie — raffinement name conseillé | BANDEAU 1 RG BRIQ. STRP - USR |
| ST../AUC | 4 | sortie_toiture | MOYENNE | Kit France Classique ST | KIT FRANCE CLASSIQUE ST CARRE |

**Sous-catégories ST rattachées à la gamme mais fonctionnellement accessoires/conduits**
(raffinement par mot-clé `name` recommandé, non bloquant) :

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| ST../INOX | 564 | accessoire_fumisterie | MOYENNE | Pattes, colliers, fixations inox | 1 ENS.PATTE REGLABLE POUR CMI |
| ST../ACDO | 278 | accessoire_fumisterie | MOYENNE | Colliers de soutien | COLLIER DE SOUTIEN 0:180à230 |
| ST../GALV | 260 | accessoire_fumisterie | MOYENNE | Colliers de soutien galva | COLLIER DE SOUTIEN 0:150 |
| ST../FISO | 50 | conduit_principal | FAIBLE | Conduit isolé Liss-Iso | LISS-ISO DP 080/146 COUPE 1 M |
| ST../ACTH | 8 | accessoire_fumisterie | MOYENNE | Déflecteurs pluie | DEFLECTEUR PLUIE 080 TZ |
| ST../FIX | 6 | accessoire_fumisterie | ÉLEVÉE | Cadres de fixation | CADRE FIXATION BOIS HAUT.SPEC. |
| ST../FIXO | 2 | accessoire_fumisterie | ÉLEVÉE | Cadre fixation Optimale | CADRE FIX.ST OPTIMALE 150 I/G |

---

## B. accessoire_fumisterie — gammes THRM, FUMI, OUT, PRO, divers

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| THRM/ACTH | 1959 | accessoire_fumisterie | MOYENNE | Accessoires THERM (adaptateurs, raccords) — raffinement name conseillé | ADAPTATEUR 150TZ/155TZ |
| THRM/THTI | 1208 | accessoire_fumisterie | MOYENNE | Accessoires THERM titane (carters, silencieux) | CARTER SILEN 130 TI |
| THRM/THZI | 288 | accessoire_fumisterie | MOYENNE | Colliers d'assemblage THERM zinc | COLLIER D'ASSEMBLAGE 150 ZI |
| THRM/CUIV | 178 | accessoire_fumisterie | MOYENNE | Chapeaux/pareluie cuivre | CHAP. PAREPLUIE 0:100TI CUIVRE |
| FUMI | 197 | accessoire_fumisterie | FAIBLE | Fumisterie générale (HV design) | HV DESIGN UP 080 H 750 |
| FUMI/EMAI | 506 | accessoire_fumisterie | MOYENNE | Adaptateurs émaillés | ADAPT. EMAILLE BL.100F-100F |
| FUMI/ALUE | 164 | accessoire_fumisterie | MOYENNE | Chapeaux aluminiés | CHAPEAU ALUMINIE REGL. 139-200 |
| FUMI/304S | 157 | accessoire_fumisterie | MOYENNE | Adaptateurs inox 304 | ADAPTATEUR INOX 100F-100F |
| FUMI/ACIE | 64 | accessoire_fumisterie | MOYENNE | Adaptateurs acier | ADAPT. A NOIR M 130F-130F |
| FUMI/SOI8 | 1 | accessoire_fumisterie | FAIBLE | Adaptateur conique | ADAPT. CONIQUE 130-180 CARA |
| FUMI/SI | 1 | accessoire_fumisterie | FAIBLE | Cône anticondens | CONE ANTICONDENS 150 |
| CHP/CHP | 188 | accessoire_fumisterie | FAIBLE | Colliers muraux CHP | COLLIER MURAL INOX 0:100 CHP |
| GRLA/NC | 75 | accessoire_fumisterie | FAIBLE | Boîtiers de buse | BOITIER BUSE 35X35 B125 |
| OUT/BUBB | 54 | accessoire_fumisterie | MOYENNE | Hérissons ramonage Bubbles | BUBBLES BASE L |
| OUT/BROU | 44 | accessoire_fumisterie | MOYENNE | Brosses ramonage | BROUSSE BASE M |
| OUT/COLO | 24 | accessoire_fumisterie | FAIBLE | Accessoires Colo | CAP AUTOPORTEE |
| OUT/VENI | 24 | accessoire_fumisterie | FAIBLE | Accessoires Venitian | VENITIAN COMPLET L |
| PRO/NC | 69 | accessoire_fumisterie | FAIBLE | Consommables (bistre/ramonage) | BISTRE POT 1KG |
| PRO/DERO | 8 | accessoire_fumisterie | FAIBLE | Dérouleurs | DEROULEUR FLEXONET 15/5 |
| PRO/ASPI | 7 | accessoire_fumisterie | FAIBLE | Aspirateurs (outillage) | ASPIRATEUR GALAX 40L 1200W |
| PRO (seul) | 6 | accessoire_fumisterie | FAIBLE | Bouchons divers | BOUCHONS POR 3CEPM+ 180,230 |
| PPTH/NC | 34 | accessoire_fumisterie | FAIBLE | Cache-plinthes | Cache-plinthes uni 80x23 |
| PPMI/NC | 7 | accessoire_fumisterie | FAIBLE | Colle/consommable | COLLE 5KG 250KM |
| ESS | 19 | accessoire_fumisterie | FAIBLE | Grilles crème | GRILLE CREME 17,5x17,5 D60 |
| ESS/NC | 1 | accessoire_fumisterie | FAIBLE | Kit air foyer | KIT AIR FOYER FERME OBT D160 |
| AXAF/NC | 7 | accessoire_fumisterie | FAIBLE | Peinture (consommable) | BOMBE DE PEINTURE NOIR TEXTURE |
| WAXC/NC | 1 | accessoire_fumisterie | FAIBLE | Bride murale | BRIDE MURALE ALU 100 |
| KITI | 67 | accessoire_fumisterie | FAIBLE | Cadres de fixation kit | CADRE FIXATION RH/BOISS. 20*20 |
| KITI/NC | 36 | accessoire_fumisterie | FAIBLE | Raccords haut/conduit | RACC. HAUT / CONDUIT 150/20*20 |
| KITI/ACTU | 9 | accessoire_fumisterie | FAIBLE | Adaptateurs hauteur | ADAPTATEUR HAUTEUR 600 0:130 |
| SANS | 63 | accessoire_fumisterie | FAIBLE | Sans catégorie (repli raisonné) | BOMBE PEINT FATBLACK HT 600°C |
| SANS/AUC | 2 | accessoire_fumisterie | FAIBLE | Sans catégorie (repli raisonné) | BANDE MOUSSE TRIANG. |

> Note : les catégories `SANS` / `SANS/AUC` portent une valeur source explicite (« SANS ») et
> sont donc cartographiées, pas « inconnues ». Une catégorie réellement absente de cette matrice
> relève de la règle P-00 (needs_review), pas du présent mapping.

> Note product_type (axes indépendants) : la majorité de cette section est `product_type='part'`.
> Les consommables explicites (PRO/NC bistre, AXAF/NC peinture, PPMI/NC colle, SANS bombe
> peinture) relèvent de `product_type='consumable'` — à distinguer par la règle de dérivation
> product_type (SUPPLIER_MAPPING_STRATEGY_V1, C-1), indépendamment de l'item_family. La
> combinaison **`product_type='consumable'` + `item_family='accessoire_fumisterie'` est valide**
> sur les consommables fumisterie Poujoulat : `product_type` (nature) et `item_family`
> (sous-classe fumisterie) sont deux axes indépendants et non concurrents.

---

## C. systeme_etanche — gammes DUAL (Dualis), TP3E, kits étanches, TFUM

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| DUAL/PGI | 933 | systeme_etanche | ÉLEVÉE | Dualis concentrique étanche PGI | A AIR ETANCHE FLEX 60-100 BUSE |
| DUAL/EI | 179 | systeme_etanche | ÉLEVÉE | Dualis étanche intérieur | A AIR ETANCHE FLEX 100-77 BUSE |
| DUAL/FLEX | 133 | systeme_etanche | ÉLEVÉE | Dualis flexible étanche | BOBINE FLEX.FILM PP 80/90 50ML |
| DUAL/GP | 65 | systeme_etanche | ÉLEVÉE | Dualis grand passage | ADAPT+2PM 100/150G.P-80/125G.P |
| DUAL/EP | 43 | systeme_etanche | MOYENNE | Dualis colliers platine | COLLIER DUALIS D 100 A PLATINE |
| DUAL/GA | 36 | systeme_etanche | MOYENNE | Dualis adaptateurs gaz | ADAPT. 60/100-80/125 FRISQUET |
| DUAL/EA | 21 | systeme_etanche | MOYENNE | Dualis colliers | COLLIER UNIVERSEL |
| DUAL/3CE | 3 | systeme_etanche | MOYENNE | Conduit liaison 3CE concentrique | CONDUIT LIAIS.INOX 3CE 80/125 |
| DUAL/DA | 2 | systeme_etanche | MOYENNE | Colliers Dualis | COLLIER UNIVERSEL DIAM. 80 |
| DUAL/BF | 2 | systeme_etanche | MOYENNE | Joints à lèvre EI | JOINT À LEVRE 100 EI VITON |
| DUAL/CA | 1 | systeme_etanche | FAIBLE | Colliers ext. | COLLIER EXTERIEUR AVEC BAGUE |
| DUAL/FI | 1 | systeme_etanche | FAIBLE | Solin tuile F.I | SOLIN TUILE 15-30° 110-155 F.I |
| DUAL/PP | 1 | systeme_etanche | FAIBLE | Té de purge PPA | TE DE PURGE 160 PPA |
| DUAL (seul) | 9 | systeme_etanche | MOYENNE | Coudes concentriques | COUDE DEP.87° 80/125-60/100 |
| TP3E/TPAC | 228 | systeme_etanche | ÉLEVÉE | Tubage 3CE étanche membrane | A AIR ETANCHE MEMB.FLEX 95-120 |
| TP3E/TPEG | 150 | systeme_etanche | MOYENNE | Adaptations EF PGI | ADAPTATION 100-100 EF PGI |
| TP3E/TPEI | 149 | systeme_etanche | MOYENNE | Adaptateurs EF buse | ADAPTATEUR EF 100 BUSE |
| KT | 14 | systeme_etanche | MOYENNE | Kits d'étanchéité | KIT D'ETANCHEITE 1020 |
| KTAC/NC | 22 | systeme_etanche | MOYENNE | Kit air direct étanche | KIT AIR DIRECT D100 DESIGN |
| TFUM/TCLE | 7 | systeme_etanche | FAIBLE | Kit Top Clean (traitement fumée) | KIT TOP CLEAN |
| TFUM/COZR | 2 | systeme_etanche | FAIBLE | Catalyseur Zéro CO | CATALYSEUR ZERO CO F.F 0:200 |

> Note D-24 : `systeme_etanche` reste suggéré à TVA 20 % (NHR, DTA non confirmé) — l'artisan tranche.

---

## D. conduit_principal — gammes COND, THplus (THERM+ GEP), 3CEP, THD

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| COND/COSD | 449 | conduit_principal | MOYENNE | Conduits CD (carters/éléments) | CARTER SILEN 130 CD |
| COND/COTF | 162 | conduit_principal | MOYENNE | Conduits CD éléments+trappes | EC 87° TRAPPE VISITE 350 CD |
| COND/VH | 40 | conduit_principal | MOYENNE | Éléments coudés VH | ELEMENT COUDE 15° 0:180 VH |
| COND/CASC | 14 | conduit_principal | FAIBLE | Adaptateurs B23P | ADAPTATEUR B23P 100 |
| COND/CDE | 1 | conduit_principal | FAIBLE | Joint condensor | JOINT SPECIAL CONDENSOR 0:130 |
| COND (seul) | 1 | conduit_principal | MOYENNE | Élément trappe visite CD | ELEMENT TRAPPE VISITE 100 CD |
| THplus/G050 | 294 | conduit_principal | ÉLEVÉE | THERM+ GEP50 conduit isolé | 100mm test point 150 GEP50 |
| THplus/G100 | 64 | conduit_principal | ÉLEVÉE | THERM+ GEP100 conduit isolé | COLLIER MURAL INOX 0:150GEP100 |
| 3CEP/MplusIN | 159 | conduit_principal | MOYENNE | 3CE Plus Multi+ intérieur | BOUCHON DE SECURITE MULTI+ |
| 3CEP/RENO | 71 | conduit_principal | MOYENNE | 3CE Plus rénovation Renoshunt | CHAP TERM AERO 110 RENOSHUNT |
| 3CEP/MplusEX | 7 | conduit_principal | MOYENNE | 3CE Plus Multi+ extérieur | CONE PURGE SIPHON MULTI+ EXT |
| 3CEP/M+IN | 1 | conduit_principal | FAIBLE | 3CE solin toit plat | SOLIN TOIT PLAT 80-130 MULTI+ |
| 3CEP (seul) | 4 | conduit_principal | FAIBLE | Joint 3CETHD | JOINT A LEVRE 0:125 3CETHD |
| THD | 34 | conduit_principal | FAIBLE | 3CETHD bouchons | BOUCHONS 3CETHD 125,160,200 |
| THD/RACC | 10 | conduit_principal | MOYENNE | Conduit raccordement THD | COND.RACC L450 D80-150 |

---

## E. tubage_flexible — gamme TIFL (Tubage Flexible)

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| TIFL/STAR | 51 | tubage_flexible | ÉLEVÉE | Starflex lisse | STARFLEX LI 10/100 100 ECOF50M |
| TIFL/ST12 | 48 | tubage_flexible | ÉLEVÉE | Starflex 12/100 | STARFLEX LI 12/100 100 ECOF50M |
| TIFL/KITA | 37 | tubage_flexible | ÉLEVÉE | Kit alu tubage | KITALU SPECIAL GAZ 076 |
| TIFL/LLIS | 35 | tubage_flexible | ÉLEVÉE | Flex lisse | FLEX LISSE 10/100 150 38M ECOF |
| TIFL/LHRL | 29 | tubage_flexible | ÉLEVÉE | Flex lisse | FLEX LISSE 10/100 125 44M ECOF |
| TIFL/FLGF | 15 | tubage_flexible | ÉLEVÉE | Flex inox GF étanche | FLEX INOX GF ETANCHE 0:080 1M |
| TIFL/ACOU | 14 | tubage_flexible | ÉLEVÉE | Flexalu acoustique | FLEXALU ACOUSTIQUE 0:080 10,0M |
| TIFL/THER | 11 | tubage_flexible | ÉLEVÉE | Flexalu thermique | FLEXALU THERMIQUE 0:102 10,0M |
| TIFL/FLIS | 8 | tubage_flexible | ÉLEVÉE | Flexible inox lisse | FLEXIBLE INOX LISSE 180 BO 32M |
| TIFL/GFLE | 7 | tubage_flexible | MOYENNE | Flexible air | FLEXIBLE AIR NOIR 0:100 25 ML |
| TIFL/ALA5 | 7 | tubage_flexible | ÉLEVÉE | Flexible alu | FLEXIBLE ALU30 A5 0:100 DE 44M |
| TIFL/VALU | 7 | tubage_flexible | ÉLEVÉE | Ventil alu flexible | VENTIL ALU 3M D100 M1 SSFILM |
| TIFL/FALU | 6 | tubage_flexible | ÉLEVÉE | Flexalu | FLEXALU 0:080 1 M |
| TIFL/PHON | 6 | tubage_flexible | MOYENNE | Phoni alu | PHONI ALU M0M1 0:080 1,25-10 |
| TIFL/LISA | 2 | tubage_flexible | ÉLEVÉE | Flexible lisse | FLEXIBLE LIS A Ø 167 BO 32M |

---

## F. tubage_rigide — gamme TIRI (Tubage Rigide)

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| TIRI/TUBO | 46 | tubage_rigide | MOYENNE | Tubage rigide (adaptateurs rond/ovale) | ADAPTATEUR ROND OVALE 150 |

---

## G. adaptateur_transition — gammes AXCO, AXTU (accessoires de transition)

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| AXCO/NC | 1550 | adaptateur_transition | MOYENNE | Adaptateurs conduit (gros volume) | ADAPTATEUR 0:080 |
| AXCO/FLAC | 580 | adaptateur_transition | MOYENNE | Adaptateurs sur buse | ADAPT SUR BUSE 139 F/140 BU |
| AXCO/FISO | 91 | accessoire_fumisterie | FAIBLE | Coquilles isolantes | COQUILLE ISOL H350 100DP |
| AXCO/point | 33 | adaptateur_transition | MOYENNE | Raccords inox émail | RACCORD INOX 100-080 EMAIL |
| AXCO/REGU | 7 | accessoire_fumisterie | FAIBLE | Régulateurs | REGULATEUR TECH INOX 150 |
| AXCO/ACTU | 2 | accessoire_fumisterie | FAIBLE | Chapeaux cône finition | CHAPEAU CONE FINITION 150 SLCD |
| AXCO/CASC | 1 | accessoire_fumisterie | FAIBLE | Cache air comburant | CACHE AIR COMBURANT |
| AXTU/NC | 599 | adaptateur_transition | MOYENNE | Adaptateurs tubage (clips/raccord) | ADAPT. 30°CLIPSER D150 |
| AXTU (seul) | 57 | adaptateur_transition | MOYENNE | Kit raccord tubage | KIT RACC. TUBAGE 45°D100 |

---

## H. gaine_technique — gammes VENT, ASFU (ventilation, aspiration)

| Catégorie source | N | item_family | Conf. | Justification | Exemple |
|---|---|---|---|---|---|
| VENT/VMC | 378 | gaine_technique | MOYENNE | VMC boîtiers galva | BOITIER GALVA EGAL 100 |
| VENT/VACC | 78 | gaine_technique | MOYENNE | Accessoires ventilation | BOITIER DISTRIB. 1*160-3*125 |
| VENT/GFLE | 4 | gaine_technique | MOYENNE | Flexible air ventilation | FLEXIBLE AIR NOIR 0:100 1 ML |
| VENT/GALV | 1 | gaine_technique | FAIBLE | STB I/G ventilation | S T B 150 I/G + 1V160 |
| VENT (seul) | 1 | gaine_technique | FAIBLE | Bande alu adhésive | BANDE SF ALU adh. 50x3m 30µ |
| ASFU/ELEC | 42 | gaine_technique | FAIBLE | Boîtiers relais aspiration (élec) | BOITIER DE RELAIS ES 12 |
| ASFU/ROTO | 28 | gaine_technique | MOYENNE | Adaptateurs aspiration | ADAP.ASPIR.COND TRAD 150 15*15 |
| ASFU/STAT | 3 | gaine_technique | FAIBLE | Aspirateur statique | ASPIRSTATIC SPECIAL GAZ |

---

## I. Familles sans catégorie source dédiée chez Poujoulat

| item_family | Présence dans la source Poujoulat |
|---|---|
| raccordement_visible | Aucune catégorie dédiée. Pièces dispersées dans THRM/FUMI/AXCO ; isolables ultérieurement par raffinement `name`, non requis V1. |
| raccordement_pellets_visible | Aucune catégorie dédiée. Raccords flexibles granulés dispersés dans DUAL/* et TP3E/* ; raffinement `name` optionnel. |
| environment / service / labor | Aucune catégorie Poujoulat. Familles réservées à d'autres usages (KEMP environnement D-20 ; prestations LIGNIA D-18), hors catalogue Poujoulat. |

---

## Synthèse par famille cible (volumes réels vérifiés)

| item_family V1 | Volume réel | Part |
|---|---|---|
| accessoire_fumisterie | 6 687 | 40,5 % |
| adaptateur_transition | 2 819 | 17,1 % |
| sortie_toiture | 2 797 | 16,9 % |
| systeme_etanche | 2 001 | 12,1 % |
| conduit_principal | 1 361 | 8,2 % |
| gaine_technique | 535 | 3,2 % |
| tubage_flexible | 283 | 1,7 % |
| tubage_rigide | 46 | 0,3 % |
| **Total** | **16 529** | **100 %** |

Couverture : **100 % des 16 529 lignes** reçoivent une `item_family` valide via la catégorie
source, sans résidu NULL.

---

## Recommandations d'implémentation (pour Claude Exec — sans code)

1. **Clé du mapping** : `of_seller_product_category_name` (127 valeurs), jamais le libellé `name`.
2. **Forme** : dictionnaire de correspondance exacte `catégorie → item_family`, 127 entrées.
3. **Prérequis pipeline** : `map_supplier.py` doit LIRE cette colonne (aujourd'hui ignorée) et la
   RPC `import_supplier_items` doit PERSISTER `item_family` (aujourd'hui non écrit).
4. **product_type** : tous les articles Poujoulat du corpus audité sont `part` (fumisterie
   physique) ou `consumable` (consommables explicites : peinture, bistre, colle). Aucun
   `appliance` identifié dans ce corpus. Dérivé indépendamment de l'item_family
   (SUPPLIER_MAPPING_STRATEGY_V1, C-1).
5. **Catégorie inconnue** : règle P-00 (stop + `data_quality_status='needs_review'`, import
   bloqué jusqu'à arbitrage + rapport). Jamais de repli auto.
6. **Cas MOYENNE/FAIBLE** : raffinement ultérieur par mot-clé `name` ; non bloquant V1.
7. **`supplier_range` / `manufacturer_name`** : ne PAS dériver de cette matrice. `supplier_range`
   = source explicite ou NULL ; `manufacturer_name` = statique « Poujoulat ».

---

Figé juin 2026. Matrice item_family de référence pour Poujoulat V1.
