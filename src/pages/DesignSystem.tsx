import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusType } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { QuoteKindBadge } from "@/components/QuoteKindBadge";
import { InvoiceKindBadge } from "@/components/InvoiceKindBadge";
import { ProjectCard } from "@/components/ProjectCard";
import { InterventionCard } from "@/components/InterventionCard";
import { PropertyCard } from "@/components/PropertyCard";
import { InstallationCard } from "@/components/InstallationCard";

// ─── Semantic color system ──────────────────────────────────────────────────
const COLOR_SYSTEM = [
  { color: "bg-muted text-muted-foreground", meaning: "Neutre", usage: "Brouillon, archivé, inactif" },
  { color: "bg-info/15 text-info", meaning: "En cours", usage: "Planifié, envoyé, nouveau" },
  { color: "bg-accent/15 text-accent", meaning: "Validé", usage: "Signé, payé, actif, complété" },
  { color: "bg-warning/15 text-warning", meaning: "Attention", usage: "En attente, expiré, partiel" },
  { color: "bg-destructive/10 text-destructive", meaning: "Problème", usage: "Annulé, en retard, échoué" },
];

// ─── Business contexts (NOT raw enums) ──────────────────────────────────────
const BUSINESS_CONTEXTS = [
  {
    id: "projet",
    title: "Projet",
    subtitle: "Cycle de vie d'une affaire",
    type: "project" as StatusType,
    flow: [
      { status: "lead_new", phase: "Prospection" },
      { status: "vt_planned", phase: "Visite technique" },
      { status: "final_quote_sent", phase: "Chiffrage" },
      { status: "signed", phase: "Signé" },
      { status: "installation_scheduled", phase: "Travaux" },
      { status: "closed", phase: "Terminé" },
    ],
    edge_cases: [
      { status: "on_hold" },
      { status: "lost" },
      { status: "cancelled" },
    ],
  },
  {
    id: "intervention",
    title: "Intervention",
    subtitle: "Suivi terrain",
    type: "intervention" as StatusType,
    flow: [
      { status: "planned", phase: "Planifié" },
      { status: "scheduled", phase: "Confirmé" },
      { status: "in_progress", phase: "En cours" },
      { status: "completed", phase: "Terminé" },
    ],
    edge_cases: [{ status: "cancelled" }],
  },
  {
    id: "devis",
    title: "Devis",
    subtitle: "Cycle commercial",
    type: "quote" as StatusType,
    flow: [
      { status: "draft", phase: "Brouillon" },
      { status: "sent", phase: "Envoyé" },
      { status: "signed", phase: "Signé" },
    ],
    edge_cases: [
      { status: "expired" },
      { status: "lost" },
      { status: "canceled" },
    ],
  },
  {
    id: "facture",
    title: "Facture",
    subtitle: "Suivi paiement",
    type: "invoice" as StatusType,
    flow: [
      { status: "draft", phase: "Brouillon" },
      { status: "sent", phase: "Envoyée" },
      { status: "paid", phase: "Payée" },
    ],
    edge_cases: [
      { status: "partial" },
      { status: "overdue" },
      { status: "canceled" },
    ],
  },
];

// ─── Scene components ───────────────────────────────────────────────────────

function ProjectScene() {
  return (
    <div className="space-y-3">
      <ProjectCard projectNumber="PRJ-2024-047" status="signed" customerName="M. Dupont" propertyCity="Annecy" amount={8450} date="2024-10-15" />
      <ProjectCard projectNumber="PRJ-2024-052" status="vt_planned" customerName="Mme Martin" propertyCity="Chambéry" date="2024-11-02" />
      <ProjectCard projectNumber="PRJ-2024-038" status="lost" customerName="M. Leroy" propertyCity="Grenoble" amount={12800} date="2024-09-20" />
    </div>
  );
}

function InterventionScene() {
  return (
    <div className="space-y-3">
      <InterventionCard type="sweep" status="scheduled" label="Ramonage annuel" customerName="M. Dupont" time="09:00" duration="1h" techName="Lucas B." techColor="bg-info/20 text-info" />
      <InterventionCard type="repair" status="in_progress" label="Fuite raccordement" customerName="Mme Fabre" time="14:00" duration="2h" techName="Julien R." techColor="bg-warning/20 text-warning" priority="high" />
      <InterventionCard type="commissioning" status="completed" label="Mise en service poêle" customerName="M. Bernard" time="16:30" duration="1h30" techName="Lucas B." techColor="bg-info/20 text-info" />
    </div>
  );
}

function PropertyScene() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <PropertyCard address="12 rue des Alpes" city="Annecy" type="house" installationCount={2} />
      <PropertyCard address="8 place Victor Hugo" city="Chambéry" type="apartment" installationCount={1} floor="3e étage" />
    </div>
  );
}

function InstallationScene() {
  return (
    <div className="space-y-3">
      <InstallationCard deviceType="Poêle à bois" brand="Stûv" model="30-compact" status="active" commissioningDate="2024-01-15" nextSweepDate="2025-01-15" />
      <InstallationCard deviceType="Insert granulés" brand="MCZ" model="Vivo 80" serialNumber="MCZ-2024-7891" status="commissioned" commissioningDate="2024-11-20" />
    </div>
  );
}

// ─── Local helpers ──────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function BadgeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function UsageScene({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-xl border border-border bg-card/50 p-5">{children}</div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DesignSystem() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Design System</h1>
          <p className="text-sm text-muted-foreground mt-1">Composants UI alignés sur le métier — pas sur le SQL.</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* 1 — Couleurs */}
        <section>
          <SectionTitle title="Système couleur" subtitle="5 couleurs. 5 significations. C'est tout." />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {COLOR_SYSTEM.map((c) => (
              <div key={c.meaning} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium", c.color)}>
                  {c.meaning}
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.usage}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2 — Statuts par contexte */}
        <section>
          <SectionTitle title="Statuts par contexte" subtitle="Chaque domaine a son flux principal + ses cas limites." />
          <div className="space-y-10 mt-6">
            {BUSINESS_CONTEXTS.map((ctx) => (
              <div key={ctx.id} className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{ctx.title}</h3>
                  <p className="text-sm text-muted-foreground">{ctx.subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {ctx.flow.map((step, i) => (
                    <React.Fragment key={step.status}>
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={step.status} type={ctx.type} size="md" />
                        <span className="text-[10px] text-muted-foreground">{step.phase}</span>
                      </div>
                      {i < ctx.flow.length - 1 && (
                        <span className="text-muted-foreground/40 text-lg select-none">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {ctx.edge_cases.length > 0 && (
                  <div className="flex items-center gap-3 pl-1">
                    <span className="text-xs text-muted-foreground font-medium">Cas limites :</span>
                    <div className="flex gap-2">
                      {ctx.edge_cases.map((ec) => (
                        <StatusBadge key={ec.status} status={ec.status} type={ctx.type} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3 — Badges métier */}
        <section>
          <SectionTitle title="Badges métier" subtitle="Typologies : client, devis, facture." />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <BadgeGroup title="Type client">
              {(["particulier", "professionnel", "collectivite"] as const).map((t) => (
                <CustomerBadge key={t} type={t} />
              ))}
            </BadgeGroup>
            <BadgeGroup title="Type devis">
              {(["estimate", "final", "service"] as const).map((k) => (
                <QuoteKindBadge key={k} kind={k} />
              ))}
            </BadgeGroup>
            <BadgeGroup title="Type facture">
              {(["deposit", "final", "service", "credit_note"] as const).map((k) => (
                <InvoiceKindBadge key={k} kind={k} />
              ))}
            </BadgeGroup>
          </div>
        </section>

        {/* 4 — Composants en contexte */}
        <section>
          <SectionTitle title="Composants en contexte" subtitle="Pas des listes — des scènes d'usage réel." />
          <div className="space-y-12 mt-8">
            <UsageScene title="Projets" description="Carte projet dans une liste ou un kanban.">
              <ProjectScene />
            </UsageScene>
            <UsageScene title="Interventions" description="Planning ou liste du jour d'un technicien.">
              <InterventionScene />
            </UsageScene>
            <UsageScene title="Biens" description="Propriétés rattachées à un client.">
              <PropertyScene />
            </UsageScene>
            <UsageScene title="Installations" description="Équipements suivis dans le parc.">
              <InstallationScene />
            </UsageScene>
          </div>
        </section>

        {/* 5 — Tailles */}
        <section>
          <SectionTitle title="Tailles" subtitle="2 tailles. sm pour les listes, md pour les cartes." />
          <div className="flex items-end gap-6 mt-6">
            <div className="flex flex-col items-center gap-2">
              <StatusBadge status="signed" type="project" size="sm" />
              <span className="text-xs text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <StatusBadge status="signed" type="project" size="md" />
              <span className="text-xs text-muted-foreground">md</span>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
