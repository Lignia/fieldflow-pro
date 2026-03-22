import type { SVGProps } from "react";

type IconSVGProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = (size?: number): SVGProps<SVGSVGElement> => ({
  width: size ?? 24,
  height: size ?? 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/**
 * Poêle à bois — corps trapézoïdal sur pieds, vitre avec flamme, conduit sortant par le haut
 */
export function IconPoele({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Corps du poêle — forme légèrement trapézoïdale */}
      <path d="M6 9h12v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9z" />
      {/* Dessus du poêle */}
      <path d="M5.5 9h13" strokeWidth="2" />
      {/* Pieds */}
      <line x1="8" y1="20" x2="7" y2="22" />
      <line x1="16" y1="20" x2="17" y2="22" />
      {/* Vitre / porte */}
      <rect x="9" y="11.5" width="6" height="5" rx="0.5" />
      {/* Flamme dans la vitre */}
      <path d="M12 15.5c0-1.2-1-2-1-2s1-.3 1.5.5c.3-.8-.5-1.5-.5-1.5s1.5.8 1.5 2c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5" fill="currentColor" fillOpacity="0.15" strokeWidth="0" />
      {/* Conduit sortant du haut */}
      <path d="M12 9V5" />
      <path d="M10.5 5h3" />
      {/* Petite fumée */}
      <path d="M11.5 4c-.3-.8 0-1.5.5-2 .5.5.8 1.2.5 2" opacity="0.4" strokeWidth="1.25" />
    </svg>
  );
}

/**
 * Cheminée — foyer ouvert maçonné avec manteau, âtre et flamme
 */
export function IconCheminee({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Manteau de cheminée */}
      <path d="M3 22V12l3-4h12l3 4v10" />
      {/* Tablette supérieure */}
      <path d="M2 12h20" strokeWidth="2" />
      {/* Ouverture du foyer — arche */}
      <path d="M8 22v-6a4 4 0 0 1 8 0v6" />
      {/* Flamme */}
      <path d="M11 19c0-1.5 1-2.5 1-2.5s1 1 1 2.5" fill="currentColor" fillOpacity="0.15" strokeWidth="1.25" />
      {/* Sol */}
      <line x1="2" y1="22" x2="22" y2="22" strokeWidth="2" />
      {/* Briques */}
      <line x1="5" y1="14" x2="5" y2="16" opacity="0.3" strokeWidth="1" />
      <line x1="19" y1="14" x2="19" y2="16" opacity="0.3" strokeWidth="1" />
    </svg>
  );
}

/**
 * Tubage — tube inox dans un conduit maçonné, avec raccords visibles
 */
export function IconTubage({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Conduit maçonné extérieur */}
      <path d="M7 2h10v20H7z" opacity="0.2" strokeWidth="1" />
      {/* Tube inox intérieur */}
      <rect x="9.5" y="3" width="5" height="18" rx="0.5" />
      {/* Raccords / colliers */}
      <line x1="9" y1="7" x2="15" y2="7" strokeWidth="2" />
      <line x1="9" y1="13" x2="15" y2="13" strokeWidth="2" />
      <line x1="9" y1="19" x2="15" y2="19" strokeWidth="2" />
      {/* Chapeau pare-pluie en haut */}
      <path d="M8 3h8" strokeWidth="2" />
      <path d="M10 1.5h4" />
      <path d="M12 1.5V0.5" strokeWidth="1.25" />
    </svg>
  );
}

/**
 * Ramonage — hérisson (brosse ronde) + perche dans un conduit
 */
export function IconRamonage({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Conduit */}
      <path d="M8 2v20" opacity="0.25" />
      <path d="M16 2v20" opacity="0.25" />
      {/* Perche / canne */}
      <line x1="12" y1="1" x2="12" y2="22" strokeWidth="1.5" />
      {/* Hérisson — brosse ronde avec picots */}
      <circle cx="12" cy="12" r="3.5" strokeWidth="1.75" />
      {/* Picots du hérisson */}
      <line x1="12" y1="8" x2="12" y2="7" strokeWidth="1.25" />
      <line x1="12" y1="16" x2="12" y2="17" strokeWidth="1.25" />
      <line x1="8" y1="12" x2="7" y2="12" strokeWidth="1.25" />
      <line x1="16" y1="12" x2="17" y2="12" strokeWidth="1.25" />
      <line x1="9.5" y1="9.5" x2="8.8" y2="8.8" strokeWidth="1.25" />
      <line x1="14.5" y1="14.5" x2="15.2" y2="15.2" strokeWidth="1.25" />
      <line x1="9.5" y1="14.5" x2="8.8" y2="15.2" strokeWidth="1.25" />
      <line x1="14.5" y1="9.5" x2="15.2" y2="8.8" strokeWidth="1.25" />
      {/* Suie / particules */}
      <circle cx="6" cy="6" r="0.5" fill="currentColor" opacity="0.2" strokeWidth="0" />
      <circle cx="17" cy="4" r="0.4" fill="currentColor" opacity="0.2" strokeWidth="0" />
    </svg>
  );
}

/**
 * Chaudière bois — caisson rectangulaire haut, porte de chargement, tuyaux
 */
export function IconChaudiere({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Corps principal */}
      <rect x="5" y="3" width="14" height="17" rx="1.5" />
      {/* Porte de chargement */}
      <rect x="7.5" y="6" width="9" height="6" rx="0.75" />
      {/* Poignée porte */}
      <line x1="14.5" y1="8" x2="14.5" y2="10" strokeWidth="2" />
      {/* Panneau de contrôle / thermomètre */}
      <circle cx="12" cy="16" r="1.5" />
      <line x1="12" y1="15.5" x2="12" y2="14.5" strokeWidth="1.25" />
      {/* Tuyaux eau chaude sortant du haut */}
      <path d="M8 3V1" />
      <path d="M16 3V1" />
      {/* Pieds */}
      <line x1="7" y1="20" x2="7" y2="22" strokeWidth="1.5" />
      <line x1="17" y1="20" x2="17" y2="22" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Insert — cadre encastré dans un mur, vitre avec flamme
 */
export function IconInsert({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Mur / encadrement */}
      <rect x="2" y="4" width="20" height="16" rx="0.5" opacity="0.2" strokeWidth="1" />
      {/* Cadre de l'insert */}
      <rect x="4" y="6" width="16" height="12" rx="1" strokeWidth="2" />
      {/* Vitre */}
      <rect x="6" y="8" width="12" height="8" rx="0.5" />
      {/* Flamme centrale */}
      <path d="M12 14.5c0-1.8-1.5-3-1.5-3s1.5-.5 2 .8c.3-1-.5-2-.5-2s2 1 2 3c0 1.2-1 2-2 2s-2-.8-2-2" fill="currentColor" fillOpacity="0.12" strokeWidth="0" />
      {/* Bûches */}
      <line x1="8" y1="15" x2="11" y2="14.5" strokeWidth="1.25" opacity="0.5" />
      <line x1="13" y1="14.5" x2="16" y2="15" strokeWidth="1.25" opacity="0.5" />
      {/* Ventilation du haut */}
      <line x1="8" y1="7" x2="10" y2="7" opacity="0.3" strokeWidth="1" />
      <line x1="11" y1="7" x2="13" y2="7" opacity="0.3" strokeWidth="1" />
      <line x1="14" y1="7" x2="16" y2="7" opacity="0.3" strokeWidth="1" />
    </svg>
  );
}

/**
 * Conduit — tube double paroi vertical avec chapeau pare-pluie et colliers
 */
export function IconConduit({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Tube extérieur double paroi */}
      <path d="M8 5v17" />
      <path d="M16 5v17" />
      {/* Tube intérieur */}
      <path d="M10 5v17" opacity="0.3" strokeWidth="1" />
      <path d="M14 5v17" opacity="0.3" strokeWidth="1" />
      {/* Chapeau pare-pluie */}
      <path d="M6 5h12" strokeWidth="2" />
      <path d="M7 5l5-3 5 3" />
      {/* Colliers de fixation */}
      <rect x="7" y="10" width="10" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.1" />
      <rect x="7" y="16" width="10" height="1.5" rx="0.5" fill="currentColor" fillOpacity="0.1" />
      {/* Base / sortie */}
      <path d="M7 22h10" strokeWidth="2" />
    </svg>
  );
}

/**
 * Fumisterie — pièces de raccordement : coude + té de purge
 */
export function IconFumisterie({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Tube vertical haut */}
      <path d="M9 2h6v6H9z" />
      {/* Coude 90° */}
      <path d="M9 8c0 3 3 4 6 4" strokeWidth="1.75" />
      <path d="M15 8c0 3-1 4-1 4" opacity="0.3" strokeWidth="1" />
      {/* Tube horizontal */}
      <path d="M15 10h6" strokeWidth="1.75" />
      <path d="M15 14h6" strokeWidth="1.75" />
      {/* Té de purge en bas */}
      <path d="M4 16h8" strokeWidth="1.75" />
      <path d="M4 20h8" strokeWidth="1.75" />
      <path d="M4 16v4" />
      <path d="M12 16v4" />
      {/* Bouchon de purge */}
      <path d="M8 20v2" strokeWidth="2" />
      <circle cx="8" cy="22.5" r="0.75" fill="currentColor" strokeWidth="0" />
      {/* Raccord / emboîtement */}
      <line x1="9" y1="5" x2="15" y2="5" opacity="0.3" strokeWidth="1" />
    </svg>
  );
}

/**
 * Poêle à granulés — variante avec trémie/réservoir visible
 */
export function IconPoeleGranules({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Corps du poêle — plus haut et fin */}
      <rect x="7" y="6" width="10" height="14" rx="1.5" />
      {/* Trémie / réservoir granulés en haut */}
      <path d="M8.5 6V4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5V6" />
      {/* Granulés dans la trémie */}
      <circle cx="11" cy="5" r="0.4" fill="currentColor" opacity="0.3" strokeWidth="0" />
      <circle cx="12.5" cy="4.8" r="0.4" fill="currentColor" opacity="0.3" strokeWidth="0" />
      <circle cx="13.5" cy="5.2" r="0.4" fill="currentColor" opacity="0.3" strokeWidth="0" />
      {/* Vitre */}
      <rect x="9" y="9" width="6" height="5" rx="0.5" />
      {/* Flamme */}
      <path d="M12 12.5c0-1-0.8-1.5-0.8-1.5s0.8-.2 1 .4c.2-.6-.2-1-.2-1s1 .6 1 1.5c0 .6-.5 1-1 1s-1-.5-1-1" fill="currentColor" fillOpacity="0.15" strokeWidth="0" />
      {/* Panneau de contrôle digital */}
      <rect x="9.5" y="15.5" width="5" height="2" rx="0.5" opacity="0.4" />
      {/* Conduit */}
      <path d="M14 6V2.5" />
      {/* Pieds */}
      <line x1="9" y1="20" x2="8.5" y2="22" />
      <line x1="15" y1="20" x2="15.5" y2="22" />
    </svg>
  );
}

/**
 * Poêle à bûches — variante classique avec bûches visibles
 */
export function IconPoeleBuches({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Corps arrondi */}
      <path d="M6 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z" />
      {/* Dessus */}
      <path d="M5.5 8h13" strokeWidth="2" />
      {/* Vitre grande */}
      <rect x="8" y="10" width="8" height="6" rx="1" />
      {/* Bûches dans le foyer */}
      <line x1="9" y1="15" x2="12" y2="14" strokeWidth="1.5" opacity="0.4" />
      <line x1="12" y1="14" x2="15" y2="15" strokeWidth="1.5" opacity="0.4" />
      <line x1="10" y1="14.5" x2="14" y2="14.5" strokeWidth="1" opacity="0.25" />
      {/* Flamme */}
      <path d="M12 13c0-1-.7-1.5-.7-1.5s.7 0 1 .5c.2-.5-.3-1-.3-1s1 .5 1 1.5c0 .5-.5 1-1 1s-1-.5-1-1" fill="currentColor" fillOpacity="0.15" strokeWidth="0" />
      {/* Conduit */}
      <path d="M12 8V4" />
      <path d="M10.5 4h3" />
      {/* Pieds */}
      <line x1="8" y1="20" x2="7.5" y2="22" />
      <line x1="16" y1="20" x2="16.5" y2="22" />
    </svg>
  );
}

/**
 * Foyer fermé — insert vitré encastré dans un cadre maçonné, flamme visible derrière la vitre
 */
export function IconFoyerFerme({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Cadre maçonné */}
      <rect x="3" y="5" width="18" height="15" rx="1" />
      {/* Vitre / porte vitrée avec cadre épais */}
      <rect x="5.5" y="7" width="13" height="11" rx="0.5" strokeWidth="2" />
      {/* Reflet vitre */}
      <line x1="7" y1="8" x2="8.5" y2="10" opacity="0.15" strokeWidth="1.25" />
      {/* Flamme derrière la vitre */}
      <path d="M12 15c0-2-1.5-3-1.5-3s1.5-.5 2 .8c.3-1-.5-2-.5-2s2 1.2 2 3c0 1.2-1 2-2 2s-2-.8-2-2" fill="currentColor" fillOpacity="0.12" strokeWidth="0" />
      {/* Bûches */}
      <line x1="8.5" y1="16.5" x2="11.5" y2="16" strokeWidth="1.25" opacity="0.4" />
      <line x1="12.5" y1="16" x2="15.5" y2="16.5" strokeWidth="1.25" opacity="0.4" />
      {/* Poignée */}
      <line x1="17" y1="11.5" x2="17" y2="13.5" strokeWidth="2" />
      {/* Tablette dessus */}
      <path d="M2 5h20" strokeWidth="2" />
    </svg>
  );
}

/**
 * Foyer ouvert — cheminée traditionnelle ouverte sans vitre, flamme libre
 */
export function IconFoyerOuvert({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Manteau de cheminée */}
      <path d="M4 20V10l2-3h12l2 3v10" />
      {/* Tablette */}
      <path d="M3 10h18" strokeWidth="2" />
      {/* Ouverture large (pas de vitre) */}
      <path d="M7 20v-7h10v7" />
      {/* Grille / chenets */}
      <line x1="8" y1="19" x2="16" y2="19" strokeWidth="1.25" opacity="0.3" />
      <line x1="9" y1="19" x2="9" y2="17.5" strokeWidth="1.25" opacity="0.3" />
      <line x1="15" y1="19" x2="15" y2="17.5" strokeWidth="1.25" opacity="0.3" />
      {/* Bûches croisées */}
      <line x1="9" y1="18" x2="13" y2="16.5" strokeWidth="1.5" opacity="0.35" />
      <line x1="11" y1="16.5" x2="15" y2="18" strokeWidth="1.5" opacity="0.35" />
      {/* Flamme libre — plus grande car foyer ouvert */}
      <path d="M12 15.5c0-2.2-1.5-3.5-1.5-3.5s1.5-.3 2 1c.4-1.2-.3-2.2-.3-2.2s2.2 1.2 2.2 3.5c0 1.3-1.1 2.2-2.2 2.2s-2.2-1-2.2-2.2" fill="currentColor" fillOpacity="0.1" strokeWidth="0" />
      {/* Sol */}
      <line x1="2" y1="20" x2="22" y2="20" strokeWidth="2" />
    </svg>
  );
}

/**
 * Plaque de sol — rectangle de protection au sol sous un appareil
 */
export function IconPlaqueSol({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Plaque en perspective isométrique */}
      <path d="M4 16l8 4 8-4-8-4z" strokeWidth="1.75" fill="currentColor" fillOpacity="0.06" />
      {/* Bord épais de la plaque */}
      <path d="M4 16v1.5l8 4v-1.5" opacity="0.3" strokeWidth="1.25" />
      <path d="M20 16v1.5l-8 4v-1.5" opacity="0.3" strokeWidth="1.25" />
      {/* Silhouette poêle posé dessus */}
      <rect x="9" y="6" width="6" height="8" rx="1" opacity="0.25" strokeWidth="1.25" />
      <path d="M12 6V3.5" opacity="0.25" strokeWidth="1.25" />
      {/* Marqueur matériau (carré dans la plaque) */}
      <path d="M10 15l2 1 2-1" opacity="0.3" strokeWidth="1" />
      {/* Cotes / flèches de dimension */}
      <line x1="3" y1="18" x2="3" y2="14" strokeWidth="1" opacity="0.2" />
      <line x1="2.5" y1="14" x2="3.5" y2="14" strokeWidth="1" opacity="0.2" />
      <line x1="2.5" y1="18" x2="3.5" y2="18" strokeWidth="1" opacity="0.2" />
    </svg>
  );
}

/**
 * Protection murale — écran thermique fixé au mur derrière un poêle
 */
export function IconProtectionMurale({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Mur en arrière-plan */}
      <rect x="2" y="2" width="20" height="20" rx="0.5" opacity="0.1" strokeWidth="1" />
      {/* Panneau de protection (écran thermique) */}
      <rect x="5" y="4" width="14" height="14" rx="1" strokeWidth="1.75" />
      {/* Texture / motif du panneau */}
      <line x1="8" y1="4" x2="8" y2="18" opacity="0.1" strokeWidth="1" />
      <line x1="12" y1="4" x2="12" y2="18" opacity="0.1" strokeWidth="1" />
      <line x1="16" y1="4" x2="16" y2="18" opacity="0.1" strokeWidth="1" />
      {/* Fixations / entretoises (écart avec le mur) */}
      <circle cx="7" cy="6.5" r="0.75" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
      <circle cx="17" cy="6.5" r="0.75" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
      <circle cx="7" cy="15.5" r="0.75" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
      <circle cx="17" cy="15.5" r="0.75" fill="currentColor" fillOpacity="0.3" strokeWidth="0" />
      {/* Rayonnement thermique (ondes) */}
      <path d="M5 21c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0" opacity="0.25" strokeWidth="1.25" />
    </svg>
  );
}

/**
 * Arrivée d'air frais — grille d'amenée d'air comburant traversant un mur
 */
export function IconArriveeAir({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Mur en coupe */}
      <rect x="9" y="2" width="6" height="20" rx="0.5" opacity="0.15" strokeWidth="1" />
      {/* Conduit traversant le mur */}
      <rect x="7" y="10" width="10" height="4" rx="0.5" />
      {/* Grille extérieure (gauche) */}
      <line x1="5" y1="10.5" x2="5" y2="13.5" strokeWidth="1.75" />
      <line x1="4" y1="11" x2="4" y2="13" strokeWidth="1.25" opacity="0.5" />
      <line x1="6" y1="11" x2="6" y2="13" strokeWidth="1.25" opacity="0.5" />
      {/* Flèches d'air entrant */}
      <path d="M1 12h3" strokeWidth="1.5" />
      <path d="M2.5 10.5L4 12l-1.5 1.5" strokeWidth="1.25" />
      {/* Grille intérieure (droite) */}
      <line x1="19" y1="10.5" x2="19" y2="13.5" strokeWidth="1.75" />
      <line x1="18" y1="11" x2="18" y2="13" strokeWidth="1.25" opacity="0.5" />
      <line x1="20" y1="11" x2="20" y2="13" strokeWidth="1.25" opacity="0.5" />
      {/* Flux d'air intérieur */}
      <path d="M20.5 12h2" strokeWidth="1.25" opacity="0.4" />
      <path d="M21.5 11L23 12l-1.5 1" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

/**
 * Distribution d'air chaud — gaines + moteur + bouches de diffusion
 */
export function IconDistributionAir({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Moteur / caisson central */}
      <rect x="9" y="3" width="6" height="5" rx="1" />
      {/* Ventilateur dans le caisson */}
      <circle cx="12" cy="5.5" r="1.5" strokeWidth="1.25" />
      <path d="M12 4l.5 1.5M12 4l-.5 1.5" strokeWidth="1" opacity="0.4" />
      {/* Gaine gauche */}
      <path d="M9 5.5H4a1 1 0 0 0-1 1V14" strokeWidth="1.75" />
      {/* Gaine droite */}
      <path d="M15 5.5h5a1 1 0 0 1 1 1V14" strokeWidth="1.75" />
      {/* Gaine centre vers le bas */}
      <path d="M12 8v6" strokeWidth="1.75" />
      {/* Bouches de diffusion (3) */}
      <rect x="1.5" y="14" width="3" height="2" rx="0.5" />
      <rect x="10.5" y="14" width="3" height="2" rx="0.5" />
      <rect x="19.5" y="14" width="3" height="2" rx="0.5" />
      {/* Flux d'air chaud sortant des bouches */}
      <path d="M3 17v2" opacity="0.3" strokeWidth="1.25" />
      <path d="M12 17v2" opacity="0.3" strokeWidth="1.25" />
      <path d="M21 17v2" opacity="0.3" strokeWidth="1.25" />
      <path d="M2 18.5v1.5" opacity="0.15" strokeWidth="1" />
      <path d="M4 18.5v1.5" opacity="0.15" strokeWidth="1" />
      <path d="M11 18.5v1.5" opacity="0.15" strokeWidth="1" />
      <path d="M13 18.5v1.5" opacity="0.15" strokeWidth="1" />
      <path d="M20 18.5v1.5" opacity="0.15" strokeWidth="1" />
      <path d="M22 18.5v1.5" opacity="0.15" strokeWidth="1" />
    </svg>
  );
}

/**
 * Chapeau pare-pluie — coiffe de protection en haut d'un conduit de cheminée
 */
export function IconChapeauParePluie({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Conduit / tube sortant */}
      <path d="M9 22V12" strokeWidth="1.75" />
      <path d="M15 22V12" strokeWidth="1.75" />
      {/* Collerette / embase */}
      <path d="M7.5 12h9" strokeWidth="2" />
      {/* Tige centrale de fixation */}
      <line x1="12" y1="12" x2="12" y2="7" strokeWidth="1.5" />
      {/* Chapeau conique */}
      <path d="M5 7l7-4 7 4" strokeWidth="1.75" />
      {/* Dessous du chapeau */}
      <path d="M5 7h14" strokeWidth="1.5" />
      {/* Entretoises / pattes de fixation */}
      <line x1="8" y1="7" x2="9" y2="12" opacity="0.3" strokeWidth="1" />
      <line x1="16" y1="7" x2="15" y2="12" opacity="0.3" strokeWidth="1" />
      {/* Gouttes de pluie déviées */}
      <path d="M3 5l-.5 1.5" opacity="0.25" strokeWidth="1.25" />
      <path d="M21 5l.5 1.5" opacity="0.25" strokeWidth="1.25" />
      <path d="M4.5 8l-.5 1.5" opacity="0.2" strokeWidth="1" />
      <path d="M19.5 8l.5 1.5" opacity="0.2" strokeWidth="1" />
    </svg>
  );
}

/**
 * Toiture / Souche — sortie de toit avec souche maçonnée et solin
 */
export function IconToitureSouche({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      {/* Pente du toit */}
      <path d="M1 16l11-10 11 10" strokeWidth="1.75" />
      {/* Couverture / tuiles */}
      <path d="M1 16h22" strokeWidth="1.5" />
      {/* Souche maçonnée dépassant du toit */}
      <rect x="8" y="4" width="5" height="9" rx="0.5" />
      {/* Briques de la souche */}
      <line x1="8" y1="6.5" x2="13" y2="6.5" opacity="0.2" strokeWidth="1" />
      <line x1="8" y1="9" x2="13" y2="9" opacity="0.2" strokeWidth="1" />
      <line x1="10.5" y1="4" x2="10.5" y2="6.5" opacity="0.15" strokeWidth="1" />
      <line x1="10.5" y1="6.5" x2="10.5" y2="9" opacity="0.15" strokeWidth="1" />
      {/* Solin / abergement */}
      <path d="M7 13l1-2.5h5l1 2.5" strokeWidth="1.5" opacity="0.5" />
      {/* Couronnement de souche */}
      <path d="M7.5 4h6" strokeWidth="2" />
      {/* Mitre / sortie */}
      <path d="M9.5 2.5h2" strokeWidth="1.25" />
      <line x1="10.5" y1="2.5" x2="10.5" y2="4" strokeWidth="1.25" />
      {/* Pente du toit côté bas */}
      <path d="M3 18l9 4 9-4" opacity="0.15" strokeWidth="1" />
    </svg>
  );
}
