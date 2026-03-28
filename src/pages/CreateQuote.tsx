import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ──────────────────────────────────────────────────────
type QuoteKind = "estimate" | "final" | "service";
type UnitType = "u" | "m" | "m2" | "forfait" | "h";

interface QuoteLine {
  key: string;
  label: string;
  qty: number;
  unit: UnitType;
  unit_price_ht: number;
  vat_rate: number;
}

interface SimpleCustomer {
  id: string;
  name: string;
}

interface SimpleProperty {
  id: string;
  label: string | null;
  address_line1: string;
  city: string;
  customer_id: string;
}

// ─── Constants ──────────────────────────────────────────────────
const UNIT_LABELS: Record<UnitType, string> = {
  u: "Unité",
  m: "Mètre",
  m2: "m²",
  forfait: "Forfait",
  h: "Heure",
};

const KIND_LABELS: Record<QuoteKind, string> = {
  estimate: "Estimatif",
  final: "Définitif",
  service: "SAV",
};

const VAT_RATES = [5.5, 10, 20];

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const MOCK_CUSTOMERS: SimpleCustomer[] = [
  { id: "cust-1", name: "M. Morel" },
  { id: "cust-2", name: "Mme Durand" },
  { id: "cust-3", name: "M. Bernard" },
  { id: "cust-4", name: "M. Fabre" },
];

const MOCK_PROPERTIES: SimpleProperty[] = [
  { id: "prop-1", label: "Maison principale", address_line1: "12 rue des Lilas", city: "Lyon", customer_id: "cust-1" },
  { id: "prop-2", label: null, address_line1: "45 av. Foch", city: "Paris", customer_id: "cust-2" },
  { id: "prop-3", label: "Résidence secondaire", address_line1: "8 chemin du Lac", city: "Annecy", customer_id: "cust-3" },
  { id: "prop-4", label: null, address_line1: "3 impasse des Roses", city: "Grenoble", customer_id: "cust-4" },
];

function emptyLine(): QuoteLine {
  return {
    key: crypto.randomUUID(),
    label: "",
    qty: 1,
    unit: "u",
    unit_price_ht: 0,
    vat_rate: 10,
  };
}

function formatCurrency(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// ─── Component ──────────────────────────────────────────────────
export default function CreateQuote() {
  const navigate = useNavigate();

  // Form state
  const [quoteKind, setQuoteKind] = useState<QuoteKind>("estimate");
  const [customerId, setCustomerId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // Data state
  const [customers] = useState<SimpleCustomer[]>(DEV_BYPASS ? MOCK_CUSTOMERS : []);
  const [properties] = useState<SimpleProperty[]>(DEV_BYPASS ? MOCK_PROPERTIES : []);

  // Filtered properties based on selected customer
  const filteredProperties = customerId
    ? properties.filter((p) => p.customer_id === customerId)
    : properties;

  // ─── Line management ──────────────────────────────────────────
  const updateLine = useCallback((key: string, field: keyof QuoteLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  }, []);

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (key: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.key !== key);
    });
  };

  // ─── Calculations ─────────────────────────────────────────────
  const lineTotal = (l: QuoteLine) => l.qty * l.unit_price_ht;
  const totalHT = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const vatGroups = lines.reduce<Record<number, { ht: number; vat: number }>>((acc, l) => {
    const ht = lineTotal(l);
    if (!acc[l.vat_rate]) acc[l.vat_rate] = { ht: 0, vat: 0 };
    acc[l.vat_rate].ht += ht;
    acc[l.vat_rate].vat += ht * (l.vat_rate / 100);
    return acc;
  }, {});

  const totalVAT = Object.values(vatGroups).reduce((s, g) => s + g.vat, 0);
  const totalTTC = totalHT + totalVAT;

  // ─── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }
    if (!propertyId) {
      toast.error("Veuillez sélectionner un bien");
      return;
    }
    if (lines.some((l) => !l.label.trim())) {
      toast.error("Toutes les lignes doivent avoir une désignation");
      return;
    }

    if (DEV_BYPASS) {
      toast.success("Devis créé (mode dev)");
      navigate("/quotes");
      return;
    }

    setSaving(true);
    try {
      const { data: quote, error: quoteErr } = await billingDb
        .from("quotes")
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          property_id: propertyId,
          quote_kind: quoteKind,
          quote_status: "draft",
          total_ht: totalHT,
          total_vat: totalVAT,
          total_ttc: totalTTC,
          payload: notes ? { notes } : {},
        })
        .select("id")
        .single();

      if (quoteErr) throw quoteErr;

      const lineInserts = lines.map((l, i) => ({
        tenant_id: tenantId,
        quote_id: quote.id,
        label: l.label,
        qty: l.qty,
        unit: l.unit,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
        total_line_ht: lineTotal(l),
        sort_order: i,
      }));

      const { error: linesErr } = await billingDb
        .from("quote_lines")
        .insert(lineInserts);

      if (linesErr) throw linesErr;

      toast.success("Devis créé avec succès");
      navigate(`/quotes/${quote.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau devis</h1>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations du devis et ajoutez les lignes d'articles
          </p>
        </div>
      </div>

      {/* General info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Type de devis</Label>
            <Select value={quoteKind} onValueChange={(v) => setQuoteKind(v as QuoteKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(KIND_LABELS) as [QuoteKind, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setPropertyId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bien / Adresse *</Label>
            <Select value={propertyId} onValueChange={setPropertyId} disabled={!customerId}>
              <SelectTrigger>
                <SelectValue placeholder={customerId ? "Sélectionner un bien" : "Choisir un client d'abord"} />
              </SelectTrigger>
              <SelectContent>
                {filteredProperties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label || p.address_line1}, {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lignes du devis</CardTitle>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Column headers (desktop) */}
          <div className="hidden md:grid md:grid-cols-[1fr_80px_100px_110px_100px_80px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Désignation</span>
            <span>Qté</span>
            <span>Unité</span>
            <span>Prix unit. HT</span>
            <span>TVA %</span>
            <span className="text-right">Total HT</span>
            <span />
          </div>

          {lines.map((line) => (
            <div
              key={line.key}
              className="grid grid-cols-2 md:grid-cols-[1fr_80px_100px_110px_100px_80px_40px] gap-2 items-start border rounded-md p-2 md:border-0 md:p-0"
            >
              <div className="col-span-2 md:col-span-1">
                <Input
                  placeholder="Désignation de l'article"
                  value={line.label}
                  onChange={(e) => updateLine(line.key, "label", e.target.value)}
                />
              </div>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.qty || ""}
                onChange={(e) => updateLine(line.key, "qty", parseFloat(e.target.value) || 0)}
                className="text-right"
              />
              <Select value={line.unit} onValueChange={(v) => updateLine(line.key, "unit", v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(UNIT_LABELS) as [UnitType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={line.unit_price_ht || ""}
                onChange={(e) => updateLine(line.key, "unit_price_ht", parseFloat(e.target.value) || 0)}
                className="text-right"
                placeholder="0.00"
              />
              <Select
                value={String(line.vat_rate)}
                onValueChange={(v) => updateLine(line.key, "vat_rate", parseFloat(v))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r} %</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center justify-end h-10 font-mono text-sm">
                {formatCurrency(lineTotal(line))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-destructive"
                onClick={() => removeLine(line.key)}
                disabled={lines.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex justify-between w-full max-w-xs">
              <span className="text-muted-foreground">Total HT</span>
              <span className="font-mono">{formatCurrency(totalHT)}</span>
            </div>
            {Object.entries(vatGroups)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, group]) => (
                <div key={rate} className="flex justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">TVA {rate} %</span>
                  <span className="font-mono">{formatCurrency(group.vat)}</span>
                </div>
              ))}
            <div className="border-t pt-2 mt-1 flex justify-between w-full max-w-xs font-semibold">
              <span>Total TTC</span>
              <span className="font-mono">{formatCurrency(totalTTC)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes internes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Conditions particulières, notes internes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => navigate("/quotes")}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement…" : "Créer le devis"}
        </Button>
      </div>
    </div>
  );
}
