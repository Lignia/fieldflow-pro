import { StatusBadge } from "@/components/StatusBadge";
import { CustomerBadge } from "@/components/CustomerBadge";
import { QuoteKindBadge } from "@/components/QuoteKindBadge";
import { InvoiceKindBadge } from "@/components/InvoiceKindBadge";
import { ProjectCard } from "@/components/ProjectCard";
import { InterventionCard } from "@/components/InterventionCard";
import { PropertyCard } from "@/components/PropertyCard";
import { InstallationCard } from "@/components/InstallationCard";

/* ─── Enum groups for StatusBadge ─── */
const STATUS_GROUPS = [
  {
    title: "core.project_status",
    description: "Pipeline projet — 17 statuts",
    type: "project" as const,
    values: [
      "lead_new", "lead_qualified", "vt_planned", "vt_done",
      "tech_review_done", "estimate_sent", "final_quote_sent",
      "signed", "deposit_paid", "supplier_ordered", "material_received",
      "installation_scheduled", "mes_done", "closed",
      "on_hold", "lost", "cancelled",
    ],
  },
  {
    title: "core.installation_status",
    description: "Parc installé — 5 statuts",
    type: "installation" as const,
    values: ["draft", "planned", "installed", "commissioned", "active"],
  },
  {
    title: "core.survey_status",
    description: "Relevé technique — 3 statuts",
    type: "survey" as const,
    values: ["draft", "validated", "superseded"],
  },
  {
    title: "operations.service_request_status",
    description: "Demandes SAV — 6 statuts",
    type: "service_request" as const,
    values: ["new", "qualified", "scheduled", "in_progress", "closed", "cancelled"],
  },
  {
    title: "operations.intervention_status",
    description: "Interventions terrain — 5 statuts",
    type: "intervention" as const,
    values: ["planned", "scheduled", "in_progress", "completed", "cancelled"],
  },
  {
    title: "operations.intervention_type",
    description: "Types d'intervention — 8 valeurs",
    type: "intervention_type" as const,
    values: [
      "sweep", "annual_service", "repair", "diagnostic",
      "commissioning", "installation", "commercial_visit", "technical_survey",
    ],
  },
  {
    title: "billing.quote_status",
    description: "Devis — 6 statuts",
    type: "quote" as const,
    values: ["draft", "sent", "signed", "lost", "expired", "canceled"],
  },
  {
    title: "billing.invoice_status",
    description: "Factures — 7 statuts",
    type: "invoice" as const,
    values: ["draft", "sent", "paid", "partial", "overdue", "canceled", "void"],
  },
  {
    title: "billing.payment_status",
    description: "Paiements — 5 statuts",
    type: "payment" as const,
    values: ["pending", "succeeded", "failed", "refunded", "canceled"],
  },
  {
    title: "billing.payment_method",
    description: "Modes de paiement — 6 valeurs",
    type: "payment_method" as const,
    values: ["card", "bank_transfer", "cash", "check", "direct_debit", "other"],
  },
];

export default function DesignSystem() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>
          Design System
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Composants alignés sur le schéma SQL V1 — 55 variantes StatusBadge + composants P1
        </p>
      </div>

      {/* ── StatusBadge — all 55 variants ── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold border-b pb-2">StatusBadge</h2>
        {STATUS_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <div>
              <h3 className="text-sm font-medium font-mono">{group.title}</h3>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.values.map((v) => (
                <div key={v} className="flex flex-col items-center gap-1">
                  <StatusBadge status={v} type={group.type} />
                  <span className="text-[10px] font-mono text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Size variant */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Tailles</h3>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <StatusBadge status="signed" size="sm" />
              <span className="text-[10px] text-muted-foreground">sm (défaut)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <StatusBadge status="signed" size="md" />
              <span className="text-[10px] text-muted-foreground">md</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Kind Badges ── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold border-b pb-2">Badges métier</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium font-mono">CustomerBadge</h3>
            <p className="text-xs text-muted-foreground">core.customer_type — 3 valeurs</p>
            <div className="flex flex-wrap gap-2">
              {(["particulier", "professionnel", "collectivite"] as const).map((t) => (
                <CustomerBadge key={t} customerType={t} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium font-mono">QuoteKindBadge</h3>
            <p className="text-xs text-muted-foreground">billing.quote_kind — 3 valeurs</p>
            <div className="flex flex-wrap gap-2">
              {(["estimate", "final", "service"] as const).map((k) => (
                <QuoteKindBadge key={k} kind={k} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium font-mono">InvoiceKindBadge</h3>
            <p className="text-xs text-muted-foreground">billing.invoice_kind — 4 valeurs</p>
            <div className="flex flex-wrap gap-2">
              {(["deposit", "final", "service", "credit_note"] as const).map((k) => (
                <InvoiceKindBadge key={k} kind={k} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ProjectCard ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">ProjectCard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProjectCard
            projectNumber="PRJ-2024-0042"
            status="vt_planned"
            customerName="M. Dupont"
            propertyCity="Limoges"
            amount={8450}
            date="18 mars 2024"
            type="Poêle à granulés"
          />
          <ProjectCard
            projectNumber="PRJ-2024-0038"
            status="signed"
            customerName="Mme Martin"
            propertyCity="Brive"
            amount={12800}
            date="12 mars 2024"
            type="Insert bois + tubage"
          />
          <ProjectCard
            projectNumber="PRJ-2024-0035"
            status="on_hold"
            customerName="M. Garcia"
            propertyCity="Tulle"
            date="5 mars 2024"
            type="Chaudière bois"
          />
        </div>
      </section>

      {/* ── InterventionCard ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">InterventionCard</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <InterventionCard
            type="installation"
            status="in_progress"
            label="Pose poêle + tubage"
            customerName="M. Lemoine"
            time="08:00"
            duration="6h"
            techName="J. Morel"
            techColor="bg-accent/15 text-accent"
          />
          <InterventionCard
            type="sweep"
            status="scheduled"
            label="Ramonage annuel conduit inox"
            customerName="Mme Petit"
            time="09:00"
            duration="1h"
            techName="P. Roux"
            techColor="bg-info/15 text-info"
          />
          <InterventionCard
            type="repair"
            status="scheduled"
            label="Fuite raccord fumisterie"
            customerName="M. Bernard"
            time="14:00"
            duration="2h"
            techName="P. Roux"
            techColor="bg-info/15 text-info"
            priority="high"
          />
          <InterventionCard
            type="technical_survey"
            status="scheduled"
            label="Étude faisabilité insert"
            customerName="Mme Martin"
            time="16:30"
            duration="1h30"
            techName="J. Morel"
            techColor="bg-accent/15 text-accent"
          />
          <InterventionCard
            type="diagnostic"
            status="completed"
            label="Diagnostic panne E03"
            customerName="Mme Duval"
            time="10:00"
            duration="1h30"
            techName="P. Roux"
            techColor="bg-info/15 text-info"
          />
        </div>
      </section>

      {/* ── PropertyCard ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">PropertyCard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PropertyCard
            label="Maison principale"
            addressLine1="12 rue des Acacias"
            city="Limoges"
            postalCode="87000"
            propertyType="house"
            installationCount={2}
          />
          <PropertyCard
            addressLine1="8 av. de la Gare"
            city="Limoges"
            postalCode="87000"
            propertyType="apartment"
            installationCount={1}
          />
          <PropertyCard
            label="Atelier menuiserie"
            addressLine1="ZA Les Vergnes"
            city="Ussel"
            postalCode="19200"
            propertyType="commercial"
          />
        </div>
      </section>

      {/* ── InstallationCard ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">InstallationCard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InstallationCard
            deviceType="Poêle à granulés"
            brand="MCZ"
            model="Ego Air 8 M1"
            serialNumber="MCZ-2024-78432"
            status="active"
            commissioningDate="15 jan. 2024"
            nextSweepDate="15 jan. 2025"
            nextServiceDate="15 juil. 2025"
          />
          <InstallationCard
            deviceType="Insert bois"
            brand="Jøtul"
            model="I18"
            status="commissioned"
            commissioningDate="3 mars 2024"
          />
          <InstallationCard
            deviceType="Chaudière bois"
            brand="Morvan"
            status="draft"
          />
        </div>
      </section>
    </div>
  );
}
