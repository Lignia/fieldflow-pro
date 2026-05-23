/**
 * Traduction des erreurs Supabase / PostgreSQL en messages compréhensibles.
 *
 * PHILOSOPHIE :
 * - On ne traduit QUE les erreurs dont on est CERTAIN de la cause.
 * - Les autres erreurs passent brut → préserve l'observabilité.
 * - À chaque bug terrain identifié, on ajoute UN pattern (et pas avant).
 *
 * NIVEAUX :
 * - "user"   : l'utilisateur peut corriger lui-même (ex: ligne vide)
 * - "auth"   : action de l'utilisateur (se reconnecter)
 * - "system" : problème technique, l'utilisateur ne peut pas corriger
 *
 * Pour V1, on retourne juste un objet typé. La différenciation visuelle
 * (toast.error vs toast.warning vs toast.info) sera ajoutée plus tard.
 */

export type ErrorSeverity = "user" | "auth" | "system";

export interface HumanError {
  message: string;
  severity: ErrorSeverity;
  /** Message brut original, pour debug / Sentry plus tard */
  raw: string;
}

const PATTERNS: Array<{
  match: RegExp;
  message: string;
  severity: ErrorSeverity;
}> = [
  // ─── USER : l'artisan peut corriger ──────────────────────────────
  {
    match: /quote_lines_qty_check/,
    message:
      "Une ligne sans quantité a été détectée. Supprimez les lignes texte vides puis réessayez.",
    severity: "user",
  },

  // ─── AUTH : reconnexion nécessaire ───────────────────────────────
  {
    match: /AUTH_REQUIRED/,
    message: "Votre session a expiré. Reconnectez-vous pour continuer.",
    severity: "auth",
  },
  {
    match: /JWT expired|invalid JWT/i,
    message: "Votre session a expiré. Reconnectez-vous pour continuer.",
    severity: "auth",
  },
  {
    match: /violates row-level security policy|row-level security/i,
    message: "Vous n'avez pas accès à cette ressource.",
    severity: "auth",
  },

  // ─── SYSTEM : problème réseau ────────────────────────────────────
  {
    match: /Failed to fetch|NetworkError|Network request failed/i,
    message:
      "Connexion impossible. Vérifiez votre réseau puis réessayez.",
    severity: "system",
  },
];

const DEFAULT_FALLBACK: HumanError = {
  message:
    "Une erreur s'est produite. Réessayez ou contactez le support si le problème persiste.",
  severity: "system",
  raw: "",
};

/**
 * Extrait un message brut depuis Error, string, PostgrestError, etc.
 */
function extractRawMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    // PostgrestError shape : { message, details, hint, code }
    if (typeof obj.details === "string") return String(obj.details);
  }
  return "";
}

/**
 * Convertit une erreur en HumanError. Si aucun pattern ne matche, retourne
 * le message brut (préservation de l'observabilité) + severity "system".
 *
 * Utilisation côté composant :
 *   try { ... }
 *   catch (err) {
 *     const { message } = humanizeError(err);
 *     toast.error(message);
 *   }
 */
export function humanizeError(err: unknown): HumanError {
  const raw = extractRawMessage(err);
  if (!raw) return { ...DEFAULT_FALLBACK, raw: "" };

  for (const pattern of PATTERNS) {
    if (pattern.match.test(raw)) {
      if (typeof console !== "undefined") {
        console.error("[humanizeError]", {
          raw,
          hadPattern: true,
          severity: pattern.severity,
        });
      }
      return {
        message: pattern.message,
        severity: pattern.severity,
        raw,
      };
    }
  }

  // Pas de match : on retourne le message brut.
  // C'est VOLONTAIRE : préserve l'observabilité, l'artisan signalera le bug
  // au support et on ajoutera un pattern à ce moment.
  if (typeof console !== "undefined") {
    console.error("[humanizeError]", { raw, hadPattern: false });
  }

  return {
    message: raw,
    severity: "system",
    raw,
  };
}

/**
 * Helper pratique pour les call sites qui veulent juste un string.
 * Équivalent à humanizeError(err).message.
 */
export function humanizeErrorMessage(err: unknown): string {
  return humanizeError(err).message;
}
