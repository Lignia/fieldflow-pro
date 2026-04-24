import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Save, Send, Search, Loader2,
  MoreHorizontal, Copy, Type, Layers, FileText, Building2, MapPin,
  Calendar, ClipboardList, ArrowRight, Tag,
} from "lucide-react";
import { toast } from "sonner";

import { billingDb, coreDb } from "@/integrations/supabase/schema-clients";
import { useCreateQuote, type QuoteLine } from "@/hooks/useCreateQuote";
import { useCatalogSearch, suggestedVat, type CatalogItem } from "@/hooks/useCatalogSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ──────────────────────────────────────────────────────
type UnitType = "u" | "m" | "m2" | "forfait" | "h";
type LineType = "item" | "text" | "section";

interface EditorSection {
  _type: "section";
  _key: string;
  id?: string;
  label: string;
  sort_order: number;
}

interface EditorItem {
  _type: "item";
  _key: string;
  id?: string;
  section_id?: string | null;
  product_id?: string | null;
  label: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  sort_order: number;
  line_type: "item";
  line_category?: LineCategory | null;
  unit_cost_price?: number | null;
  brand?: string | null;
  supplier_ref?: string | null;
}

interface EditorText {
  _type: "text";
  _key: string;
  id?: string;
  section_id?: string | null;
  label: string;
  sort_order: number;
  line_type: "text";
}

type EditorRow = EditorSection | EditorItem | EditorText;

type LineCategory = "device" | "flue" | "labor" | "option" | "misc";

const CATEGORY_LABELS: Record<LineCategory, string> = {
  device: "🔥 Appareil",
  flue: "🏗️ Fumisterie",
  labor: "🔧 Pose",
  option: "⭐ Option",
  misc: "📦 Divers",
};

interface ProjectInfo {
  id: string;
  project_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_type: string;
  address_line1: string;
  city: string;
  postal_code: string;
  flue_scenario?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────
const UNIT_LABELS: Record<UnitType, string> = {
  u: "Unité", m: "Mètre", m2: "m²", forfait: "Forfait", h: "Heure",
};

const KIND_LABELS: Record<string, string> = {
  estimate: "Estimatif", final: "Définitif", service: "SAV",
};

const VAT_RATES = [5.5, 10, 20];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent: { label: "Envoyé", className: "bg-info/10 text-info" },
  signed: { label: "Signé", className: "bg-success/10 text-success" },
  rejected: { label: "Refusé", className: "bg-destructive/10 text-destructive" },
};

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

let _keyCounter = 0;
function nextKey() { return `row_${++_keyCounter}_${Date.now()}`; }

function fmt(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// ─── Catalog Search Popover ─────────────────────────────────────
function CatalogPopover({
  onSelect,
  onFreeLine,
  triggerLabel = "Nouvelle ligne",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  onSelect: (item: CatalogItem) => void;
  onFreeLine: () => void;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost" | "secondary";
  triggerSize?: "sm" | "default" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { results, loading } = useCatalogSearch(term);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher dans le catalogue…" value={term} onChange={(e) => setTerm(e.target.value)} className="pl-9" autoFocus />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading && <div className="p-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
          {!loading && term.length >= 2 && results.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Aucun résultat</div>
          )}
          {results.map((item) => (
            <button key={item.id} className="w-full text-left px-3 py-2.5 hover:bg-accent/10 transition-colors border-b border-border last:border-b-0" onClick={() => { onSelect(item); setOpen(false); setTerm(""); }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku} · TVA {item.vat_rate}%</p>
                </div>
                <span className="text-sm font-mono font-semibold shrink-0 text-foreground">{fmt(item.unit_price_ht)}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { onFreeLine(); setOpen(false); setTerm(""); }}>
            Saisir une ligne libre
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Row context menu ───────────────────────────────────────────
function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDuplicate}><Copy className="h-3.5 w-3.5 mr-2" /> Dupliquer</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Section Row ────────────────────────────────────────────────
function SectionRow({ row, subtotal, onChange, onDuplicate, onDelete }: {
  row: EditorSection; subtotal: number; onChange: (label: string) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
      <Layers className="h-4 w-4 text-accent shrink-0" />
      <Input
        value={row.label}
        onChange={(e) => onChange(e.target.value)}
        className="font-semibold text-sm border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
        placeholder="Nom de la section"
      />
      <span className="ml-auto font-mono text-sm text-muted-foreground shrink-0">{fmt(subtotal)}</span>
      <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

// ─── Category Picker (compact, discret) ─────────────────────────
function CategoryPicker({ value, onChange }: { value: LineCategory | null | undefined; onChange: (v: LineCategory | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            <span className="truncate max-w-[110px]">{CATEGORY_LABELS[value]}</span>
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            title="Catégoriser cette ligne"
          >
            <Tag className="h-3 w-3" /> Catégorie
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button
          type="button"
          onClick={() => { onChange(null); setOpen(false); }}
          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-muted-foreground"
        >
          — Aucune
        </button>
        {(Object.entries(CATEGORY_LABELS) as [LineCategory, string][]).map(([k, v]) => (
          <button
            key={k}
            type="button"
            onClick={() => { onChange(k); setOpen(false); }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted ${value === k ? "bg-accent/10 text-foreground font-medium" : "text-foreground"}`}
          >
            {v}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Item Row ───────────────────────────────────────────────────
function ItemRow({ row, index, onChange, onDuplicate, onDelete }: {
  row: EditorItem; index: number; onChange: (field: string, value: any) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const totalHt = row.qty * row.unit_price_ht;
  const cost = row.unit_cost_price ?? 0;
  const totalCost = row.qty * cost;
  const margin = totalHt - totalCost;
  const marginPct = totalHt > 0 ? (margin / totalHt) * 100 : 0;
  const hasCost = row.unit_cost_price != null && row.unit_cost_price > 0;
  const marginTone = !hasCost
    ? "text-muted-foreground/60"
    : margin < 0
      ? "text-destructive"
      : marginPct < 15
        ? "text-warning"
        : "text-success";
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_60px_72px_92px_72px_88px_110px_36px] gap-1.5 items-start px-3 py-2 hover:bg-muted/20 rounded transition-colors">
      <span className="text-xs text-muted-foreground text-center tabular-nums pt-2">{index}</span>
      <div className="min-w-0 space-y-1">
        <Input
          value={row.label}
          onChange={(e) => onChange("label", e.target.value)}
          placeholder="Désignation"
          className="h-8 text-sm font-medium"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryPicker
            value={row.line_category}
            onChange={(v) => onChange("line_category", v)}
          />
          {row.brand && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {row.brand}{row.supplier_ref ? ` · ${row.supplier_ref}` : ""}
            </span>
          )}
        </div>
      </div>
      <Input type="number" min={0} step={0.01} value={row.qty || ""} onChange={(e) => onChange("qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right mt-0" />
      <Select value={row.unit} onValueChange={(v) => onChange("unit", v)}>
        <SelectTrigger className="h-8 text-xs mt-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {(Object.entries(UNIT_LABELS) as [UnitType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input type="number" min={0} step={0.01} value={row.unit_price_ht || ""} onChange={(e) => onChange("unit_price_ht", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right font-medium" placeholder="0.00" />
      <Input
        type="number" min={0} step={0.01}
        value={row.unit_cost_price ?? ""}
        onChange={(e) => onChange("unit_cost_price", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
        className="h-7 text-xs text-right text-muted-foreground bg-muted/20 border-dashed"
        placeholder="—"
        title="Coût d'achat HT (interne)"
      />
      <Select value={String(row.vat_rate)} onValueChange={(v) => onChange("vat_rate", parseFloat(v))}>
        <SelectTrigger className="h-8 text-xs mt-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r} %</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="text-right pt-1">
        <div className="font-mono text-sm font-semibold text-foreground tabular-nums">{fmt(totalHt)}</div>
        {hasCost && (
          <div className={`font-mono text-[10px] leading-tight tabular-nums ${marginTone}`} title="Marge HT (interne)">
            Marge {fmt(margin)} ({marginPct.toFixed(0)} %)
          </div>
        )}
      </div>
      <div className="pt-0.5"><RowMenu onDuplicate={onDuplicate} onDelete={onDelete} /></div>
    </div>
  );
}

// ─── Text Row ───────────────────────────────────────────────────
function TextRow({ row, onChange, onDuplicate, onDelete }: {
  row: EditorText; onChange: (label: string) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5">
      <Type className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
      <Textarea
        value={row.label}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Texte libre (commentaire, condition…)"
        className="min-h-[36px] text-sm italic text-muted-foreground border-dashed resize-none"
        rows={1}
      />
      <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function QuoteEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const quoteKind = searchParams.get("kind") || "estimate";
  const navigate = useNavigate();
  const { coreUser, tenantId } = useCurrentUser();
  const { createQuote, quote, saving, error: hookError, setQuote } = useCreateQuote();

  const [rows, setRows] = useState<EditorRow[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [quoteDate, setQuoteDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const initRef = useRef(false);

  // Load project info
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      if (DEV_BYPASS) {
        setProjectInfo({
          id: projectId, project_number: "PRJ-DEV-001",
          customer_id: "dev-customer-id",
          customer_name: "Client test", customer_email: "test@test.fr",
          customer_phone: "06 00 00 00 00", customer_type: "individual",
          address_line1: "12 rue du Test", city: "Paris", postal_code: "75001",
        });
        return;
      }
      const { data } = await coreDb.from("v_projects_with_customer").select("*").eq("id", projectId).single();
      if (data) {
        setProjectInfo({
          id: data.id,
          project_number: data.project_number || "",
          customer_id: data.customer_id || null,
          customer_name: data.customer_name || "",
          customer_email: data.customer_email || null,
          customer_phone: data.customer_phone || null,
          customer_type: data.customer_type || "individual",
          address_line1: data.address_line1 || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
          flue_scenario: (data as any).payload?.flue_scenario ?? null,
        });
      }
    })();
  }, [projectId]);

  // Create quote on mount
  useEffect(() => {
    if (!projectId || initRef.current) return;
    initRef.current = true;
    createQuote(projectId, quoteKind).then((q) => {
      if (q) {
        setQuoteDate(q.quote_date);
        setExpiryDate(q.expiry_date);
      }
      setInitializing(false);
    });
  }, [projectId, createQuote, quoteKind]);

  // ─── Row management ───────────────────────────────────────────
  const addItem = useCallback(async (catalogItem?: CatalogItem) => {
    let autoCategory: LineCategory | null = null;
    let costPrice: number | null = null;
    let brand: string | null = null;
    let supplierRef: string | null = null;

    if (catalogItem) {
      const pt = (catalogItem as any).product_type;
      if (pt === "service") autoCategory = "labor";
      else if (pt === "appliance") autoCategory = "device";
      else if (pt === "flue" || pt === "conduit") autoCategory = "flue";

      // Fetch extended fields not exposed by useCatalogSearch
      if (!DEV_BYPASS) {
        try {
          const { data } = await (await import("@/integrations/supabase/schema-clients"))
            .catalogDb
            .from("catalog_items")
            .select("cost_price, brand, supplier_ref, is_labor")
            .eq("id", catalogItem.id)
            .maybeSingle();
          if (data) {
            costPrice = (data as any).cost_price ?? null;
            brand = (data as any).brand ?? null;
            supplierRef = (data as any).supplier_ref ?? null;
            if (!autoCategory && (data as any).is_labor) autoCategory = "labor";
          }
        } catch {
          /* non-blocking */
        }
      }
    }

    const newRow: EditorItem = {
      _type: "item", _key: nextKey(), line_type: "item",
      product_id: catalogItem?.id || null,
      label: catalogItem?.name || "",
      qty: 1,
      unit: catalogItem?.unit || "u",
      unit_price_ht: catalogItem?.unit_price_ht || 0,
      vat_rate: catalogItem ? suggestedVat(catalogItem.product_type) : 10,
      sort_order: rows.length,
      line_category: autoCategory,
      unit_cost_price: costPrice,
      brand,
      supplier_ref: supplierRef,
    };
    setRows((prev) => [...prev, newRow]);
  }, [rows.length]);

  const addSection = useCallback(() => {
    setRows((prev) => [...prev, { _type: "section", _key: nextKey(), label: "Nouvelle section", sort_order: prev.length }]);
  }, []);

  const addText = useCallback(() => {
    setRows((prev) => [...prev, { _type: "text", _key: nextKey(), label: "", sort_order: prev.length, line_type: "text" }]);
  }, []);

  const updateRow = useCallback((key: string, field: string, value: any) => {
    setRows((prev) => prev.map((r) => r._key === key ? { ...r, [field]: value } : r));
  }, []);

  const deleteRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }, []);

  const duplicateRow = useCallback((key: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._key === key);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], _key: nextKey(), id: undefined, sort_order: prev.length };
      return [...prev.slice(0, idx + 1), clone as EditorRow, ...prev.slice(idx + 1)];
    });
  }, []);

  // ─── Real-time totals ─────────────────────────────────────────
  const totals = useMemo(() => {
    const items = rows.filter((r): r is EditorItem => r._type === "item");
    let totalHt = 0;
    const vatMap: Record<number, number> = {};

    for (const item of items) {
      const lineHt = item.qty * item.unit_price_ht;
      totalHt += lineHt;
      const lineVat = lineHt * (item.vat_rate / 100);
      vatMap[item.vat_rate] = (vatMap[item.vat_rate] || 0) + lineVat;
    }

    const totalVat = Object.values(vatMap).reduce((s, v) => s + v, 0);
    return { totalHt, vatMap, totalVat, totalTtc: totalHt + totalVat };
  }, [rows]);

  // Section subtotals
  const sectionSubtotals = useMemo(() => {
    const map: Record<string, number> = {};
    let currentSectionKey: string | null = null;
    for (const row of rows) {
      if (row._type === "section") { currentSectionKey = row._key; map[row._key] = 0; }
      else if (row._type === "item" && currentSectionKey) {
        map[currentSectionKey] = (map[currentSectionKey] || 0) + row.qty * row.unit_price_ht;
      }
    }
    return map;
  }, [rows]);

  // Category subtotals (HT) — only the 3 main displayable categories
  const categorySubtotals = useMemo(() => {
    const map: Partial<Record<LineCategory, number>> = {};
    for (const row of rows) {
      if (row._type !== "item" || !row.line_category) continue;
      const ht = row.qty * row.unit_price_ht;
      map[row.line_category] = (map[row.line_category] || 0) + ht;
    }
    return map;
  }, [rows]);

  const hasAnyCategory = Object.keys(categorySubtotals).length > 0;

  // Margin totals (HT)
  const marginTotals = useMemo(() => {
    let sale = 0;
    let cost = 0;
    let coveredSale = 0; // sale where cost is known (>0)
    for (const row of rows) {
      if (row._type !== "item") continue;
      const ht = row.qty * row.unit_price_ht;
      sale += ht;
      if (row.unit_cost_price != null && row.unit_cost_price > 0) {
        cost += row.qty * row.unit_cost_price;
        coveredSale += ht;
      }
    }
    const margin = coveredSale - cost;
    const pct = coveredSale > 0 ? (margin / coveredSale) * 100 : 0;
    return { margin, pct, hasCost: cost > 0, fullyCovered: coveredSale === sale && sale > 0 };
  }, [rows]);

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = useCallback(async (finalize = false) => {
    if (!quote || !tenantId) return;

    // Bug 5 — guard: at least one item line
    const hasItems = rows.some((r) => r._type === "item");
    if (!hasItems) {
      toast.error("Ajoutez au moins une ligne avant d'enregistrer");
      return;
    }

    setSavingAll(true);

    try {
      // Update quote dates/kind — visit_date & start_date go into payload (bug 6)
      await billingDb.from("quotes").update({
        quote_kind: quote.quote_kind,
        quote_date: quoteDate,
        expiry_date: expiryDate,
        payload: {
          ...(quote as any).payload,
          visit_date: visitDate || null,
          start_date: startDate || null,
        },
      }).eq("id", quote.id);

      // Delete existing sections & lines for this quote
      await billingDb.from("quote_lines").delete().eq("quote_id", quote.id);
      await billingDb.from("quote_sections").delete().eq("quote_id", quote.id);

      // Insert sections
      const sectionRows = rows.filter((r): r is EditorSection => r._type === "section");
      const sectionIdMap: Record<string, string> = {};

      if (sectionRows.length > 0) {
        const { data: insertedSections } = await billingDb.from("quote_sections").insert(
          sectionRows.map((s) => ({
            tenant_id: tenantId, quote_id: quote.id, label: s.label, sort_order: s.sort_order,
          }))
        ).select("id");

        if (insertedSections) {
          sectionRows.forEach((s, i) => {
            if (insertedSections[i]) sectionIdMap[s._key] = insertedSections[i].id;
          });
        }
      }

      // Bug 3 — global sort_order counter across all row types
      // Re-assign sort_order globally based on display order
      let globalOrder = 0;
      const reorderedRows = rows.map((r) => ({ ...r, sort_order: globalOrder++ }));

      // Update section sort_orders in the map
      const reorderedSections = reorderedRows.filter((r): r is EditorSection => r._type === "section");
      // Re-map section keys (sections were already inserted with old sort_order, but we used the row-level one)
      // Actually we need to update the inserted sections' sort_order — but since we just inserted them above,
      // let's just make sure we used the right sort_order. The insert already happened, so let's update:
      for (const s of reorderedSections) {
        const dbId = sectionIdMap[s._key];
        if (dbId) {
          await billingDb.from("quote_sections").update({ sort_order: s.sort_order }).eq("id", dbId);
        }
      }

      // Figure out which section each line belongs to
      let currentSectionKey: string | null = null;
      const lineRows: (EditorItem | EditorText)[] = [];
      for (const row of reorderedRows) {
        if (row._type === "section") { currentSectionKey = row._key; }
        else { lineRows.push({ ...row, section_id: currentSectionKey ? sectionIdMap[currentSectionKey] || null : null } as any); }
      }

      // Insert lines
      if (lineRows.length > 0) {
        const { error: lineErr } = await billingDb.from("quote_lines").insert(
          lineRows.map((l) => ({
            tenant_id: tenantId,
            quote_id: quote.id,
            section_id: (l as any).section_id || null,
            line_type: l._type === "item" ? "item" : "text",
            product_id: l._type === "item" ? (l as EditorItem).product_id || null : null,
            label: l.label,
            qty: l._type === "item" ? (l as EditorItem).qty : 0,
            unit: l._type === "item" ? (l as EditorItem).unit : "u",
            unit_price_ht: l._type === "item" ? (l as EditorItem).unit_price_ht : 0,
            vat_rate: l._type === "item" ? (l as EditorItem).vat_rate : 0,
            sort_order: l.sort_order,
            line_category: l._type === "item" ? (l as EditorItem).line_category ?? null : null,
            unit_cost_price: l._type === "item" ? (l as EditorItem).unit_cost_price ?? null : null,
            brand: l._type === "item" ? (l as EditorItem).brand ?? null : null,
            supplier_ref: l._type === "item" ? (l as EditorItem).supplier_ref ?? null : null,
            metadata: {},
          }))
        );
        if (lineErr) throw lineErr;
      }

      if (finalize) {
        // Transition to sent
        if (!DEV_BYPASS) {
          const { data: session } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
          const sub = session?.session?.user?.id;
          if (!sub) throw new Error("Session expirée");
          const { data: actor } = await coreDb.from("users").select("id").eq("auth_uid", sub).maybeSingle();
          if (!actor?.id) throw new Error("Utilisateur introuvable");
          const { error: rpcErr } = await billingDb.rpc("transition_quote_status", {
            p_quote_id: quote.id, p_new_status: "sent", p_actor_id: actor.id, p_reason: "Devis envoyé au client",
          });
          if (rpcErr) throw rpcErr;
        }

        // Bug 4 — Convert prospect → active
        if (projectInfo?.customer_id) {
          await coreDb
            .from("customers")
            .update({ status: "active" })
            .eq("id", projectInfo.customer_id)
            .eq("status", "prospect");
          toast.success("Devis finalisé — client converti");
        } else {
          toast.success("Devis finalisé et envoyé");
        }

        navigate(`/projects/${projectId}?tab=commercial`);
      } else {
        toast.success("Devis enregistré");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingAll(false);
    }
  }, [quote, tenantId, quoteDate, expiryDate, visitDate, startDate, rows, coreUser, projectInfo, navigate, projectId]);

  // ─── Item numbering ───────────────────────────────────────────
  let itemCounter = 0;

  // ─── Loading ──────────────────────────────────────────────────
  if (initializing) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (hookError && !quote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-sm text-destructive mb-3">{hookError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}?tab=commercial`)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const statusCfg = STATUS_LABELS[quote.quote_status] || STATUS_LABELS.draft;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}?tab=commercial`)} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au projet
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-foreground truncate">{quote.quote_number || "Nouveau devis"}</span>
            <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          </div>

          {projectInfo && (
            <span className="hidden md:block text-sm text-muted-foreground truncate">
              {projectInfo.project_number} · {projectInfo.customer_name}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={savingAll}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Enregistrer
            </Button>
            <Button size="sm" onClick={() => handleSave(true)} disabled={savingAll}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
              Envoyer au client
            </Button>
          </div>
        </div>
      </header>

      {/* ─── BODY ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

          {/* Client / Chantier info */}
          {projectInfo && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 rounded-md border border-border bg-muted/20 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground truncate">{projectInfo.customer_name}</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs truncate">
                  {projectInfo.address_line1}, {projectInfo.postal_code} {projectInfo.city}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                <Badge variant={quote.quote_kind === "final" ? "default" : quote.quote_kind === "service" ? "outline" : "secondary"} className="text-[11px]">
                  {quote.quote_kind === "final" ? "✅ Final" : quote.quote_kind === "service" ? "🔧 SAV" : "📋 Estimatif"}
                </Badge>
                {projectInfo.flue_scenario && (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    🏗️ {projectInfo.flue_scenario}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  Voir le projet <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Dates */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date d'émission</Label>
                <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date d'expiration</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Visite préalable</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Début des travaux</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Type de devis */}
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">Type :</Label>
            <Select value={quote.quote_kind} onValueChange={(v) => setQuote({ ...quote, quote_kind: v })}>
              <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ─── CANVAS ─────────────────────────────────────────── */}
          <Card className="overflow-x-auto overflow-hidden">
            {/* Column headers */}
            <div className="hidden md:grid md:grid-cols-[28px_minmax(0,1fr)_60px_72px_92px_72px_92px_92px_36px] gap-1.5 px-3 py-2 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
              <span className="text-center">N°</span>
              <span>Désignation</span>
              <span className="text-right">Qté</span>
              <span>Unité</span>
              <span className="text-right">Vente HT</span>
              <span className="text-right">Coût HT</span>
              <span>TVA</span>
              <span className="text-right">Total HT</span>
              <span className="text-right">Marge</span>
              <span />
            </div>

            <div className="divide-y divide-border/50">
              {rows.length === 0 && (
                <div className="py-14 px-6 text-center border-2 border-dashed border-border/60 m-4 rounded-lg bg-muted/10">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-base font-semibold text-foreground mb-1">Commencez votre devis</p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Structurez par <span className="font-medium text-foreground">🔥 Appareil</span> · <span className="font-medium text-foreground">🏗️ Fumisterie</span> · <span className="font-medium text-foreground">🔧 Pose</span>
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <CatalogPopover
                      onSelect={(item) => addItem(item)}
                      onFreeLine={() => addItem()}
                      triggerLabel="Ajouter depuis le catalogue"
                      triggerVariant="default"
                    />
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addItem()}>Ligne libre</Button>
                      <span>·</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addSection}><Layers className="h-3 w-3 mr-1" />Section</Button>
                      <span>·</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addText}><Type className="h-3 w-3 mr-1" />Texte</Button>
                    </div>
                  </div>
                </div>
              )}

              {rows.map((row) => {
                if (row._type === "section") {
                  return (
                    <SectionRow
                      key={row._key} row={row}
                      subtotal={sectionSubtotals[row._key] || 0}
                      onChange={(label) => updateRow(row._key, "label", label)}
                      onDuplicate={() => duplicateRow(row._key)}
                      onDelete={() => deleteRow(row._key)}
                    />
                  );
                }
                if (row._type === "text") {
                  return (
                    <TextRow
                      key={row._key} row={row}
                      onChange={(label) => updateRow(row._key, "label", label)}
                      onDuplicate={() => duplicateRow(row._key)}
                      onDelete={() => deleteRow(row._key)}
                    />
                  );
                }
                itemCounter++;
                return (
                  <ItemRow
                    key={row._key} row={row} index={itemCounter}
                    onChange={(field, value) => updateRow(row._key, field, value)}
                    onDuplicate={() => duplicateRow(row._key)}
                    onDelete={() => deleteRow(row._key)}
                  />
                );
              })}
            </div>

            {/* Add buttons */}
            {rows.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-3 border-t border-border bg-muted/20">
                <CatalogPopover onSelect={(item) => addItem(item)} onFreeLine={() => addItem()} />
                <Button variant="ghost" size="sm" onClick={addSection}><Layers className="h-3.5 w-3.5 mr-1" /> Section</Button>
                <Button variant="ghost" size="sm" onClick={addText}><Type className="h-3.5 w-3.5 mr-1" /> Texte</Button>
              </div>
            )}
          </Card>

          {/* ─── Répartition du devis ─────────────────────────── */}
          {hasAnyCategory && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Répartition du devis (HT)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(["device", "flue", "labor", "option", "misc"] as LineCategory[]).map((cat) => {
                    const amount = categorySubtotals[cat];
                    if (amount === undefined) return null;
                    return (
                      <div key={cat} className="flex flex-col gap-0.5 px-3 py-2 rounded-md border border-border bg-muted/20">
                        <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</span>
                        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">{fmt(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* ─── STICKY FOOTER — Totals ─────────────────────────────── */}
      <footer className="sticky bottom-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
            <div>
              <span className="text-muted-foreground">Total HT </span>
              <span className="font-mono font-semibold text-foreground">{fmt(totals.totalHt)}</span>
            </div>
            {Object.entries(totals.vatMap)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([rate, amount]) => (
                <div key={rate}>
                  <span className="text-muted-foreground">TVA {rate}% </span>
                  <span className="font-mono text-foreground">{fmt(amount)}</span>
                </div>
              ))}
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div>
              <span className="text-muted-foreground">Total TTC </span>
              <span className="font-mono font-bold text-base text-foreground">{fmt(totals.totalTtc)}</span>
            </div>
            {marginTotals.hasCost && (
              <>
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <div title={marginTotals.fullyCovered ? "Marge HT" : "Marge HT (lignes avec coût renseigné uniquement)"}>
                  <span className="text-muted-foreground">Marge </span>
                  <span className={`font-mono font-semibold ${marginTotals.margin < 0 ? "text-destructive" : marginTotals.pct < 15 ? "text-warning" : "text-success"}`}>
                    {fmt(marginTotals.margin)}
                    <span className="ml-1 text-xs opacity-80">({marginTotals.pct.toFixed(0)} %)</span>
                  </span>
                  {!marginTotals.fullyCovered && (
                    <span className="ml-1 text-[10px] text-muted-foreground">*</span>
                  )}
                </div>
              </>
            )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
