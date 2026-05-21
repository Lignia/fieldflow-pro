# D-25 — TVA Catalogue LIGNIA — Doctrine officielle

**Date** : 2026-05-21  
**Session** : RUNTIME-CONSOLIDATION  
**Statut** : ✅ Appliqué en base  
**Sources** : Art. 278-0 bis CGI · BOFiP BOI-ANNX-000210 (31/07/2024)

---

## Principe fondamental

`catalog_items.vat_rate` = **suggestion ergonomique** pour préremplir le devis.  
`quote_lines.vat_rate` = **vérité contractuelle** — toujours modifiable par l'artisan.

La condition logement >2 ans est de la responsabilité de l'artisan (attestation client).  
LIGNIA ne la vérifie pas — elle suggère le taux du cas dominant.

---

## Tableau TVA par famille de produit

### Joncoux — Fumisterie centrale

| `item_family` | Articles | `vat_rate` suggéré | Justification |
|---|---|---|---|
| `conduit_principal` | 2 053 | **5,5%** | Art. 278-0 bis CGI — fourniture + pose conduits |
| `tubage_flexible` | 571 | **5,5%** | Travaux d'adaptation système évacuation |
| `raccordement_visible` | 397 | **5,5%** | Raccordement indissociable installation |
| `sortie_toiture` | 1 334 | **5,5%** | Création/rénovation conduit + sortie toit |
| `accessoire_fumisterie` | 477 | **5,5%** | Pièces facturées avec main-d'œuvre pose |
| `raccordement_pellets_visible` | 130 | **5,5%** | Raccordement pellets, idem conduit |
| `systeme_etanche` | 791 | **20%** | NHR=true, DTA non confirmé, artisan doit trancher manuellement — risque si vendu sans pose |
| `environment` | 340 | **20%** | Biens meubles non obligatoirement posés |

**Total fumisterie à 5,5% : 4 962 articles**

---

### KEMP SAS — Environment Layer

| `environment_category` | Articles | `vat_rate` suggéré | Justification |
|---|---|---|---|
| `distribution_air_chaud` | 22 | **5,5%** | Turbines, gaines, diffuseurs fixés — indissociables installation poêle canalisé |
| `grille_air_chaud` | 54 | **5,5%** | Grilles encastrées coffrage hotte — posées par l'artisan |
| `arrivee_air_frais` | 26 | **5,5%** | Prise d'air obligatoire RE2020 — kit posé |
| `protection_murale` | 11 | **5,5%** | PANISOL fixé à demeure (Avis Technique), habillages plafond |
| `protection_sol` | 7 | **20%** | Plaques sol acier — biens meubles déplaçables |
| `protection_securite` | 3 | **20%** | Barrières enfants, portes visite — biens meubles amovibles |
| `rangement_bois` | 19 | **20%** | Niches/range-bûches — majorité biens meubles |
| `rangement_granules` | 8 | **20%** | Silos pellets sur roulettes — biens meubles |
| `accessoire_entretien` | 10 | **20%** | Hétérogène (nettoyants, aspirateur, colles) — trop mixte pour généraliser |
| `accessoire_decoratif` | 6 | **20%** | Serviteurs — objets décoratifs entièrement amovibles |

**Total KEMP à 5,5% : 113 articles**  
**Total KEMP à 20% : 53 articles**

---

### LIGNIA — Ouvrages et services

| `name` | `vat_rate` | Justification |
|---|---|---|
| Ramonage conduit simple paroi | **10%** | BOFiP §20 — "Travaux de ramonage et élimination de suie" |
| Ramonage conduit double paroi isolé | **10%** | BOFiP §20 |
| Ramonage conduit concentrique pellets | **10%** | BOFiP §20 |
| Entretien annuel poêle à granulés | **10%** | BOFiP §40 — "Contrats d'entretien et de maintenance de chauffage" |
| Mise en service poêle à bois | **10%** | BOFiP §40 — prestation d'entretien/mise en service |
| Mise en service poêle à granulés | **10%** | BOFiP §40 |
| Dépose ancien appareil | **10%** | Travaux indissociables |
| Gestion des déchets et évacuation | **10%** | Inclus dans prestation globale éligible au taux réduit |

---

## Cas particuliers — règles invariantes

### Logement neuf ou < 2 ans
Taux réduit inapplicable → **20%** sur toutes les lignes.  
L'artisan corrige dans `quote_lines.vat_rate` si le logement ne remplit pas la condition.

### Pièces détachées vendues seules (SAV sans pose)
→ **20%** — livraison de bien meuble, pas une prestation immobilière.  
Si la pièce est facturée dans une prestation globale avec pose → **5,5%** (indissociable).

### `systeme_etanche` Apollo Pellets (NHR=true)
→ **20%** maintenu par prudence.  
Techniquement éligible au 5,5% si posé dans un logement >2 ans, mais :
- NHR=true = l'artisan doit valider le DTA manuellement
- Peut être vendu sans pose (pièce de remplacement)
- Risque de requalification si vendu sans prestation
→ L'artisan applique 5,5% manuellement dans le devis si l'installation le justifie.

### Local commercial ou professionnel
→ **20%** — le taux réduit ne s'applique qu'aux locaux d'habitation.

---

## État en base après corrections

```sql
-- Vérification globale
SELECT supplier_name, item_family, environment_category, vat_rate, COUNT(*)
FROM catalog.catalog_items
WHERE is_central = true
GROUP BY 1, 2, 3, 4
ORDER BY 1, 4 DESC, 2;
```

| Fournisseur | Famille/Catégorie | TVA | Articles |
|---|---|---|---|
| Joncoux | fumisterie CORE (6 familles) | 5,5% | 4 962 |
| Joncoux | systeme_etanche | 20% | 791 |
| Joncoux | environment | 20% | 340 |
| KEMP SAS | distribution/grilles/air/murale | 5,5% | 113 |
| KEMP SAS | sol/sécurité/rangement/déco/entretien | 20% | 53 |
| LIGNIA | ouvrages service | 10% | 8 |

---

## Référence réglementaire

- **Art. 278-0 bis CGI** — Taux réduit 5,5% travaux amélioration qualité énergétique logements >2 ans
- **BOFiP BOI-ANNX-000210** (31/07/2024) — Tableau officiel DGFiP des taux TVA par opération d'entretien/dépannage
- **Art. 279-0 bis CGI** — Taux intermédiaire 10% travaux d'amélioration, de transformation, d'aménagement

*Ne pas modifier sans décision architecture explicite. Toute divergence avec quote_lines.vat_rate est normale et voulue.*
