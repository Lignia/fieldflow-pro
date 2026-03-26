import { useLocation, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Crumb {
  label: string;
  to?: string;
}

function useBreadcrumbs(): Crumb[] {
  const { pathname, state } = useLocation();
  const s = (state as any) ?? {};
  const segments = pathname.split("/").filter(Boolean);

  // /dashboard — no breadcrumb
  if (pathname === "/dashboard") return [];

  const crumbs: Crumb[] = [];

  // Determine breadcrumbs by route pattern
  const match = (pattern: string) => {
    const parts = pattern.split("/").filter(Boolean);
    if (parts.length !== segments.length) return false;
    return parts.every(
      (p, i) => p.startsWith(":") || p === segments[i]
    );
  };

  // ── Clients ──
  if (match("clients")) {
    crumbs.push({ label: "Clients" });
  } else if (match("clients/new")) {
    crumbs.push({ label: "Clients", to: "/clients" });
    crumbs.push({ label: "Nouveau client" });
  } else if (match("clients/:id")) {
    crumbs.push({ label: "Clients", to: "/clients" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Projects ──
  else if (match("projects")) {
    crumbs.push({ label: "Projets" });
  } else if (match("projects/new")) {
    crumbs.push({ label: "Projets", to: "/projects" });
    crumbs.push({ label: "Nouveau projet" });
  } else if (match("projects/:id")) {
    crumbs.push({ label: "Projets", to: "/projects" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  } else if (match("projects/:id/quotes/new")) {
    crumbs.push({ label: "Projets", to: "/projects" });
    crumbs.push({
      label: s.projectBreadcrumb ?? segments[1].slice(0, 8),
      to: `/projects/${segments[1]}`,
    });
    crumbs.push({ label: "Nouveau devis" });
  }

  // ── Technical surveys ──
  else if (match("technical-surveys/new")) {
    crumbs.push({ label: "Projets", to: "/projects" });
    crumbs.push({ label: "Relevé technique" });
  } else if (match("technical-surveys/:id")) {
    crumbs.push({ label: "Projets", to: "/projects" });
    crumbs.push({ label: s.breadcrumb ?? "Relevé technique" });
  }

  // ── Quotes ──
  else if (match("quotes")) {
    crumbs.push({ label: "Devis" });
  } else if (match("quotes/:id")) {
    crumbs.push({ label: "Devis", to: "/quotes" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Invoices ──
  else if (match("invoices")) {
    crumbs.push({ label: "Factures" });
  } else if (match("invoices/:id")) {
    crumbs.push({ label: "Factures", to: "/invoices" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Service requests ──
  else if (match("service-requests")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Demandes" });
  } else if (match("service-requests/new")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Demandes", to: "/service-requests" });
    crumbs.push({ label: "Nouvelle demande" });
  } else if (match("service-requests/:id")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Demandes", to: "/service-requests" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Interventions ──
  else if (match("interventions")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Interventions" });
  } else if (match("interventions/new")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Interventions", to: "/interventions" });
    crumbs.push({ label: "Nouvelle intervention" });
  } else if (match("interventions/:id")) {
    crumbs.push({ label: "SAV" });
    crumbs.push({ label: "Interventions", to: "/interventions" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Planning ──
  else if (match("planning")) {
    crumbs.push({ label: "Planning" });
  }

  // ── Installations ──
  else if (match("installations")) {
    crumbs.push({ label: "Parc" });
    crumbs.push({ label: "Installations" });
  } else if (match("installations/:id")) {
    crumbs.push({ label: "Parc" });
    crumbs.push({ label: "Installations", to: "/installations" });
    crumbs.push({ label: s.breadcrumb ?? segments[1].slice(0, 8) });
  }

  // ── Catalog ──
  else if (match("catalog")) {
    crumbs.push({ label: "Catalogue" });
  }

  return crumbs;
}

export function AppBreadcrumb() {
  const crumbs = useBreadcrumbs();
  const navigate = useNavigate();

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <BreadcrumbItem key={i} className="flex items-center">
              {i > 0 && <BreadcrumbSeparator className="mr-1.5" />}
              {isLast || !crumb.to ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => navigate(crumb.to!)}
                >
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
