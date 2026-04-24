import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Building2,
  ArrowRight,
  FilePlus2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";
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
import { Badge } from "@/components/ui/badge";
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

// ─── Line categories (local-only, persisted via direct UPDATE) ──
type LineCategory = "device" | "flue" | "labor" | "option" | "misc";

const LINE_CATEGORY_LABELS: Record<LineCategory, string> = {
  device: "🔥 Appareil",
  flue: "🏗️ Fumisterie",
  labor: "🔧 Pose",
  option: "⭐ Option",
  misc: "📦 Divers",
};

const KIND_BADGE: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
  estimate: { variant: "secondary", label: "📋 Estimatif" },
  final: { variant: "default", label: "✅ Devis final" },
  service: { variant: "outline", label: "🔧 SAV" },
};

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
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {item.product_type === "service" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        Main d'œuvre
                      </Badge>
                    )}
                    {item.product_type === "appliance" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        Appareil
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {item.sku} · TVA {item.vat_rate}%
                    </span>
                  </div>
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
  category,
  onCategoryChange,
}: {
  line: QuoteLine;
  onUpdate: (field: string, value: any) => void;
  onDelete: () => void;
  disabled: boolean;
  category: LineCategory | null;
  onCategoryChange: (value: LineCategory | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-[24px_1fr_120px_80px_100px_110px_100px_90px_40px] gap-2 items-start border rounded-lg p-3 md:border-muted/50 md:p-2 bg-card">
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
        {/* Mobile: catégorie sous la désignation */}
        <div className="md:hidden mt-2">
          <Select
            value={category ?? "__none"}
            onValueChange={(v) => onCategoryChange(v === "__none" ? null : (v as LineCategory))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              {(Object.entries(LINE_CATEGORY_LABELS) as [LineCategory, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Desktop: catégorie en colonne dédiée */}
      <div className="hidden md:block">
        <Select
          value={category ?? "__none"}
          onValueChange={(v) => onCategoryChange(v === "__none" ? null : (v as LineCategory))}
          disabled={disabled}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">—</SelectItem>
            {(Object.entries(LINE_CATEGORY_LABELS) as [LineCategory, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  const [searchParams] = useSearchParams();
  const quoteKind = searchParams.get("kind") || "estimate";
  const rawReturnTo = searchParams.get("return_to");
  const returnTo = rawReturnTo?.startsWith("/") ? rawReturnTo : null;
  const navigate = useNavigate();
  const { coreUser } = useCurrentUser();
  const { createQuote, addLine, updateLine, deleteLine, quote, lines, saving, error, setQuote } = useCreateQuote();
  const [initializing, setInitializing] = useState(true);
  const initRef = useRef(false);

  // Project context (read-only side fetch, no hook touched)
  const [projectContext, setProjectContext] = useState<{
    customer_name: string;
    address_line1: string;
    city: string;
    payload: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    coreDb
      .from("v_projects_with_customer")
      .select("customer_name, address_line1, city, payload")
      .eq("id", projectId)
      .single()
      .then(({ data }) => {
        if (data) setProjectContext(data as any);
      });
  }, [projectId]);

  // Local-only category map: lineId → category (persisted via direct UPDATE)
  const [categories, setCategories] = useState<Record<string, LineCategory | null>>({});

  // Initialize quote on mount with kind from URL
  useEffect(() => {
    if (!projectId || initRef.current) return;
    initRef.current = true;
    createQuote(projectId, quoteKind).then(() => setInitializing(false));
  }, [projectId, createQuote, quoteKind]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleCatalogSelect = async (item: CatalogItem) => {
    if (!quote) return;
    const linesBefore = lines.length;
    await addLine(quote.id, {
      product_id: item.id,
      label: item.name,
      qty: 1,
      unit: item.unit,
      unit_price_ht: item.unit_price_ht,
      vat_rate: suggestedVat(item.product_type),
      sort_order: linesBefore,
    });
    // Auto-map category from product_type (best-effort with available fields)
    const autoCat: LineCategory | null =
      item.product_type === "service" ? "labor" :
      item.product_type === "appliance" ? "device" :
      null;
    if (autoCat) {
      // We don't know the new line id synchronously; defer assignment via effect below
      pendingAutoCatRef.current = { productId: item.id, category: autoCat };
    }
  };

  // Auto-assign category to newly inserted line when it appears in `lines`
  const pendingAutoCatRef = useRef<{ productId: string; category: LineCategory } | null>(null);
  useEffect(() => {
    const pending = pendingAutoCatRef.current;
    if (!pending) return;
    const newLine = [...lines]
      .reverse()
      .find((l) => l.product_id === pending.productId && categories[l.id] === undefined);
    if (newLine) {
      setCategories((prev) => ({ ...prev, [newLine.id]: pending.category }));
      // Persist
      billingDb
        .from("quote_lines")
        .update({ line_category: pending.category })
        .eq("id", newLine.id)
        .then(() => {});
      pendingAutoCatRef.current = null;
    }
  }, [lines, categories]);

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
    setCategories((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  };

  const handleCategoryChange = async (lineId: string, value: LineCategory | null) => {
    setCategories((prev) => ({ ...prev, [lineId]: value }));
    try {
      await billingDb
        .from("quote_lines")
        .update({ line_category: value })
        .eq("id", lineId);
    } catch {
      // silent — column may not exist yet; UI state already updated
    }
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
      navigate(returnTo ?? `/projects/${projectId}`);
      return;
    }
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: session } = await supabase.auth.getSession();
      const sub = session?.session?.user?.id;
      if (!sub) throw new Error("Session expirée");
      const { data: actor } = await coreDb.from("users").select("id").eq("auth_uid", sub).maybeSingle();
      if (!actor?.id) throw new Error("Utilisateur introuvable");
      const { error } = await billingDb.rpc("transition_quote_status", {
        p_quote_id: quote.id, p_new_status: "sent", p_actor_id: actor.id, p_reason: "Devis envoyé au client",
      });
      if (error) throw error;
      toast.success("Devis envoyé");
      navigate(returnTo ?? `/projects/${projectId}`);
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

  // ─── Category breakdown (HT) ──────────────────────────────────
  const categoryHT = lines.reduce<Partial<Record<LineCategory, number>>>((acc, l) => {
    const cat = categories[l.id];
    if (!cat) return acc;
    acc[cat] = (acc[cat] || 0) + l.total_line_ht;
    return acc;
  }, {});
  const hasAnyCategory = Object.keys(categoryHT).length > 0;

  // ─── Loading state ────────────────────────────────────────────
  if (initializing) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo ?? `/projects/${projectId}`)}>
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
        <Button variant="ghost" size="sm" onClick={() => navigate(returnTo ?? `/projects/${projectId}`)}>
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

  const kindBadge = KIND_BADGE[quote.quote_kind] ?? KIND_BADGE.estimate;

  return (
    <div className="space-y-6 max-w-4xl pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(returnTo ?? `/projects/${projectId}`)}>
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

      {/* Project context (read-only) */}
      {projectContext && (
        <Card className="bg-accent/5 border-accent/30 border-l-4 border-l-accent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{projectContext.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {projectContext.address_line1} · {projectContext.city}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={kindBadge.variant} className="text-xs">
                  {kindBadge.label}
                </Badge>
                {projectContext.payload?.flue_scenario && (
                  <Badge variant="outline" className="text-xs">
                    🏗️ {String(projectContext.payload.flue_scenario)}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Voir le projet
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="hidden md:grid md:grid-cols-[24px_1fr_120px_80px_100px_110px_100px_90px_40px] gap-2 text-xs font-medium text-muted-foreground px-2">
              <span />
              <span>Désignation</span>
              <span>Catégorie</span>
              <span>Qté</span>
              <span>Unité</span>
              <span>Prix HT</span>
              <span>TVA</span>
              <span className="text-right">Total HT</span>
              <span />
            </div>
          )}

          {lines.length === 0 && (
            <div className="py-10 px-4 text-center border border-dashed rounded-lg bg-muted/20">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">Aucune ligne pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Structurez votre devis par <span className="font-medium">🔥 Appareil</span> /{" "}
                <span className="font-medium">🏗️ Fumisterie</span> /{" "}
                <span className="font-medium">🔧 Pose</span>
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <CatalogSearchPopover onSelect={handleCatalogSelect} onFreeLine={handleFreeLine} />
                <Button variant="ghost" size="sm" onClick={handleFreeLine}>
                  <FilePlus2 className="h-3.5 w-3.5 mr-1" />
                  Ajouter une ligne libre
                </Button>
              </div>
            </div>
          )}

          {lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              onUpdate={(field, value) => handleUpdateLine(line, field, value)}
              onDelete={() => handleDeleteLine(line.id)}
              disabled={saving}
              category={categories[line.id] ?? null}
              onCategoryChange={(value) => handleCategoryChange(line.id, value)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Totals (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Totals */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-6 text-sm flex-wrap">
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
            {hasAnyCategory && (
              <div className="flex gap-2 text-xs mt-2 flex-wrap">
                {categoryHT.device !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning-foreground border border-warning/20">
                    🔥 <span className="font-medium">Appareil</span>
                    <span className="font-mono font-semibold">{formatCurrencyRound(categoryHT.device)}</span>
                  </span>
                )}
                {categoryHT.flue !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 text-info border border-info/20">
                    🏗️ <span className="font-medium">Fumisterie</span>
                    <span className="font-mono font-semibold">{formatCurrencyRound(categoryHT.flue)}</span>
                  </span>
                )}
                {categoryHT.labor !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success border border-success/20">
                    🔧 <span className="font-medium">Pose</span>
                    <span className="font-mono font-semibold">{formatCurrencyRound(categoryHT.labor)}</span>
                  </span>
                )}
                {categoryHT.option !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20">
                    ⭐ <span className="font-medium">Option</span>
                    <span className="font-mono font-semibold">{formatCurrencyRound(categoryHT.option)}</span>
                  </span>
                )}
                {categoryHT.misc !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground border">
                    📦 <span className="font-medium">Divers</span>
                    <span className="font-mono font-semibold">{formatCurrencyRound(categoryHT.misc)}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.success("Devis enregistré");
                navigate(returnTo ?? `/projects/${projectId}`);
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
