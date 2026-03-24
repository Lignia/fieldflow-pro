import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Search,
  Loader2,
  GripVertical,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { billingDb } from "@/integrations/supabase/schema-clients";
import { useCreateQuote, type QuoteLine } from "@/hooks/useCreateQuote";
import { useCatalogSearch, suggestedVat, type CatalogItem } from "@/hooks/useCatalogSearch";
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
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Constants ──────────────────────────────────────────────────
type UnitType = "u" | "m" | "m2" | "forfait" | "h";

const UNIT_LABELS: Record<UnitType, string> = {
  u: "Unité",
  m: "Mètre",
  m2: "m²",
  forfait: "Forfait",
  h: "Heure",
};

const KIND_LABELS: Record<string, string> = {
  estimate: "Estimatif",
  final: "Définitif",
  service: "SAV",
};

const VAT_RATES = [5.5, 10, 20];

function formatCurrency(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatCurrencyRound(n: number) {
  return Math.round(n).toLocaleString("fr-FR") + " €";
}

// ─── Catalog Search Popover ─────────────────────────────────────
function CatalogSearchPopover({
  onSelect,
  onFreeLine,
}: {
  onSelect: (item: CatalogItem) => void;
  onFreeLine: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { results, loading } = useCatalogSearch(term);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter une ligne
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans le catalogue…"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <div className="p-4 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && term.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun résultat
            </div>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2.5 hover:bg-accent/5 transition-colors border-b last:border-b-0"
              onClick={() => {
                onSelect(item);
                setOpen(false);
                setTerm("");
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku} · TVA {item.vat_rate}%
                  </p>
                </div>
                <span className="text-sm font-mono font-semibold shrink-0">
                  {formatCurrency(item.unit_price_ht)}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              onFreeLine();
              setOpen(false);
              setTerm("");
            }}
          >
            Saisir une ligne libre
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Line Row ───────────────────────────────────────────────────
function LineRow({
  line,
  onUpdate,
  onDelete,
  disabled,
}: {
  line: QuoteLine;
  onUpdate: (field: string, value: any) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-[24px_1fr_80px_100px_110px_100px_90px_40px] gap-2 items-start border rounded-lg p-3 md:border-muted/50 md:p-2 bg-card">
      <div className="hidden md:flex items-center justify-center h-10 text-muted-foreground/40 cursor-grab">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="col-span-2 md:col-span-1">
        <Input
          placeholder="Désignation"
          value={line.label}
          onChange={(e) => onUpdate("label", e.target.value)}
          disabled={disabled}
        />
      </div>
      <Input
        type="number"
        min={0.001}
        step={0.01}
        value={line.qty || ""}
        onChange={(e) => onUpdate("qty", parseFloat(e.target.value) || 0)}
        className="text-right"
        disabled={disabled}
      />
      <Select
        value={line.unit}
        onValueChange={(v) => onUpdate("unit", v)}
        disabled={disabled}
      >
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
        onChange={(e) => onUpdate("unit_price_ht", parseFloat(e.target.value) || 0)}
        className="text-right"
        placeholder="0.00"
        disabled={disabled}
      />
      <Select
        value={String(line.vat_rate)}
        onValueChange={(v) => onUpdate("vat_rate", parseFloat(v))}
        disabled={disabled}
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
      <span className="flex items-center justify-end h-10 font-mono text-sm text-muted-foreground">
        {formatCurrency(line.total_line_ht)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function QuoteCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const { createQuote, addLine, updateLine, deleteLine, quote, lines, saving, error, setQuote } = useCreateQuote();
  const [initializing, setInitializing] = useState(true);
  const initRef = useRef(false);

  // Initialize quote on mount
  useEffect(() => {
    if (!projectId || initRef.current) return;
    initRef.current = true;
    createQuote(projectId, "estimate").then(() => setInitializing(false));
  }, [projectId, createQuote]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleCatalogSelect = (item: CatalogItem) => {
    if (!quote) return;
    addLine(quote.id, {
      product_id: item.id,
      label: item.name,
      qty: 1,
      unit: item.unit,
      unit_price_ht: item.unit_price_ht,
      vat_rate: suggestedVat(item.product_type),
      sort_order: lines.length,
    });
  };

  const handleFreeLine = () => {
    if (!quote) return;
    addLine(quote.id, {
      product_id: null,
      label: "",
      qty: 1,
      unit: "u",
      unit_price_ht: 0,
      vat_rate: 10,
      sort_order: lines.length,
    });
  };

  const handleUpdateLine = (line: QuoteLine, field: string, value: any) => {
    if (!quote) return;
    updateLine(line.id, quote.id, { [field]: value });
  };

  const handleDeleteLine = (lineId: string) => {
    if (!quote) return;
    deleteLine(lineId, quote.id);
  };

  const handleKindChange = async (kind: string) => {
    if (!quote) return;
    const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
    if (DEV_BYPASS) {
      setQuote({ ...quote, quote_kind: kind });
      return;
    }
    await billingDb.from("quotes").update({ quote_kind: kind }).eq("id", quote.id);
    setQuote({ ...quote, quote_kind: kind });
  };

  const handleSend = async () => {
    if (!quote || !coreUser) return;
    const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
    if (DEV_BYPASS) {
      toast.success("Devis envoyé (mode dev)");
      navigate(`/projects/${projectId}`);
      return;
    }
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any).rpc("billing_transition_quote_status", {
        p_quote_id: quote.id,
        p_new_status: "sent",
        p_actor_id: coreUser.id,
      });
      if (error) throw error;
      toast.success("Devis envoyé");
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    }
  };

  // ─── VAT breakdown from trigger totals ────────────────────────
  const vatByRate = lines.reduce<Record<number, number>>((acc, l) => {
    const vat = l.total_line_ht * (l.vat_rate / 100);
    acc[l.vat_rate] = (acc[l.vat_rate] || 0) + vat;
    return acc;
  }, {});

  // ─── Loading state ────────────────────────────────────────────
  if (initializing) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour au projet
        </Button>
        <Card className="p-12 text-center">
          <p className="text-sm text-destructive mb-3">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="space-y-6 max-w-4xl pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Nouveau devis</h1>
            <StatusBadge status="draft" type="quote" size="md" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {quote.quote_number || "Numéro généré à l'enregistrement"}
          </p>
        </div>
      </div>

      {/* General info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Type de devis</Label>
            <Select value={quote.quote_kind} onValueChange={handleKindChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date du devis</Label>
            <Input type="date" value={quote.quote_date} readOnly className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Validité</Label>
            <Input type="date" value={quote.expiry_date} readOnly className="bg-muted/50" />
          </div>
        </CardContent>
      </Card>

      {/* Quote lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Lignes du devis
          </CardTitle>
          <CatalogSearchPopover onSelect={handleCatalogSelect} onFreeLine={handleFreeLine} />
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Column headers (desktop) */}
          {lines.length > 0 && (
            <div className="hidden md:grid md:grid-cols-[24px_1fr_80px_100px_110px_100px_90px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
              <span />
              <span>Désignation</span>
              <span>Qté</span>
              <span>Unité</span>
              <span>Prix HT</span>
              <span>TVA</span>
              <span className="text-right">Total HT</span>
              <span />
            </div>
          )}

          {lines.length === 0 && (
            <div className="py-12 text-center">
              <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucune ligne pour l'instant
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ajoutez des articles depuis le catalogue ou créez une ligne libre
              </p>
            </div>
          )}

          {lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              onUpdate={(field, value) => handleUpdateLine(line, field, value)}
              onDelete={() => handleDeleteLine(line.id)}
              disabled={saving}
            />
          ))}
        </CardContent>
      </Card>

      {/* Totals (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Totals */}
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">HT </span>
              <span className="font-mono font-semibold">{formatCurrencyRound(quote.total_ht)}</span>
            </div>
            {Object.entries(vatByRate)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, amount]) => (
                <div key={rate}>
                  <span className="text-muted-foreground">TVA {rate}% </span>
                  <span className="font-mono">{formatCurrencyRound(amount)}</span>
                </div>
              ))}
            <Separator orientation="vertical" className="h-6" />
            <div>
              <span className="text-muted-foreground">TTC </span>
              <span className="font-mono font-bold text-base">{formatCurrencyRound(quote.total_ttc)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Devis enregistré");
                navigate(`/projects/${projectId}`);
              }}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Enregistrer
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={lines.length === 0 || saving}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Envoyer au client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
