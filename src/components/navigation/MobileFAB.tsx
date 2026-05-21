/**
 * MobileFAB — bouton d'actions rapides terrain (mobile).
 *
 * Actuellement masqué : aucune action n'est exposée tant que les modules
 * cibles (interventions, SAV, capture photo) ne sont pas prêts.
 * Voir docs/runtime/hidden_modules.md pour les conditions de réactivation.
 *
 * Pour réactiver :
 *   1. Décommenter les entrées du tableau `actions` ci-dessous.
 *   2. Réintroduire l'état `open`, le hook `useNavigate`, les imports
 *      d'icônes Lucide et les composants `Sheet`/`Button` correspondants.
 *   3. Retirer le `return null` final.
 */

type FabAction = {
  label: string;
  // icon: typeof import("lucide-react").Wrench;
  onClick: () => void;
};

// Tableau d'actions volontairement vide tant que les modules cibles sont masqués.
const actions: FabAction[] = [
  // { label: "Démarrer une intervention", onClick: () => navigate("/interventions/new") },
  // { label: "Signaler un problème", onClick: () => navigate("/service-requests/new") },
  // { label: "Prendre une photo", onClick: () => { /* module photo */ } },
];

export function MobileFAB() {
  if (actions.length === 0) return null;
  return null;
}