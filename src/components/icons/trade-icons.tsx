import type { SVGProps } from "react";

type IconSVGProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = (size?: number): SVGProps<SVGSVGElement> => ({
  width: size ?? 24,
  height: size ?? 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

/** Poêle à bois / wood stove */
export function IconPoele({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <rect x="5" y="10" width="14" height="10" rx="1.5" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      <line x1="12" y1="14" x2="12" y2="17" />
      <path d="M9 4c.5-1.5 1.5-2 3-2s2.5.5 3 2" opacity=".5" />
      <line x1="8" y1="20" x2="8" y2="22" />
      <line x1="16" y1="20" x2="16" y2="22" />
    </svg>
  );
}

/** Cheminée / fireplace */
export function IconCheminee({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M3 22h18" />
      <path d="M5 22V10l7-6 7 6v12" />
      <rect x="8" y="14" width="8" height="8" rx="1" />
      <path d="M10 18c0-1.5 2-3 2-3s2 1.5 2 3" />
    </svg>
  );
}

/** Tubage / flue lining */
export function IconTubage({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M10 2h4v4h-4z" />
      <path d="M10 6v4c0 2-2 3-2 6v6h8v-6c0-3-2-4-2-6V6" />
      <line x1="8" y1="22" x2="16" y2="22" />
      <line x1="11" y1="12" x2="13" y2="12" opacity=".5" />
      <line x1="11" y1="15" x2="13" y2="15" opacity=".5" />
    </svg>
  );
}

/** Ramonage / chimney sweeping */
export function IconRamonage({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M9 2h6l1 3H8l1-3z" />
      <rect x="8" y="5" width="8" height="4" rx="0.5" />
      <line x1="12" y1="9" x2="12" y2="18" />
      <circle cx="12" cy="20" r="2" />
      <path d="M8 13h8" />
      <path d="M7 16h10" opacity=".5" />
    </svg>
  );
}

/** Chaudière / boiler */
export function IconChaudiere({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v-2" />
      <path d="M12 17v2" />
      <path d="M9 12H7" />
      <path d="M17 12h-2" />
      <path d="M4 8h16" opacity=".4" />
    </svg>
  );
}

/** Insert / fireplace insert */
export function IconInsert({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <rect x="6" y="9" width="12" height="8" rx="1" />
      <path d="M10 13c0-1 2-2.5 2-2.5s2 1.5 2 2.5-1 2-2 2-2-1-2-2z" />
      <line x1="3" y1="4" x2="21" y2="4" />
    </svg>
  );
}

/** Conduit / duct */
export function IconConduit({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <path d="M9 2v6c0 2 3 3 3 6v8" />
      <path d="M15 2v6c0 2-3 3-3 6v8" />
      <line x1="9" y1="2" x2="15" y2="2" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  );
}

/** Fumisterie / flue work */
export function IconFumisterie({ size, ...props }: IconSVGProps) {
  return (
    <svg {...defaults(size)} {...props}>
      <rect x="8" y="14" width="8" height="8" rx="1" />
      <path d="M10 14V10a2 2 0 0 1 4 0v4" />
      <path d="M8 22H6a1 1 0 0 1-1-1v-3h3" />
      <path d="M16 22h2a1 1 0 0 0 1-1v-3h-3" />
      <path d="M10 6c.5-2 1.5-3 2-4 .5 1 1.5 2 2 4" opacity=".5" />
    </svg>
  );
}
