# UX Corrections P0 — Post-validation DEV-2026-0104

**Date** : 2026-05-21  
**Contexte** : Devis DEV-2026-0104 (Apollo Pellets Ø80, signé, 8 lignes) validé en runtime.  
**Priorité** : Avant P1 — corrections d'affichage bloquantes pour la lisibilité artisan.

---

## Correction 1 — Section Rentabilité : exclure les lignes sans `unit_cost_price`

### Problème
Les lignes libres (lignes manuelles sans `product_id`) ont `unit_cost_price = null`.
Si le calcul de marge les compte avec `coût = 0`, la marge affichée est artificiellement gonflée.

**Exemple sur DEV-2026-0104 :**
- 6 lignes catalogue Joncoux : `unit_cost_price` renseigné (prix net 52%)
- 1 ligne service LIGNIA : `unit_cost_price = unit_price_ht` (pas de remise)
- 1 ligne libre « Main d'œuvre » : `unit_cost_price = null`

Si la ligne libre est comptée avec coût=0, la marge calculée est fausse.

### Correction attendue

```typescript
// Filtrer pour le calcul de rentabilité
const lignesAvecCout = lines.filter(l => l.unit_cost_price !== null && l.unit_cost_price !== undefined);
const lignesSansCout = lines.filter(l => l.unit_cost_price === null || l.unit_cost_price === undefined);

// Calcul sur les lignes avec coût uniquement
const totalCoutHT = lignesAvecCout.reduce(
  (sum, l) => sum + (l.unit_cost_price * l.qty), 0
);
const totalPrixHT = lignesAvecCout.reduce(
  (sum, l) => sum + (l.unit_price_ht * l.qty), 0
);
const marge = totalPrixHT > 0 ? ((totalPrixHT - totalCoutHT) / totalPrixHT) * 100 : 0;

// Afficher une note si des lignes sont exclues
if (lignesSansCout.length > 0) {
  // Afficher : "X ligne(s) sans coût saisi — non incluse(s) dans le calcul de marge"
}
```

### Affichage attendu
- Marge calculée sur les seules lignes avec `unit_cost_price` renseigné
- Note discrète sous le bloc rentabilité : **"X ligne(s) sans coût saisi — non incluse(s) dans le calcul"**
- Ne pas masquer les lignes, ne pas bloquer le devis

---

## Correction 2 — Badge `tva_context` : afficher un libellé lisible

### Problème
Le champ `billing.quotes.tva_context` stocke une valeur technique.  
Si le frontend affiche la valeur brute, l'artisan voit `renovation_15ans` au lieu de "Rénovation > 15 ans".

### Valeurs en base et libellés attendus

```typescript
const TVA_CONTEXT_LABELS: Record<string, string> = {
  'renovation_15ans':       'Rénovation > 15 ans',
  'renovation_moins_15ans': 'Rénovation < 15 ans',
  'neuf':                   'Neuf',
  'non_qualifie':           'Non qualifié',
};

// Usage
const label = TVA_CONTEXT_LABELS[quote.tva_context] ?? quote.tva_context ?? '—';
```

### Valeur par défaut en base
`tva_context DEFAULT 'renovation_15ans'` — donc la majorité des devis LIGNIA
affiicheront **"Rénovation > 15 ans"** sans aucune action de l'artisan.

### Affichage attendu
- Badge ou label dans l'en-tête du devis / fiche projet
- Libellé humain, pas la valeur technique
- Si `tva_context = null` : afficher `'—'` ou ne pas afficher le badge

---

## Données de test disponibles

```
Devis  : DEV-2026-0104
ID     : 5288d3c9-4823-41cd-b43e-3413284c1b40
Statut : signed
Client : Sylvie Bertrand (demo+client02@lignia.local)
Projet : PRJ-DEMO-002

Lignes avec unit_cost_price : 7 (6 Joncoux + 1 LIGNIA service)
Lignes sans unit_cost_price : 1 (ligne libre « Main d'œuvre »)
tva_context                 : 'renovation_15ans'
```

---

*Ces corrections sont purement UX — aucune migration SQL requise.*  
*Ne pas modifier `billing.replace_quote_lines` ni `billing.quotes`.*
