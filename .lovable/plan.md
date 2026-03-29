

## Plan : Ajouter des console.log de debug dans useCreateQuote.ts

### Objectif
Identifier précisément quelle requête Supabase retourne une erreur 400 lors de la création d'un devis.

### Modifications (fichier unique : `src/hooks/useCreateQuote.ts`)

**1. Après la requête `v_projects_with_customer` (ligne 77)** — ajouter :
```ts
console.log('PROJ:', { data: proj, error: projErr });
```

**2. Après la requête `quotes.insert` (ligne 97)** — ajouter :
```ts
console.log('QUOTE:', { data: newQuote, error: quoteErr });
```

**3. Dans `addLine`, après la requête `quote_lines.insert` (ligne ~130)** — ajouter :
```ts
console.log('LINE:', { error: err });
```

### Aucune logique modifiée
Uniquement 3 lignes `console.log` ajoutées. Aucun autre fichier touché.

### Étape suivante
Après implémentation, ouvrir la preview, créer un devis, et lire les console logs pour identifier l'erreur exacte.

