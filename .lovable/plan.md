

# LIGNIA -- Plan UX/UI complet

## Synthese metier

LIGNIA est un outil de gestion pour PME artisans (chauffage bois, HVAC, plomberie). Deux cycles metier : **Installation** (projet pipeline 17 statuts) et **SAV** (demande > intervention). Multi-tenant, multi-roles (admin, commercial, technicien, comptable, viewer). Creation progressive, non-bloquant.

---

## 1. Design System

### Palette de couleurs

| Token | HSL | Usage |
|---|---|---|
| `--primary` | 220 25% 18% | Textes, boutons principaux -- bleu charbon pro |
| `--primary-foreground` | 210 20% 98% | Texte sur primary |
| `--accent` | 142 40% 45% | Actions positives, statuts actifs -- vert nature/bois |
| `--accent-foreground` | 0 0% 100% | Texte sur accent |
| `--warning` | 38 92% 55% | Alertes, en retard |
| `--destructive` | 0 72% 55% | Erreurs, annulations |
| `--background` | 40 20% 98% | Fond general -- blanc chaud |
| `--card` | 40 15% 100% | Cartes |
| `--muted` | 220 10% 94% | Fonds secondaires |
| `--muted-foreground` | 220 10% 50% | Textes secondaires |
| `--border` | 220 12% 88% | Bordures |

### Typographie

- **Titres** : Inter 600/700, 1.5rem-2rem
- **Corps** : Inter 400, 0.875rem-1rem
- **Mono/chiffres** : JetBrains Mono pour montants et numeros de devis

### Composants cles a creer

1. **StatusBadge** -- badge colore par statut (pipeline projet, devis, facture, intervention)
2. **KPICard** -- chiffre + label + tendance pour dashboard
3. **TimelineActivity** -- fil d'activite polymorphique (core.activities)
4. **QuickActionBar** -- barre d'actions rapides sticky en bas (mobile)
5. **PipelineBoard** -- vue kanban des projets par statut
6. **FormStepper** -- formulaire multi-etapes pour releve technique (55+ champs)
7. **CustomerCard** -- resume client avec proprietes et projets lies
8. **CalendarSlot** -- creneaux intervention pour planning
9. **InvoiceLineEditor** -- editeur de lignes inline pour devis/factures
10. **SearchCommand** -- recherche globale (clients, projets, devis) via Cmd+K

### Regles UX terrain

- Touch targets minimum 44px sur mobile
- Actions principales toujours visibles sans scroll
- Formulaires sauvegarde auto (draft), jamais de perte de donnees
- Navigation par onglets lateraux (desktop), bottom tabs (mobile)
- Notifications toast pour confirmations rapides

---

## 2. UX Flows

### Flow 1 : Creation client
```text
[+Client] → Formulaire minimal (nom, type, tel/email)
         → Client cree en statut "prospect"
         → Option : ajouter propriete maintenant ou plus tard
         → Fiche client accessible immediatement
```
Non-bloquant : email et telephone optionnels a la creation.

### Flow 2 : Creation projet
```text
Fiche client → [+Projet]
  → Selectionner propriete (ou en creer une)
  → Statut auto "lead_new"
  → Pipeline visible, glisser vers etapes suivantes
  → A chaque etape, actions contextuelles proposees
```

### Flow 3 : Releve technique (technical_survey)
```text
Fiche projet → [Releve technique]
  → FormStepper en 8 sections :
    S3: Type projet | S4: Habitation | S5: Piece
    S6: Toiture/conduit | S7: Cotes | S8: Raccordement
    S9: Observations | S10: Croquis/photos
  → Sauvegarde draft a chaque section
  → Bouton "Valider" → status=validated
  → Version incrementee automatiquement
```
Optimise mobile : champs adaptes au terrain (selecteurs, toggles, pas de saisie libre inutile).

### Flow 4 : Creation devis
```text
Fiche projet → [+Devis]
  → Pre-rempli depuis projet (client, propriete)
  → Ajout lignes : catalogue (recherche) ou ligne libre
  → Totaux HT/TVA/TTC recalcules en temps reel
  → Apercu PDF → Envoyer → Statut "sent"
  → Signature → "signed" → Genere facture acompte
```

### Flow 5 : Demande d'intervention (SAV)
```text
[+Demande SAV] → Type (ramonage, reparation, diagnostic...)
  → Client optionnel (nouveau contact possible)
  → Propriete optionnelle
  → Installation optionnelle
  → Statut "new" → Qualification → Planification
```

### Flow 6 : Planning
```text
Vue semaine/jour → Creneaux par technicien
  → Drag & drop intervention
  → Couleurs par workstream (installation vs SAV)
  → Clic = detail intervention
  → Actions : demarrer, completer, reporter
```

### Flow 7 : Facturation
```text
Devis signe → Facture acompte auto
Intervention completee → Facture directe possible
  → Lignes editables, totaux recalcules
  → Envoi → Suivi paiement (pending/paid/overdue)
  → Relances visuelles sur factures en retard
```

---

## 3. Ecrans cles

### 3.1 Dashboard
- **4 KPI cards** : CA du mois, devis en attente, interventions semaine, factures impayees
- **Pipeline projets** : mini kanban horizontal scrollable
- **Agenda du jour** : prochaines interventions
- **Activite recente** : fil timeline (core.activities)
- **Alertes** : factures en retard, devis expirant, interventions a planifier

### 3.2 Fiche client
- **En-tete** : nom, type (badge), statut, contact
- **Onglets** : Proprietes | Projets | Interventions | Devis/Factures | Activite
- **Actions** : +Propriete, +Projet, +Demande SAV
- **Vue proprietes** : cartes avec adresse, type, installations liees

### 3.3 Fiche projet
- **En-tete** : numero, statut (badge pipeline), client, propriete
- **Barre progression** : etapes pipeline visuelles
- **Onglets** : Resume | Releve technique | Devis | Interventions | Documents | Activite
- **Actions contextuelles** selon statut (ex: "Planifier VT" si lead_qualified)

### 3.4 Demande d'intervention
- **Liste** : filtrable par statut, type, date
- **Fiche** : type, source, client/propriete/installation (liens), notes
- **Actions** : Qualifier, Planifier (cree intervention), Fermer

### 3.5 Fiche intervention
- **En-tete** : type (badge), workstream, technicien assigne, date/heure
- **Detail** : client, propriete, installation, notes internes, notes client
- **Actions** : Demarrer, Completer, Reporter (cree nouvelle intervention liee)
- **Lien** vers devis/facture si applicable

### 3.6 Devis
- **En-tete** : numero, version, statut, client, date, echeance
- **Lignes** : tableau editable inline (label, qte, unite, prix, TVA, total)
- **Totaux** : HT / TVA / TTC
- **Actions** : Envoyer, Dupliquer (nouvelle version), Marquer signe
- **Historique versions** : lien previous_quote_id / thread_id

### 3.7 Planning
- **Vue calendrier** : semaine par defaut, jour/mois disponible
- **Colonnes par technicien** (desktop) ou liste chronologique (mobile)
- **Code couleur** : installation (bleu), SAV (orange)
- **Filtres** : technicien, workstream, type intervention

---

## 4. Landing page LIGNIA

### Structure

```text
[NAVBAR] Logo LIGNIA | Fonctionnalites | Tarifs | Connexion | [Essai gratuit]

[HERO]
  Titre : "Gerez votre activite artisanale. Simplement."
  Sous-titre : "De la demande client a la facturation,
                LIGNIA structure votre quotidien sans le compliquer."
  CTA : [Demarrer gratuitement]
  Visual : screenshot app (dashboard)

[SOCIAL PROOF]
  "Concu pour les artisans du chauffage bois, HVAC et plomberie"
  3 logos metiers / icones

[PROBLEME]
  "Vous jonglez entre carnets, tableurs et relances oubliees ?"
  3 pain points illustres :
  - Devis perdus, relances oubliees
  - Planning techniciens non coordonne
  - Facturation en retard

[SOLUTION - 4 blocs]
  1. Clients & Projets
     "Centralisez vos clients, proprietes et projets.
      Suivez chaque affaire du premier contact a la cloture."

  2. Releve technique terrain
     "Remplissez vos releves sur chantier, meme hors ligne.
      55 points de controle structures, zero papier perdu."

  3. Devis & Facturation
     "Creez vos devis en quelques clics depuis votre catalogue.
      Facturez, suivez les paiements, relancez automatiquement."

  4. Planning & Interventions
     "Planifiez ramonages, SAV et installations.
      Vos techniciens voient leur agenda en temps reel."

[COMMENT CA MARCHE]
  3 etapes :
  1. Creez votre compte en 2 minutes
  2. Ajoutez vos premiers clients et projets
  3. Planifiez, chiffrez, facturez

[TEMOIGNAGE]
  Citation artisan + photo + metier

[CTA FINAL]
  "Pret a structurer votre activite ?"
  [Essai gratuit 14 jours] | [Demander une demo]

[FOOTER]
  LIGNIA | Mentions legales | CGU | Contact | support@lignia.fr
```

### Ton copywriting
- Direct mais rassurant
- Vocabulaire metier (chantier, releve, ramonage, devis)
- Pas de jargon tech
- Promesse : "structure sans complexite"

---

## 5. Plan d'implementation (fichiers a creer)

### Phase 1 : Fondations
1. Mettre a jour le design system (index.css, tailwind.config.ts) avec la palette LIGNIA
2. Creer les composants de base : StatusBadge, KPICard, QuickActionBar
3. Mettre en place le routing (React Router) : `/`, `/dashboard`, `/clients`, `/projects`, `/planning`, `/quotes`, `/invoices`
4. Creer le layout principal avec sidebar desktop + bottom tabs mobile

### Phase 2 : Landing page
5. Page d'accueil LIGNIA complete (hero, features, CTA)

### Phase 3 : Ecrans metier
6. Dashboard avec KPIs et widgets
7. Liste clients + fiche client
8. Liste projets + fiche projet avec pipeline
9. Formulaire releve technique (FormStepper 8 sections)
10. Devis : liste + editeur avec lignes
11. Planning : vue calendrier interventions
12. Demandes SAV : liste + fiche
13. Factures : liste + detail + suivi paiements

Chaque phase sera implementee avec des donnees mockees (pas de backend) pour valider l'UX avant integration Supabase.

