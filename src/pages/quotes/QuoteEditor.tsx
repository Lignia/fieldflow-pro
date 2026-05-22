import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
// TODO post-MVP : si quote_status = "sent" et devis expiré,
// afficher aide UX "Prolongez la date de validité avant de renvoyer"
import {
  ArrowLeft, Plus, Trash2, Save, Send, Loader2,
  MoreHorizontal, Copy, Type, Layers,
  ClipboardList, Tag, Flame, Construction, Wrench,
  ChevronDown, BookOpen, BookmarkPlus, Receipt, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { billingDb, coreDb, catalogDb } from "@/integrations/supabase/schema-clients";
import { useCreateQuote, type QuoteSummary } from "@/hooks/useCreateQuote";
import { useCatalogSearch, suggestedVat, type CatalogItem } from "@/hooks/useCatalogSearch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ──────────────────────────────────────────────────────
type UnitType = "u" | "m" | "m2" | "forfait" | "h";

/**
 * Contrat metadata strict — figé à l'ajout, jamais modifié après insertion.
 * Toute ligne item DOIT avoir un metadata complet.
 */
interface QuoteLinePricing {
  status: string;             // valeur de resolve_item_price.status ou "manual"
  public_price_ht: number;
  net_price_ht: number | null;
  discount_applied: boolean;
  pricing_source: string | null;
  bareme_code: string | null;
  resolved_at: string;        // ISO datetime obligatoire
}

interface QuoteLinePrescription {
  source: "catalog" | "manual";
  catalog_item_id: string | null;
  supplier_name: string | null;
  supplier_ref: string | null;
  needs_human_review: boolean;
  has_dta: boolean;
  dta_status: string | null;
  is_etanche: boolean | null;
}

// metadata est toujours complet — pricing ET prescription présents
interface QuoteLineMetadata {
  pricing: QuoteLinePricing;
  prescription: QuoteLinePrescription;
}

// Constructeur metadata catalogue — appelé après resolve_item_price réussi
function buildCatalogMetadata(
  priceData: Record<string, unknown>,
  item: CatalogItem,
): QuoteLineMetadata {
  return {
    pricing: {
      status: String(priceData.status ?? "ok"),
      public_price_ht: Number(priceData.public_price_ht ?? item.unit_price_ht),
      net_price_ht: priceData.net_price_ht != null ? Number(priceData.net_price_ht) : null,
      discount_applied: Boolean(priceData.discount_applied ?? false),
      pricing_source: priceData.pricing_source != null ? String(priceData.pricing_source) : null,
      bareme_code: priceData.bareme_code != null ? String(priceData.bareme_code) : null,
      resolved_at: new Date().toISOString(),
    },
    prescription: {
      source: "catalog",
      catalog_item_id: item.id,
      supplier_name: item.supplier_name ?? null,
      supplier_ref: item.supplier_ref ?? null,
      needs_human_review: item.needs_human_review ?? false,
      has_dta: item.has_dta ?? false,
      dta_status: item.dta_status ?? null,
      is_etanche: item.is_etanche ?? null,
    },
  };
}

// Constructeur metadata ligne manuelle
function buildManualMetadata(): QuoteLineMetadata {
  return {
    pricing: {
      status: "manual",
      public_price_ht: 0,
      net_price_ht: null,
      discount_applied: false,
      pricing_source: "manual",
      bareme_code: null,
      resolved_at: new Date().toISOString(),
    },
    prescription: {
      source: "manual",
      catalog_item_id: null,
      supplier_name: null,
      supplier_ref: null,
      needs_human_review: false,
      has_dta: false,
      dta_status: null,
      is_etanche: null,
    },
  };
}

interface EditorSection {
  _type: "section";
  _key: string;
  id?: string;
  label: string;
  sort_order: number;
}

// metadata est obligatoire (non optionnel) dans EditorItem
interface EditorItem {
  _type: "item";
  _key: string;
  id?: string;
  section_id?: string | null;
  product_id: string | null;
  label: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  sort_order: number;
  line_type: "item";
  line_category: LineCategory | null;
  unit_cost_price: number | null;
  brand: string | null;
  supplier_ref: string | null;
  supplier_ref_snapshot: string | null;
  supplier_sku_snapshot: string | null;
  supplier_name_snapshot: string | null;
  raw_label_snapshot: string | null;
  normalized_label_snapshot: string | null;
  customer_label: string | null;
  metadata: QuoteLineMetadata;  // non optionnel
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

const CATEGORY_TONE: Record<LineCategory, string> = {
  device: "bg-warning/10 text-warning border-warning/20",
  flue: "bg-info/10 text-info border-info/20",
  labor: "bg-success/10 text-success border-success/20",
  option: "bg-accent/10 text-accent border-accent/20",
  misc: "bg-muted text-muted-foreground border-border",
};

const CATEGORY_ORDER: LineCategory[] = ["device", "flue", "labor", "option", "misc"];

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

const UNIT_LABELS: Record<UnitType, string> = {
  u: "Unité", m: "Mètre", m2: "m²", forfait: "Forfait", h: "Heure",
};

const KIND_LABELS: Record<string, string> = {
  estimate: "Estimatif", final: "Définitif", service: "SAV",
};

function resolveDisplayLabel(row: EditorItem): string {
  return (
    (row.customer_label && row.customer_label.trim()) ||
    (row.normalized_label_snapshot && row.normalized_label_snapshot.trim()) ||
    (row.raw_label_snapshot && row.raw_label_snapshot.trim()) ||
    row.label ||
    ""
  );
}

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
  const [includeLowPriority, setIncludeLowPriority] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "conduits" | "terminaux" | "raccords" | "labor">("all");
  const { results, loading } = useCatalogSearch(term, null, includeLowPriority);

  const categorize = (item: CatalogItem): "conduits" | "terminaux" | "raccords" | "labor" | "other" => {
    const k = (item.product_kind ?? "").toLowerCase();
    const t = (item.product_type ?? "").toLowerCase();
    const name = `${item.normalized_name ?? item.name ?? ""}`.toLowerCase();
    if (item.is_labor || k === "labor" || t === "service") return "labor";
    if (k.includes("terminal") || k.includes("sortie") || name.includes("sortie de toit") || name.includes("terminal")) return "terminaux";
    if (k.includes("fitting") || k.includes("elbow") || k.includes("tee") || k.includes("raccord") || k.includes("coude") || item.angle_deg != null) return "raccords";
    if (k.includes("conduit") || k.includes("flue") || k.includes("duct") || k.includes("tube") || k.includes("element")) return "conduits";
    return "other";
  };

  const counts = useMemo(() => {
    const c = { all: results.length, conduits: 0, terminaux: 0, raccords: 0, labor: 0 };
    results.forEach((r) => {
      const cat = categorize(r);
      if (cat in c) (c as Record<string, number>)[cat]++;
    });
    return c;
  }, [results]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return results;
    return results.filter((r) => categorize(r) === activeTab);
  }, [results, activeTab]);

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    setOpen(false);
    setTerm("");
    setActiveTab("all");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 overflow-hidden" style={{ width: 520 }} align="start">
        <Command
          shouldFilter={false}
          onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setOpen(false); } }}
        >
          <CommandInput
            placeholder="Référence, désignation ou diamètre (ex: 80/130)…"
            value={term}
            onValueChange={setTerm}
            autoFocus
          />
          <div className="px-2 pt-2 border-b border-border">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="h-8 bg-transparent p-0 gap-1">
                <TabsTrigger value="all" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  Tous {results.length > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{counts.all}</span>}
                </TabsTrigger>
                <TabsTrigger value="conduits" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  Conduits {counts.conduits > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{counts.conduits}</span>}
                </TabsTrigger>
                <TabsTrigger value="terminaux" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  Terminaux {counts.terminaux > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{counts.terminaux}</span>}
                </TabsTrigger>
                <TabsTrigger value="raccords" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  Raccords {counts.raccords > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{counts.raccords}</span>}
                </TabsTrigger>
                <TabsTrigger value="labor" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  Main d'œuvre {counts.labor > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{counts.labor}</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea style={{ maxHeight: "65vh" }} className="overflow-y-auto">
            <CommandList className="max-h-none overflow-visible">
              {loading && (
                <div className="p-3 space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-3 w-1/3" />
                      {i < 2 && <Separator className="!my-2" />}
                    </div>
                  ))}
                </div>
              )}

              {!loading && term.length < 2 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Tape au moins 2 caractères pour rechercher.
                </div>
              )}

              {!loading && term.length >= 2 && filtered.length === 0 && (
                <CommandEmpty className="py-6">
                  <div className="space-y-2 text-center">
                    <p className="text-sm text-muted-foreground">Aucun résultat dans cette catégorie.</p>
                    {activeTab !== "all" && results.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveTab("all")}>
                        Voir tous les résultats ({results.length})
                      </Button>
                    )}
                    {activeTab === "all" && !includeLowPriority && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setIncludeLowPriority(true)}>
                        Élargir aux familles secondaires
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              )}

              {!loading && filtered.length > 0 && (
                <CommandGroup className="px-1 py-1">
                  {filtered.map((item) => {
                    const title = item.normalized_name ?? item.name;
                    const ref = item.sku_code ?? item.sku ?? item.supplier_ref;
                    const specs = [
                      item.diameter_outer_mm ? `Ø${item.diameter_inner_mm ?? "?"}/${item.diameter_outer_mm}` : item.diameter_inner_mm ? `Ø${item.diameter_inner_mm}` : null,
                      item.length_mm ? `${item.length_mm}mm` : null,
                      item.angle_deg ? `${item.angle_deg}°` : null,
                      item.finish_color,
                      item.technology_type,
                    ].filter((x): x is string => x !== null && x !== undefined && x !== "");

                    return (
                      <CommandItem
                        key={item.id}
                        value={`${item.id}__${title}__${ref ?? ""}`}
                        onSelect={() => handleSelect(item)}
                        className="flex flex-col items-stretch gap-1 px-2.5 py-2 cursor-pointer aria-selected:bg-accent/40 data-[selected=true]:bg-accent/40 rounded-md"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{title}</span>
                          {item.needs_human_review && (
                            <span title="Vérification obligatoire — DTA / DTU" className="text-[10px] text-warning font-semibold shrink-0">⚠️</span>
                          )}
                          {item.supplier_name && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4 px-1.5 font-normal shrink-0">{item.supplier_name}</Badge>
                          )}
                        </div>
                        {specs.length > 0 && (
                          <div className="text-xs text-muted-foreground font-mono leading-tight truncate">{specs.join(" · ")}</div>
                        )}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground truncate min-w-0">
                            {item.supplier_range && <span className="text-foreground/70">{item.supplier_range}</span>}
                            {item.supplier_range && ref && <span className="mx-1">·</span>}
                            {ref && <span className="font-mono">réf {ref}</span>}
                          </span>
                          <span className="font-mono text-foreground shrink-0">
                            {item.prix_sur_devis ? "Sur demande" : `${item.unit_price_ht.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {!loading && term.length >= 2 && (
                <>
                  <Separator />
                  <div className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => setIncludeLowPriority((v) => !v)}
                    >
                      {includeLowPriority ? "Masquer les familles secondaires" : "Afficher les familles secondaires (gaz, ventilation…)"}
                    </button>
                  </div>
                </>
              )}
            </CommandList>
          </ScrollArea>

          <Separator />
          <div className="p-1.5">
            <Button variant="ghost" size="sm" className="w-full text-xs h-8"
              onClick={() => { onFreeLine(); setOpen(false); setTerm(""); setActiveTab("all"); }}
            >
              Saisir une ligne libre
            </Button>
          </div>
        </Command>
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

function SectionRow({ row, subtotal, onChange, onDuplicate, onDelete }: {
  row: EditorSection; subtotal: number; onChange: (label: string) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
      <Layers className="h-4 w-4 text-accent shrink-0" />
      <Input value={row.label} onChange={(e) => onChange(e.target.value)}
        className="font-semibold text-sm border-none bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto"
        placeholder="Nom de la section" />
      <span className="ml-auto font-mono text-sm text-muted-foreground shrink-0">{formatCurrency(subtotal)}</span>
      <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

function CategoryPicker({ value, onChange }: { value: LineCategory | null | undefined; onChange: (v: LineCategory | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value ? (
          <button type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:opacity-80 ${CATEGORY_TONE[value]}`}
            title="Modifier la catégorie">
            <span className="truncate max-w-[110px]">{CATEGORY_LABELS[value]}</span>
          </button>
        ) : (
          <button type="button"
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
            title="Catégoriser cette ligne">
            <Tag className="h-3 w-3" /> Catégorie
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <button type="button" onClick={() => { onChange(null); setOpen(false); }}
          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted text-muted-foreground">
          — Aucune
        </button>
        {(Object.entries(CATEGORY_LABELS) as [LineCategory, string][]).map(([k, v]) => (
          <button key={k} type="button" onClick={() => { onChange(k); setOpen(false); }}
            className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted ${value === k ? "bg-accent/10 text-foreground font-medium" : "text-foreground"}`}>
            {v}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ItemRow({ row, index, onChange, onDuplicate, onDelete }: {
  row: EditorItem; index: number; onChange: (field: string, value: unknown) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const totalHt = row.qty * row.unit_price_ht;
  const cost = row.unit_cost_price ?? 0;
  const margin = totalHt - row.qty * cost;
  const marginPct = totalHt > 0 ? (margin / totalHt) * 100 : 0;
  const hasCost = row.unit_cost_price != null && row.unit_cost_price > 0;
  const marginTone = !hasCost ? "text-muted-foreground/60" : margin < 0 ? "text-destructive" : marginPct < 15 ? "text-warning" : "text-success";
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_60px_72px_92px_72px_88px_110px_36px] gap-1.5 items-start px-3 py-2 hover:bg-muted/20 rounded transition-colors">
      <span className="text-xs text-muted-foreground text-center tabular-nums pt-2">{index}</span>
      <div className="min-w-0 space-y-1">
        <Textarea
          value={resolveDisplayLabel(row)}
          onChange={(e) => onChange("customer_label", e.target.value)}
          placeholder="Désignation — renommez pour le client si besoin"
          rows={1}
          className="min-h-[32px] resize-none text-sm font-medium leading-snug px-2 py-1.5 overflow-hidden"
          ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
          onInput={(e) => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryPicker value={row.line_category} onChange={(v) => onChange("line_category", v)} />
          {row.brand && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {row.brand}{row.supplier_ref ? ` · ${row.supplier_ref}` : ""}
            </span>
          )}
        </div>
        {(row.supplier_name_snapshot || row.supplier_ref_snapshot) && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            {[row.supplier_name_snapshot, row.supplier_sku_snapshot ?? row.supplier_ref_snapshot].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <Input type="number" min={0} step={0.01} value={row.qty || ""} onChange={(e) => onChange("qty", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right mt-0" />
      <Select value={row.unit} onValueChange={(v) => onChange("unit", v)}>
        <SelectTrigger className="h-8 text-xs mt-0"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.entries(UNIT_LABELS) as [UnitType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="number" min={0} step={0.01} value={row.unit_price_ht || ""} onChange={(e) => onChange("unit_price_ht", parseFloat(e.target.value) || 0)} className="h-8 text-sm text-right font-medium" placeholder="0.00" />
      <Input type="number" min={0} step={0.01}
        value={row.unit_cost_price ?? ""}
        onChange={(e) => onChange("unit_cost_price", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
        className="h-7 text-xs text-right text-muted-foreground bg-muted/20 border-dashed"
        placeholder="—" title="Coût d'achat HT (interne)" />
      <Select value={String(row.vat_rate)} onValueChange={(v) => onChange("vat_rate", parseFloat(v))}>
        <SelectTrigger className="h-8 text-xs mt-0"><SelectValue /></SelectTrigger>
        <SelectContent>{VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r} %</SelectItem>)}</SelectContent>
      </Select>
      <div className="text-right pt-1">
        <div className="font-mono text-sm font-semibold text-foreground tabular-nums">{formatCurrency(totalHt)}</div>
        {hasCost && (
          <div className={`font-mono text-[10px] leading-tight tabular-nums ${marginTone}`} title="Marge HT (interne)">
            Marge {formatCurrency(margin)} ({marginPct.toFixed(0)} %)
          </div>
        )}
      </div>
      <div className="pt-0.5"><RowMenu onDuplicate={onDuplicate} onDelete={onDelete} /></div>
    </div>
  );
}

function TextRow({ row, onChange, onDuplicate, onDelete }: {
  row: EditorText; onChange: (label: string) => void; onDuplicate: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5">
      <Type className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
      <Textarea value={row.label} onChange={(e) => onChange(e.target.value)}
        placeholder="Texte libre (commentaire, condition…)"
        className="min-h-[36px] text-sm italic text-muted-foreground border-dashed resize-none" rows={1} />
      <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export default function QuoteEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const quoteKind = searchParams.get("kind") || "estimate";
  const existingQuoteId = searchParams.get("quote_id")
    || searchParams.get("id")
    || null;
  const navigate = useNavigate();
  const { coreUser, tenantId } = useCurrentUser();
  const { createQuote, quote, error: hookError, setQuote } = useCreateQuote();

  const [rows, setRows] = useState<EditorRow[]>([]);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [quoteDate, setQuoteDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [subject, setSubject] = useState("");
  const [depositPct, setDepositPct] = useState<number | null>(null);
  const [globalDiscountPct, setGlobalDiscountPct] = useState<number>(0);
  const [visitDate, setVisitDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [saveToLibOpen, setSaveToLibOpen] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [bundleNotes, setBundleNotes] = useState("");
  const [savingBundle, setSavingBundle] = useState(false);
  const [showSectionTotals, setShowSectionTotals] = useState<boolean>(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      if (DEV_BYPASS) {
        setProjectInfo({ id: projectId, project_number: "PRJ-DEV-001", customer_id: "dev-customer-id", customer_name: "Client test", customer_email: "test@test.fr", customer_phone: "06 00 00 00 00", customer_type: "individual", address_line1: "12 rue du Test", city: "Paris", postal_code: "75001" });
        return;
      }
      const { data } = await coreDb.from("v_projects_with_customer").select("*").eq("id", projectId).single();
      if (data) {
        const d = data as Record<string, unknown>;
        setProjectInfo({
          id: String(d.id), project_number: String(d.project_number || ""),
          customer_id: d.customer_id ? String(d.customer_id) : null,
          customer_name: String(d.customer_name || ""),
          customer_email: d.customer_email ? String(d.customer_email) : null,
          customer_phone: d.customer_phone ? String(d.customer_phone) : null,
          customer_type: String(d.customer_type || "individual"),
          address_line1: String(d.address_line1 || ""), city: String(d.city || ""), postal_code: String(d.postal_code || ""),
          flue_scenario: d.payload && typeof d.payload === "object" ? String((d.payload as Record<string, unknown>).flue_scenario ?? "") || null : null,
        });
      }
    })();
  }, [projectId]);

  const loadExistingQuote = useCallback(async (quoteId: string) => {
    try {
      const { data: q, error: qErr } = await billingDb
        .from("quotes")
        .select("id, quote_number, quote_kind, quote_status, quote_date, expiry_date, total_ht, total_vat, total_ttc, customer_id, property_id, project_id, subject, deposit_pct, global_discount_pct, payload")
        .eq("id", quoteId)
        .single();

      if (qErr) throw qErr;

      setQuote(q as QuoteSummary);
      setQuoteDate(q.quote_date);
      setExpiryDate(q.expiry_date);

      const qr = q as unknown as Record<string, unknown>;
      setSubject((qr.subject as string) || "");
      setDepositPct((qr.deposit_pct as number) ?? null);
      setGlobalDiscountPct((qr.global_discount_pct as number) ?? 0);

      const payload = (qr.payload as Record<string, unknown>) ?? {};
      setVisitDate((payload.visit_date as string) || "");
      setStartDate((payload.start_date as string) || "");
      if (typeof payload.show_section_totals === "boolean") {
        setShowSectionTotals(payload.show_section_totals);
      }

      const { data: sections } = await billingDb
        .from("quote_sections")
        .select("id, label, sort_order")
        .eq("quote_id", quoteId)
        .order("sort_order");

      const { data: lines, error: lErr } = await billingDb
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order");

      if (lErr) throw lErr;

      const editorRows: EditorRow[] = [];

      (sections ?? []).forEach((s) => {
        editorRows.push({
          _type: "section",
          _key: nextKey(),
          id: s.id,
          label: s.label,
          sort_order: s.sort_order,
        });
      });

      (lines ?? []).forEach((l) => {
        if (l.line_type === "text") {
          editorRows.push({
            _type: "text",
            _key: nextKey(),
            id: l.id,
            section_id: l.section_id ?? null,
            label: l.label,
            sort_order: l.sort_order,
            line_type: "text",
          });
        } else {
          editorRows.push({
            _type: "item",
            _key: nextKey(),
            id: l.id,
            section_id: l.section_id ?? null,
            product_id: l.product_id ?? null,
            label: l.label,
            qty: Number(l.qty),
            unit: l.unit || "u",
            unit_price_ht: Number(l.unit_price_ht),
            vat_rate: Number(l.vat_rate),
            sort_order: l.sort_order,
            line_type: "item",
            line_category: l.line_category ?? null,
            unit_cost_price: l.unit_cost_price != null ? Number(l.unit_cost_price) : null,
            brand: l.brand ?? null,
            supplier_ref: l.supplier_ref ?? null,
            supplier_ref_snapshot: l.supplier_ref_snapshot ?? null,
            supplier_sku_snapshot: l.supplier_sku_snapshot ?? null,
            supplier_name_snapshot: l.supplier_name_snapshot ?? null,
            raw_label_snapshot: l.raw_label_snapshot ?? null,
            normalized_label_snapshot: l.normalized_label_snapshot ?? null,
            customer_label: l.customer_label ?? null,
            metadata: (l.metadata as QuoteLineMetadata) ?? buildManualMetadata(),
          });
        }
      });

      editorRows.sort((a, b) => a.sort_order - b.sort_order);
      setRows(editorRows);
    } catch (err: any) {
      toast.error(err.message ?? "Erreur lors du chargement du devis");
    } finally {
      setInitializing(false);
    }
  }, [setQuote]);

  /**
   * QuoteEditor — 4 modes selon les query params :
   * MODE CREATE  : aucun quote_id → createQuote() → rows=[]
   * MODE EDIT    : quote_id présent → loadExistingQuote() → rows hydratés
   * MODE DUPLICATE : géré par handleDuplicate() → navigation séparée
   * MODE FINAL   : kind=final sans quote_id → createQuote(kind=final)
   *
   * INVARIANT : si existingQuoteId est présent, ne jamais appeler createQuote().
   * Violation = devis fantôme en base.
   */
  useEffect(() => {
    if (!projectId || initRef.current) return;
    initRef.current = true;
    if (existingQuoteId) {
      loadExistingQuote(existingQuoteId);
    } else {
      createQuote(projectId, quoteKind).then((q) => {
        if (q) {
          setQuoteDate(q.quote_date);
          setExpiryDate(q.expiry_date);
          const qr = q as unknown as Record<string, unknown>;
          setSubject((qr.subject as string) || "");
          setDepositPct((qr.deposit_pct as number) ?? null);
          setGlobalDiscountPct((qr.global_discount_pct as number) ?? 0);
          const payload = (qr.payload as Record<string, unknown>) ?? {};
          if (typeof payload.show_section_totals === "boolean") {
            setShowSectionTotals(payload.show_section_totals);
          }
        }
        setInitializing(false);
      });
    }
  }, [projectId, existingQuoteId, createQuote, quoteKind, loadExistingQuote]);

  // ─── addItem : seul point d'entrée pour créer une ligne ────────
  const addItem = useCallback(async (
    catalogItem?: CatalogItem,
    forcedCategory?: LineCategory | null,
  ) => {
    let autoCategory: LineCategory | null = forcedCategory ?? null;
    let metadata: QuoteLineMetadata;
    let costPrice: number | null = null;

    if (catalogItem) {
      // Catégorie automatique
      const pt = catalogItem.product_type;
      if (!autoCategory) {
        if (pt === "service") autoCategory = "labor";
        else if (pt === "appliance") autoCategory = "device";
        else if (pt === "flue" || pt === "conduit") autoCategory = "flue";
        else if (catalogItem.is_labor) autoCategory = "labor";
      }

      if (DEV_BYPASS || !tenantId) {
        // Mode dev — metadata minimal sans appel réseau
        metadata = buildCatalogMetadata(
          {
            status: "dev_bypass", public_price_ht: catalogItem.unit_price_ht,
            net_price_ht: catalogItem.cost_price ?? catalogItem.unit_price_ht,
            discount_applied: false, pricing_source: null, bareme_code: null,
          },
          catalogItem,
        );
        costPrice = catalogItem.cost_price ?? null;
      } else {
        // Production — resolve_item_price est la SEULE source de pricing
        // Fail hard : si la RPC échoue, la ligne N'EST PAS ajoutée
        let priceData: Record<string, unknown>;
        try {
          const { data, error } = await catalogDb.rpc("resolve_item_price", {
            p_item_id: catalogItem.id,
            p_tenant_id: tenantId,
            // Passer supplier_name améliore la résolution des remises distributeur
            p_purchase_supplier_name: catalogItem.supplier_name ?? null,
          });
          if (error) throw error;
          if (!data || typeof data !== "object") throw new Error("resolve_item_price returned empty");
          priceData = data as Record<string, unknown>;
        } catch (err) {
          console.error("[QuoteEditor] resolve_item_price failed:", err);
          toast.error("Impossible de résoudre le prix de cet article. L'article n'a pas été ajouté.");
          return; // Fail hard — on n'ajoute pas la ligne
        }

        // net_price_ht doit être présent
        if (priceData.net_price_ht == null) {
          toast.error("Prix achat non disponible pour cet article. L'article n'a pas été ajouté.");
          return;
        }

        costPrice = Number(priceData.net_price_ht);
        metadata = buildCatalogMetadata(priceData, catalogItem);
      }
    } else {
      // Ligne manuelle — metadata complet avec source="manual"
      metadata = buildManualMetadata();
    }

    const vatRate = catalogItem?.vat_rate != null && catalogItem.vat_rate > 0
      ? catalogItem.vat_rate
      : suggestedVat(catalogItem?.product_type ?? "");

    const newRow: EditorItem = {
      _type: "item", _key: nextKey(), line_type: "item",
      product_id: catalogItem?.id ?? null,
      label: catalogItem?.normalized_name?.trim() || catalogItem?.name?.trim() || "",
      qty: 1,
      unit: catalogItem?.unit || "u",
      unit_price_ht: catalogItem?.unit_price_ht || 0,
      vat_rate: vatRate,
      sort_order: rows.length,
      line_category: autoCategory,
      unit_cost_price: costPrice,
      brand: catalogItem?.supplier_name ?? null,
      supplier_ref: catalogItem?.supplier_ref ?? null,
      supplier_ref_snapshot: catalogItem?.supplier_ref ?? null,
      supplier_sku_snapshot: catalogItem?.sku_code ?? catalogItem?.sku ?? null,
      supplier_name_snapshot: catalogItem?.supplier_name ?? null,
      raw_label_snapshot: catalogItem?.name ?? null,
      normalized_label_snapshot: catalogItem?.normalized_name ?? null,
      customer_label: null,
      metadata,
    };
    setRows((prev) => [...prev, newRow]);
  }, [rows.length, tenantId]);

  const addSection = useCallback(() => {
    setRows((prev) => [...prev, { _type: "section", _key: nextKey(), label: "Nouvelle section", sort_order: prev.length }]);
  }, []);

  const addText = useCallback(() => {
    setRows((prev) => [...prev, { _type: "text", _key: nextKey(), label: "", sort_order: prev.length, line_type: "text" }]);
  }, []);

  const updateRow = useCallback((key: string, field: string, value: unknown) => {
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
      vatMap[item.vat_rate] = (vatMap[item.vat_rate] || 0) + lineHt * (item.vat_rate / 100);
    }
    const totalVat = Object.values(vatMap).reduce((s, v) => s + v, 0);
    const totalTtc = totalHt + totalVat;
    const discountAmount = totalHt * (globalDiscountPct / 100);
    const totalHtAfterDiscount = totalHt - discountAmount;
    const totalVatAfterDiscount = totalVat * (1 - globalDiscountPct / 100);
    const totalTtcAfterDiscount = totalHtAfterDiscount + totalVatAfterDiscount;
    return { totalHt, vatMap, totalVat, totalTtc, discountAmount, totalHtAfterDiscount, totalVatAfterDiscount, totalTtcAfterDiscount };
  }, [rows, globalDiscountPct]);

  const sectionSubtotals = useMemo(() => {
    const map: Record<string, number> = {};
    let cur: string | null = null;
    for (const row of rows) {
      if (row._type === "section") { cur = row._key; map[row._key] = 0; }
      else if (row._type === "item" && cur) { map[cur] = (map[cur] || 0) + row.qty * row.unit_price_ht; }
    }
    return map;
  }, [rows]);

  const categorySubtotals = useMemo(() => {
    const map: Partial<Record<LineCategory, number>> = {};
    for (const row of rows) {
      if (row._type !== "item" || !row.line_category) continue;
      map[row.line_category] = (map[row.line_category] || 0) + row.qty * row.unit_price_ht;
    }
    return map;
  }, [rows]);

  const hasAnyCategory = Object.keys(categorySubtotals).length > 0;
  const hasUserSections = useMemo(() => rows.some((r) => r._type === "section"), [rows]);
  const useCategoryGrouping = !hasUserSections && hasAnyCategory;

  const groupedRows = useMemo(() => {
    if (!useCategoryGrouping) return null;
    const groups: Record<LineCategory | "none", EditorRow[]> = { device: [], flue: [], labor: [], option: [], misc: [], none: [] };
    for (const row of rows) {
      if (row._type === "item") groups[row.line_category ?? "none"].push(row);
      else groups.none.push(row);
    }
    return groups;
  }, [rows, useCategoryGrouping]);

  const marginTotals = useMemo(() => {
    let sale = 0, cost = 0, coveredSale = 0;
    for (const row of rows) {
      if (row._type !== "item") continue;
      const ht = row.qty * row.unit_price_ht;
      sale += ht;
      if (row.unit_cost_price != null && row.unit_cost_price > 0) { cost += row.qty * row.unit_cost_price; coveredSale += ht; }
    }
    const margin = coveredSale - cost;
    const pct = coveredSale > 0 ? (margin / coveredSale) * 100 : 0;
    return { margin, pct, hasCost: cost > 0, fullyCovered: coveredSale === sale && sale > 0 };
  }, [rows]);

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = useCallback(async (finalize = false) => {
    if (!quote || !tenantId) return;

    const itemLines = rows.filter((r): r is EditorItem => r._type === "item");
    if (itemLines.length === 0) { toast.error("Ajoutez au moins une ligne avant d'enregistrer"); return; }

    // GARDE CRITIQUE : aucune ligne catalogue sans metadata.pricing valide
    const missingPricing = itemLines.filter(
      (l) => l.product_id !== null && l.metadata.pricing.status === "manual",
    );
    if (missingPricing.length > 0) {
      toast.error(
        `${missingPricing.length} ligne(s) catalogue sans pricing résolu. Supprimez-les et rajoutez-les depuis le catalogue.`,
      );
      return;
    }

    setSavingAll(true);
    try {
      await billingDb.from("quotes").update({
        quote_kind: quote.quote_kind,
        quote_date: quoteDate,
        expiry_date: expiryDate,
        subject: subject.trim() || null,
        deposit_pct: depositPct ?? null,
        global_discount_pct: globalDiscountPct || 0,
        payload: {
          ...((quote as unknown as Record<string, unknown>).payload as Record<string, unknown> ?? {}),
          visit_date: visitDate || null,
          start_date: startDate || null,
          show_section_totals: showSectionTotals,
        },
      }).eq("id", quote.id);

      let globalOrder = 0;
      const reorderedRows = rows.map((r) => ({ ...r, sort_order: globalOrder++ }));
      const sectionRows = reorderedRows.filter((r): r is EditorSection => r._type === "section");

      let currentSectionKey: string | null = null;
      const lineRows: Array<(EditorItem | EditorText) & { section_key: string | null }> = [];
      for (const row of reorderedRows) {
        if (row._type === "section") { currentSectionKey = row._key; }
        else { lineRows.push({ ...(row as EditorItem | EditorText), section_key: currentSectionKey }); }
      }

      const { error: saveErr } = await billingDb.rpc("replace_quote_lines", {
        p_quote_id: quote.id,
        p_tenant_id: tenantId,
        p_sections: sectionRows.map((s) => ({ _key: s._key, label: s.label, sort_order: s.sort_order })),
        p_lines: lineRows.map((l) => {
          const isItem = l._type === "item";
          const li = isItem ? (l as EditorItem) : null;
          return {
            section_key: l.section_key ?? null,
            line_type: isItem ? "item" : "text",
            product_id: li?.product_id ?? null,
            label: isItem ? resolveDisplayLabel(li!) : l.label,
            qty: li?.qty ?? 0,
            unit: li?.unit ?? "u",
            unit_price_ht: li?.unit_price_ht ?? 0,
            vat_rate: li?.vat_rate ?? 0,
            sort_order: l.sort_order,
            line_category: li?.line_category ?? null,
            unit_cost_price: li?.unit_cost_price ?? null,
            brand: li?.brand ?? null,
            supplier_ref: li?.supplier_ref ?? null,
            supplier_ref_snapshot: li?.supplier_ref_snapshot ?? null,
            supplier_sku_snapshot: li?.supplier_sku_snapshot ?? null,
            supplier_name_snapshot: li?.supplier_name_snapshot ?? null,
            raw_label_snapshot: li?.raw_label_snapshot ?? null,
            normalized_label_snapshot: li?.normalized_label_snapshot ?? null,
            customer_label: li?.customer_label ?? null,
            display_label: isItem ? resolveDisplayLabel(li!) : null,
            // metadata toujours complet — jamais {} ni null
            metadata: li?.metadata ?? buildManualMetadata(),
          };
        }),
      });
      if (saveErr) throw saveErr;

      if (finalize) {
        if (!DEV_BYPASS) {
          const { data: session } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
          const sub = session?.session?.user?.id;
          if (!sub) throw new Error("Session expirée");
          const { data: actor } = await coreDb.from("users").select("id").eq("auth_uid", sub).maybeSingle();
          if (!actor?.id) throw new Error("Utilisateur introuvable");
          const { error: rpcErr } = await billingDb.rpc("transition_quote_status", {
            p_quote_id: quote.id, p_new_status: "sent",
            p_actor_id: (actor as Record<string, unknown>).id,
            p_reason: "Devis envoyé au client",
          });
          if (rpcErr) throw rpcErr;
        }
        if (projectInfo?.customer_id) {
          await coreDb.from("customers").update({ status: "active" }).eq("id", projectInfo.customer_id).eq("status", "prospect");
          toast.success("Devis finalisé — client converti");
        } else {
          toast.success("Devis finalisé et envoyé");
        }
        navigate(`/projects/${projectId}?tab=commercial`);
      } else {
        toast.success("Devis enregistré");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSavingAll(false);
    }
  }, [quote, tenantId, quoteDate, expiryDate, visitDate, startDate, rows, projectInfo, navigate, projectId, subject, depositPct, globalDiscountPct, showSectionTotals]);

  const handleDuplicate = useCallback(async () => {
    if (!quote || !tenantId || !coreUser) { toast.error("Session non prête, réessayez dans un instant"); return; }
    setDuplicating(true);
    try {
      const { data, error } = await billingDb.rpc("duplicate_quote", {
        p_quote_id: quote.id, p_tenant_id: tenantId,
        p_actor_id: (coreUser as Record<string, unknown>).id,
      });
      if (error) throw error;
      const result = data as { success: boolean; new_quote_id: string; new_quote_number: string; project_id: string | null; };
      toast.success(`Devis dupliqué : ${result.new_quote_number}`, { description: "Ouverture du nouveau devis…" });
      navigate(`/projects/${result.project_id || projectId}/quotes/editor?id=${result.new_quote_id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la duplication");
    } finally {
      setDuplicating(false);
    }
  }, [quote, tenantId, coreUser, projectId, navigate]);

  const itemRows = useMemo(() => rows.filter((r): r is EditorItem => r._type === "item"), [rows]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!bundleName.trim() || !tenantId || itemRows.length === 0) { toast.error("Ajoutez au moins une ligne avant d'enregistrer"); return; }
    setSavingBundle(true);
    try {
      const { catalogDb: cDb } = await import("@/integrations/supabase/schema-clients");
      const { error } = await cDb.rpc("save_lines_as_bundle", {
        p_tenant_id: tenantId, p_name: bundleName.trim(),
        p_lines: itemRows.map((r) => ({ label: r.label, qty: r.qty, unit: r.unit, unit_price_ht: r.unit_price_ht, vat_rate: r.vat_rate, line_category: r.line_category ?? null })),
        p_notes: bundleNotes.trim() || null,
      });
      if (error) throw error;
      toast.success("Ouvrage enregistré dans votre catalogue", { description: bundleName });
      setSaveToLibOpen(false); setBundleName(""); setBundleNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSavingBundle(false);
    }
  }, [bundleName, bundleNotes, tenantId, itemRows]);

  let itemCounter = 0;

  if (initializing) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-72" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" />
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
            <Button variant="outline" onClick={() => navigate(`/projects/${projectId}?tab=commercial`)}><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
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
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}?tab=commercial`)} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au projet
          </Button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-semibold text-foreground">{quote.quote_number || "Nouveau devis"}</span>
            <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          </div>
          {projectInfo && (
            <span className="hidden md:block text-sm text-muted-foreground truncate">
              {projectInfo.project_number} · {projectInfo.customer_name}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating || savingAll || !quote}>
              {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              <span className="hidden sm:inline">Dupliquer</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={savingAll}>
                  <BookOpen className="h-3.5 w-3.5 mr-1" /><span className="hidden sm:inline">Bibliothèque</span><ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSaveToLibOpen(true)} disabled={itemRows.length === 0}>
                  <BookmarkPlus className="h-3.5 w-3.5 mr-2" /> Enregistrer comme ouvrage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={savingAll}>
              {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />} Enregistrer
            </Button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={rows.length === 0 ? 0 : -1}>
                    <Button
                      size="sm"
                      onClick={() => handleSave(true)}
                      disabled={rows.length === 0 || savingAll}
                    >
                      {savingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />} Envoyer au client
                    </Button>
                  </span>
                </TooltipTrigger>
                {rows.length === 0 && (
                  <TooltipContent>Ajoutez au moins une ligne pour envoyer ce devis</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-36">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

          <Card>
            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-full">
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Titre du devis — ex : Fourniture et pose poêle à granulés"
                  className="h-10 text-base font-medium placeholder:text-muted-foreground/50"
                  maxLength={200}
                />
              </div>
              {projectInfo?.flue_scenario && (
                <div className="col-span-full -mt-2">
                  <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                    🏗️ {projectInfo.flue_scenario}
                  </Badge>
                </div>
              )}
              <div className="col-span-full space-y-1.5">
                <Label className="text-sm">Type de devis</Label>
                <Select value={quote.quote_kind} onValueChange={(v) => setQuote({ ...quote, quote_kind: v })}>
                  <SelectTrigger className="w-full sm:w-64 h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(KIND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Date d'émission</Label><Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Date d'expiration</Label><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Visite préalable <span className="text-muted-foreground/60">(optionnel)</span></Label><Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="h-8 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">Début des travaux <span className="text-muted-foreground/60">(optionnel)</span></Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-sm" /></div>
              <div className="col-span-full pt-3 mt-1 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2 flex-nowrap">
                  <Label className="text-sm text-muted-foreground shrink-0">Acompte</Label>
                  <Input type="number" min={0} max={100} step={1}
                    value={depositPct ?? ""}
                    onChange={(e) => setDepositPct(e.target.value === "" ? null : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="h-8 w-20 text-sm text-right" placeholder="0" />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">à la signature</span>
                  {depositPct != null && depositPct > 0 && (
                    <span className="font-mono text-sm font-semibold text-foreground whitespace-nowrap">
                      = {formatCurrency((globalDiscountPct > 0 ? totals.totalTtcAfterDiscount : totals.totalTtc) * depositPct / 100)} TTC
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-nowrap ml-auto">
                  <Switch id="show-section-totals" checked={showSectionTotals} onCheckedChange={setShowSectionTotals} />
                  <Label htmlFor="show-section-totals" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Sous-totaux par bloc (PDF)</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {quote.quote_kind === "final" && Object.keys(categorySubtotals).length >= 1 && (
            <div className="flex items-center gap-4 text-xs px-1">
              {(["device","flue","labor"] as const).map((cat) => {
                const ok = (categorySubtotals[cat] ?? 0) > 0;
                return (
                  <span key={cat} className={ok ? "text-success" : "text-muted-foreground/40"}>
                    {ok ? "✓" : "○"} {cat === "device" ? "Appareil" : cat === "flue" ? "Fumisterie" : "Pose"}
                  </span>
                );
              })}
            </div>
          )}

          <Card className="overflow-x-auto">
            <div className="hidden md:grid md:grid-cols-[28px_minmax(0,1fr)_60px_72px_92px_72px_88px_110px_36px] gap-1.5 px-3 py-2 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
              <span className="text-center">N°</span><span>Désignation</span><span className="text-right">Qté</span><span>Unité</span>
              <span className="text-right">Vente HT</span><span className="text-right opacity-60" title="Coût d'achat (interne)">Coût HT</span>
              <span>TVA</span><span className="text-right">Total HT</span><span />
            </div>

            <div className="divide-y divide-border/50">
              {rows.length === 0 && (
                <div className="py-12 px-6 text-center m-4 rounded-lg bg-muted/10 border-2 border-dashed border-border/60">
                  <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-base font-semibold text-foreground mb-1">Commencez votre devis</p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Structurez par <span className="font-medium text-foreground">🔥 Appareil</span> · <span className="font-medium text-foreground">🏗️ Fumisterie</span> · <span className="font-medium text-foreground">🔧 Pose</span>
                  </p>
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button size="lg" className="min-h-[48px] px-8 bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => addItem(undefined, "device")}><Flame className="h-4 w-4 mr-2" /> Ajouter un appareil</Button>
                      <Button size="sm" variant="outline" className="opacity-60 border-info/40 text-info hover:bg-info/10 hover:text-info" onClick={() => addItem(undefined, "flue")}><Construction className="h-3.5 w-3.5 mr-1.5" /> Ajouter la fumisterie</Button>
                      <Button size="sm" variant="outline" className="opacity-60 border-success/40 text-success hover:bg-success/10 hover:text-success" onClick={() => addItem(undefined, "labor")}><Wrench className="h-3.5 w-3.5 mr-1.5" /> Ajouter la pose</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 max-w-xs">
                      Commencez par l'appareil — la fumisterie et la pose se calibreront dessus. Dans la majorité des devis poêle, on commence par l'appareil.
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <CatalogPopover onSelect={(item) => addItem(item)} onFreeLine={() => addItem()} triggerLabel="Depuis le catalogue" triggerVariant="ghost" />
                      <span>·</span><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addItem()}>Ligne libre</Button>
                      <span>·</span><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addSection}><Layers className="h-3 w-3 mr-1" />Section</Button>
                      <span>·</span><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addText}><Type className="h-3 w-3 mr-1" />Texte</Button>
                    </div>
                  </div>
                </div>
              )}

              {rows.length > 0 && (() => {
                const renderRow = (row: EditorRow) => {
                  if (row._type === "section") return <SectionRow key={row._key} row={row} subtotal={sectionSubtotals[row._key] || 0} onChange={(l) => updateRow(row._key, "label", l)} onDuplicate={() => duplicateRow(row._key)} onDelete={() => deleteRow(row._key)} />;
                  if (row._type === "text") return <TextRow key={row._key} row={row} onChange={(l) => updateRow(row._key, "label", l)} onDuplicate={() => duplicateRow(row._key)} onDelete={() => deleteRow(row._key)} />;
                  itemCounter++;
                  return <ItemRow key={row._key} row={row} index={itemCounter} onChange={(f, v) => updateRow(row._key, f, v)} onDuplicate={() => duplicateRow(row._key)} onDelete={() => deleteRow(row._key)} />;
                };

                if (useCategoryGrouping && groupedRows) {
                  return (
                    <>
                      {CATEGORY_ORDER.map((cat) => {
                        const items = groupedRows[cat];
                        if (!items || items.length === 0) return null;
                        return (
                          <div key={cat}>
                            <div className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-l-2 ${CATEGORY_TONE[cat]}`}>
                              <span>{CATEGORY_LABELS[cat]}</span>
                              <span className="font-mono tabular-nums opacity-80">{formatCurrency(categorySubtotals[cat] || 0)}</span>
                            </div>
                            {items.map(renderRow)}
                          </div>
                        );
                      })}
                      {groupedRows.none.length > 0 && (
                        <div>
                          <div className="flex items-center px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-l-2 border-border bg-muted/30">Autres</div>
                          {groupedRows.none.map(renderRow)}
                        </div>
                      )}
                    </>
                  );
                }
                return <>{rows.map(renderRow)}</>;
              })()}
            </div>

            {rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-3 border-t border-border bg-muted/20">
                <Button size="sm" variant="outline" className="h-8 border-warning/40 text-warning hover:bg-warning/10 hover:text-warning" onClick={() => addItem(undefined, "device")}><Flame className="h-3.5 w-3.5 mr-1" /> Appareil</Button>
                <Button size="sm" variant="outline" className="h-8 border-info/40 text-info hover:bg-info/10 hover:text-info" onClick={() => addItem(undefined, "flue")}><Construction className="h-3.5 w-3.5 mr-1" /> Fumisterie</Button>
                <Button size="sm" variant="outline" className="h-8 border-success/40 text-success hover:bg-success/10 hover:text-success" onClick={() => addItem(undefined, "labor")}><Wrench className="h-3.5 w-3.5 mr-1" /> Pose</Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <CatalogPopover onSelect={(item) => addItem(item)} onFreeLine={() => addItem()} triggerLabel="Catalogue" />
                <Button variant="ghost" size="sm" onClick={() => addItem()}><Plus className="h-3.5 w-3.5 mr-1" /> Ligne libre</Button>
                <Button variant="ghost" size="sm" onClick={addSection}><Layers className="h-3.5 w-3.5 mr-1" /> Section</Button>
                <Button variant="ghost" size="sm" onClick={addText}><Type className="h-3.5 w-3.5 mr-1" /> Texte</Button>
                <div className="w-full flex items-center gap-3 border-t border-border/40 pt-2 mt-1">
                  <Label className="text-sm text-muted-foreground shrink-0">Remise globale</Label>
                  <Input type="number" min={0} max={50} step={0.5}
                    value={globalDiscountPct || ""}
                    onChange={(e) => setGlobalDiscountPct(Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                    className="h-7 w-16 text-sm text-right" placeholder="0" />
                  <span className="text-sm text-muted-foreground">%</span>
                  {globalDiscountPct > 0 && (
                    <span className="text-xs text-muted-foreground">
                      → -{formatCurrency(totals.discountAmount)} HT
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>

          {hasAnyCategory && (
            <Card><CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Répartition du devis (HT)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(["device", "flue", "labor", "option", "misc"] as LineCategory[]).map((cat) => {
                  const amount = categorySubtotals[cat];
                  if (amount === undefined) return null;
                  return (<div key={cat} className="flex flex-col gap-0.5 px-3 py-2 rounded-md border border-border bg-muted/20"><span className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat]}</span><span className="font-mono text-sm font-semibold text-foreground tabular-nums">{formatCurrency(amount)}</span></div>);
                })}
              </div>
            </CardContent></Card>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-6 items-center">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold"><Receipt className="h-3 w-3" /> Client</span>
              <div className="text-sm"><span className="text-muted-foreground">Total HT </span><span className="font-mono text-muted-foreground">{formatCurrency(totals.totalHt)}</span></div>
              {globalDiscountPct > 0 && <div className="text-xs text-destructive"><span>Remise {globalDiscountPct} % </span><span className="font-mono">-{formatCurrency(totals.discountAmount)}</span></div>}
              {Object.entries(totals.vatMap).sort(([a],[b])=>Number(a)-Number(b)).map(([rate,amount])=>(
                <div key={rate} className="text-xs"><span className="text-muted-foreground">TVA {rate}% </span><span className="font-mono text-muted-foreground">{formatCurrency(amount)}</span></div>
              ))}
              <div><span className="text-muted-foreground">Total TTC </span><span className="font-mono font-bold text-xl text-foreground">{formatCurrency(globalDiscountPct > 0 ? totals.totalTtcAfterDiscount : totals.totalTtc)}</span></div>
              {depositPct != null && depositPct > 0 && (
                <div className="text-xs"><span className="text-muted-foreground">Acompte ({depositPct} %) : </span><span className="font-mono font-semibold text-foreground">{formatCurrency((globalDiscountPct > 0 ? totals.totalTtcAfterDiscount : totals.totalTtc) * depositPct / 100)}</span></div>
              )}
            </div>
            <Separator orientation="vertical" className="h-10 hidden md:block" />
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm md:justify-end">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold" title="Information interne — non visible par le client"><TrendingUp className="h-3 w-3" /> Rentabilité</span>
              {marginTotals.hasCost ? (
                <>
                  <div className="text-xs"><span className="text-muted-foreground">Coût HT </span><span className="font-mono text-muted-foreground">{formatCurrency(totals.totalHt - marginTotals.margin)}</span></div>
                  <div title={marginTotals.fullyCovered ? "Marge HT totale" : "Marge HT — partielle"}>
                    <span className="text-muted-foreground">Marge </span>
                    <span className={`font-mono font-semibold text-base ${marginTotals.margin < 0 ? "text-destructive" : marginTotals.pct < 15 ? "text-warning" : "text-success"}`}>{formatCurrency(marginTotals.margin)}</span>
                    <span className={`ml-1 text-base font-mono font-semibold ${marginTotals.margin < 0 ? "text-destructive" : marginTotals.pct < 15 ? "text-warning" : "text-success"}`}>({marginTotals.pct.toFixed(0)} %)</span>
                    {!marginTotals.fullyCovered && <span className="ml-1.5 text-[10px] text-warning" title="Coûts manquants sur certaines lignes">Marge partielle</span>}
                  </div>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">Renseignez les coûts d'achat pour voir la marge</span>
              )}
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={saveToLibOpen} onOpenChange={setSaveToLibOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer comme ouvrage</DialogTitle>
            <DialogDescription>Cet ouvrage sera disponible dans votre catalogue pour les prochains devis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Nom de l'ouvrage *</Label><Input value={bundleName} onChange={(e) => setBundleName(e.target.value)} placeholder="ex : Fumisterie complète 6 m granulés" autoFocus /></div>
            <div className="space-y-1.5"><Label className="text-xs">Notes (optionnel)</Label><Textarea value={bundleNotes} onChange={(e) => setBundleNotes(e.target.value)} placeholder="Conditions d'application…" rows={2} /></div>
            <Card className="bg-muted/30"><CardContent className="p-3 text-xs text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground mb-1">Lignes incluses ({itemRows.length}) :</p>
              {itemRows.slice(0,4).map((r,i)=>(<p key={i} className="truncate">• {r.label||"Sans désignation"} — {formatCurrency(r.qty*r.unit_price_ht)}</p>))}
              {itemRows.length > 4 && <p>+ {itemRows.length-4} autres lignes</p>}
            </CardContent></Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveToLibOpen(false)} disabled={savingBundle}>Annuler</Button>
            <Button onClick={handleSaveToLibrary} disabled={!bundleName.trim() || savingBundle || itemRows.length === 0}>
              {savingBundle ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
