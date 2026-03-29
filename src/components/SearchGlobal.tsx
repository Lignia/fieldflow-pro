import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserPlus, X } from "lucide-react";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { UserAvatar } from "@/components/navigation/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomerResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  customer_type: string;
  status: string;
  civility: string | null;
}

function displayName(c: CustomerResult) {
  if (c.customer_type === "particulier") {
    return [c.civility, c.first_name, c.last_name].filter(Boolean).join(" ");
  }
  return c.company_name || "—";
}

export function SearchGlobal({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const { tenantId } = useCurrentUser();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (variant === "mobile") setMobileExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [variant]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (variant === "mobile") setMobileExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [variant]);

  const search = useCallback(
    async (raw: string) => {
      const clean = raw.trim().replace(/\s+/g, " ");
      const mots = clean.split(" ").filter(Boolean);
      if (!mots.length || !tenantId) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const orClauses = mots
          .flatMap((mot) => [
            `first_name.ilike.%${mot}%`,
            `last_name.ilike.%${mot}%`,
            `company_name.ilike.%${mot}%`,
            `phone.ilike.%${mot}%`,
            `email.ilike.%${mot}%`,
            `siret.ilike.%${mot}%`,
          ])
          .join(",");

        const { data } = await coreDb
          .from("customers")
          .select("id, first_name, last_name, company_name, phone, email, customer_type, status, civility")
          .eq("tenant_id", tenantId)
          .or(orClauses)
          .limit(6);

        setResults((data as CustomerResult[]) ?? []);
        setOpen(true);
        setActiveIdx(-1);
      } finally {
        setLoading(false);
      }
    },
    [tenantId]
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const selectResult = (id: string) => {
    setOpen(false);
    setQuery("");
    if (variant === "mobile") setMobileExpanded(false);
    navigate(`/clients/${id}`);
  };

  const createFromQuery = () => {
    const clean = query.trim().replace(/\s+/g, " ");
    setOpen(false);
    setQuery("");
    if (variant === "mobile") setMobileExpanded(false);
    navigate(`/clients/new?q=${encodeURIComponent(clean)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const total = results.length; // +0 for create button handled separately
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, total)); // total = create button index
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      if (activeIdx < total) selectResult(results[activeIdx].id);
      else createFromQuery();
    } else if (e.key === "Escape") {
      setOpen(false);
      if (variant === "mobile") setMobileExpanded(false);
    }
  };

  const clean = query.trim().replace(/\s+/g, " ");
  const hasQuery = clean.length > 0;

  // Mobile: icon button that expands
  if (variant === "mobile") {
    if (!mobileExpanded) {
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setMobileExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <div ref={containerRef} className="absolute inset-x-0 top-0 z-50 h-14 flex items-center gap-2 bg-card px-3 border-b">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher..."
          className="h-9 text-sm flex-1 border-0 shadow-none focus-visible:ring-0"
          autoFocus
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setMobileExpanded(false); setOpen(false); setQuery(""); }}>
          <X className="h-4 w-4" />
        </Button>
        {open && <Dropdown results={results} activeIdx={activeIdx} hasQuery={hasQuery} clean={clean} loading={loading} onSelect={selectResult} onCreate={createFromQuery} />}
      </div>
    );
  }

  // Desktop sidebar variant
  return (
    <div ref={containerRef} className="relative px-3 mb-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher...  ⌘K"
          className="h-8 pl-8 pr-2 text-xs bg-sidebar-accent/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      {open && <Dropdown results={results} activeIdx={activeIdx} hasQuery={hasQuery} clean={clean} loading={loading} onSelect={selectResult} onCreate={createFromQuery} />}
    </div>
  );
}

/* ── Dropdown panel ── */

function Dropdown({
  results, activeIdx, hasQuery, clean, loading, onSelect, onCreate,
}: {
  results: CustomerResult[];
  activeIdx: number;
  hasQuery: boolean;
  clean: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  if (!hasQuery) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-md border bg-popover shadow-lg overflow-hidden">
      {loading && (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">Recherche…</div>
      )}
      {!loading && results.length === 0 && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Aucun client trouvé pour « {clean} »
          </p>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full text-xs", activeIdx === 0 && "ring-2 ring-ring")}
            onClick={onCreate}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Créer ce contact
          </Button>
        </div>
      )}
      {!loading && results.length > 0 && (
        <ul className="py-1">
          {results.map((c, i) => (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm hover:bg-accent/50 transition-colors",
                activeIdx === i && "bg-accent text-accent-foreground"
              )}
              onMouseDown={() => onSelect(c.id)}
              onMouseEnter={() => {}}
            >
              <UserAvatar name={displayName(c)} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName(c)}</p>
                {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
              </div>
              <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[10px] shrink-0">
                {c.status === "active" ? "Client" : "Prospect"}
              </Badge>
            </li>
          ))}
          {/* Create button at bottom */}
          <li
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer text-xs text-muted-foreground hover:bg-accent/50 border-t transition-colors",
              activeIdx === results.length && "bg-accent text-accent-foreground"
            )}
            onMouseDown={onCreate}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Créer « {clean} »
          </li>
        </ul>
      )}
    </div>
  );
}
