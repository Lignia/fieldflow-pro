Patch chirurgical dans `src/pages/quotes/QuoteEditor.tsx`.

Modification
- Ligne 925 dans `addAppliance()` : `vat_rate: 20` -> `vat_rate: 5.5`.

Raison
- 5.5% est le taux par defaut pour un appareil en renovation (logement > 2 ans).
- L'artisan peut modifier manuellement la ligne de devis si le cas est neuf ou non eligible.
- Aucune logique conditionnelle n'est ajoutee : seul la valeur par defaut change.

Non-impact
- `vat_rate` reste editable dans l'interface de ligne de devis.
- Aucune autre fonction n'est modifiee (`addItem`, `handleSave`, gardes, etc.).
- Aucune modification de type ni d'import : `vat_rate` accepte deja 5.5, 10 et 20.

Validation
- Compilation TypeScript de `QuoteEditor.tsx`.
- Test manuel : ajouter un appareil -> la TVA par defaut affichee est 5.5%.
- Verifier que l'artisan peut toujours passer la ligne a 20% via l'UI.