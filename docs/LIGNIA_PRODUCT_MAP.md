# LIGNIA PRODUCT MAP

> La colonne vertébrale du produit.
> Répond à : comment fonctionne LIGNIA et vers quoi il va.
> Document stable — évolue peu. Ne suit pas les sprints.
> Dernière mise à jour : 28 juin 2026

---

## RÈGLE DE LECTURE

**Pilote** = ce qui doit fonctionner pour les 5 artisans pilotes
**V1** = ce qui permet de vendre LIGNIA à 50 artisans
**V2** = ce qui fidélise et différencie
**V3** = ce qui fait de LIGNIA une plateforme IA métier

Un domaine sans case = hors périmètre LIGNIA (comptabilité, stock, rapprochement bancaire).

---

## LA CARTE

| Domaine | Pilote | V1 | V2 | V3 |
|---|---|---|---|---|
| **0. Plateforme & Tenant** | Onboarding ✅ Provision sécurisé ⚠️ | Paramètres post-onboarding | Multi-industrie (HVAC, plomberie) | API fabricant (Poujoulat publie directement) |
| **1. CRM & Projets** | Clients ✅ Projets ✅ Pipeline 17 statuts ✅ | Contacts multiples par client | Questionnaire découverte JSONB Partenaires projet (architecte, MOE) | Scoring lead IA Prédiction conversion |
| **2. Catalogue Fumisterie** | 22 796 articles ✅ search_quote_items_v2 ✅ Ranking sémantique ✅ | Poujoulat dans family_search_profiles Normalisation supplier_ref | Alertes tarifs mis à jour Compatibilité inter-gammes (quote_system_sections) | Suggestion article IA depuis contexte chantier |
| **3. Appareils ADEME** | 1 516 références Flamme Verte ✅ | Marques par artisan (tenant_appliance_brands) Lien installation→appareil UI | MaPrimeRénov pré-calculé | Suggestion appareil IA depuis visite technique |
| **4. Devis & Tarification** | QuoteEditor ✅ Remises auto ✅ Signature ✅ Acompte auto ✅ | Exposer expiry_date UI Exposer tva_context UI Envoi email devis | Déduction acompte dans facture solde % acompte configurable | Génération devis assistée IA (generation_source) |
| **5. Visite Technique & DTU** | TechnicalSurveyDetail ✅ 133 colonnes ✅ dtu_result (pass/warn/fail) ✅ | Lien visite → devis automatique | Calcul indice i automatique Rapport DTU PDF | IA DTU : "ce conduit ne passe pas en EN13384" |
| **6. Commande Fournisseur** | ❌ (ressaisie manuelle) | Architecture prête ✅ BDC depuis devis signé Push email Poujoulat | Connecteur API Poujoulat Livraison directe chantier | Commande automatique après validation artisan |
| **7. Chantier & Installation** | InterventionCreate ✅ Parc installé ✅ Pipeline projet ✅ | Commissioning lié au devis Heating_appliance_id UI | Garanties auto-calculées Historique par appareil | Prédiction panne depuis historique |
| **8. Facturation** | Acompte draft ✅ PDF ⚠️ BUG-04 | PDF fonctionnel Facture solde Workflow draft→sent→paid | Avoir Export CSV Pennylane Attestation TVA réduite | Factur-X XML Chorus Pro (obligatoire 2027) |
| **9. SAV & Maintenance** | ServiceRequest ✅ Interventions 8 types ✅ | Bouton "Créer devis depuis SAV" | Contrats maintenance DI automatiques Cerfa 15497 ramonage | Planning optimisé par géolocalisation Prédiction SAV IA |
| **10. Planning** | ❌ stub vide | Vue semaine par technicien | Drag & drop Recherche créneau disponible | Optimisation tournées IA |
| **11. IA** | search_quote_items_v2 (moteur actif) ✅ ai.interactions schéma ✅ | Prérequis données : supplier_ref normalisé family_search_profiles complet metadata.prescription remplie | Prototype voix → search_quote_items_v2 → devis Suggestion bundles depuis historique | Voice match complet DTU assist Quote suggest |
| **12. Export & Intégrations** | ❌ | Export CSV Pennylane basique | Export multi-format (Sage, Evoliz) Connecteur leads fabricant | Factur-X PME (2027) Chorus Pro |
| **13. Administration LIGNIA** | Import fournisseur ✅ DROP staging ⚠️ SEC-10/11 | Pipeline import automatisé | Portail fabricant (Poujoulat publie) | Marketplace catalogue |

---

## FLUX MÉTIER PRINCIPAL

```
Prospect appelle
  ↓
Créer client + projet (CRM)
  ↓
Visite technique sur site (DTU 133 colonnes)
  ↓
Chercher articles catalogue (search_quote_items_v2)
  ↓
Créer devis + remises automatiques
  ↓
Signer → acompte automatique
  ↓
Commander chez Poujoulat (BDC — V1)
  ↓
Installer + commissioning (parc installé)
  ↓
Facturer (solde — V1)
  ↓
SAV + maintenance annuelle (V2)
```

---

## CE QUE L'IA APPORTE À CHAQUE ÉTAPE

L'IA de LIGNIA n'est pas de la génération de texte.
C'est une couche intelligente au-dessus de données métier structurées.

| Étape métier | Sans IA | Avec IA (quand le socle le permet) | Économie estimée |
|---|---|---|---|
| Chercher un article | Taper "coude 150 apollo" → parcourir résultats | Dire "un coude apollo concentrique 150 noir" → article inséré | 5-10 min/devis |
| Calcul DTU | Calcul manuel avec tables | "Ce conduit ne passe pas en EN13384 pour cette puissance" | 30-60 min/visite |
| Créer un devis SAV | Identifier l'installation, retrouver les pièces, taper les lignes | Depuis l'historique de l'installation, suggérer les pièces probables | 15-20 min/SAV |
| Planifier 200 entretiens annuels | Gestion manuelle par artisan | Planning optimisé automatique depuis les contrats | 2h/semaine ramoneur |

**Règle absolue :** aucune fonctionnalité IA ne part en développement tant qu'elle n'économise pas au moins 15 à 30 minutes sur une tâche réelle d'un artisan réel.

---

## PRÉREQUIS IA (à préparer pendant le socle)

Ces tâches ne sont pas des features visibles — ce sont des conditions pour que l'IA fonctionne.

```
supplier_ref Poujoulat normalisée (supprimer préfixes POU_)
  → débloque BDC + IA commande automatique

Poujoulat dans family_search_profiles
  → améliore le ranking de 73% du catalogue

metadata.prescription rempli sur toutes les quote_lines
  → données d'entraînement pour quote_suggest

tva_context exposé dans l'UI
  → débloque la suggestion TVA IA depuis la visite technique
```

---

## CE QUE LIGNIA NE FERA JAMAIS

```
Comptabilité intégrée      → Pennylane/Sage/Evoliz
Gestion de stock           → artisans = contremarque, pas de stock
Rapprochement bancaire     → logiciel comptable
Import local catalogue     → catalogue central SaaS
```

---

*LIGNIA PRODUCT MAP — v1.0*
*28 juin 2026*
*Document stable. Évolue après chaque validation terrain significative.*
*Prochain révision : après pilote 5 artisans.*
