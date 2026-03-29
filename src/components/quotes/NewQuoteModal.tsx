import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, Wrench, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { coreDb } from "@/integrations/supabase/schema-clients";
import { MOCK_PROJECTS as CENTRAL_MOCK_PROJECTS } from "@/mocks/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

type QuoteKind = "estimate" | "final" | "service";

interface ProjectOption {
  id: string;
  project_number: string;
  status: string;
  customer_name: string;
  city: string;
}

const MOCK_PROJECTS: ProjectOption[] = CENTRAL_MOCK_PROJECTS.map((p) => ({
  id: p.id,
  project_number: p.project_number,
  status: p.status,
  customer_name: p.customer.name,
  city: p.property.city,
}));

const FINAL_STATUSES = ["vt_done", "tech_review_done", "estimate_sent", "final_quote_sent", "signed", "deposit_paid"];

interface NewQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewQuoteModal({ open, onOpenChange }: NewQuoteModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<QuoteKind | null>(null);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setKind(null);
      setSearch("");
      setProjects([]);
      setSelectedProject(null);
    }
  }, [open]);

  // Search projects
  const searchProjects = useCallback(async (term: string, quoteKind: QuoteKind) => {
    if (DEV_BYPASS) {
      let list = MOCK_PROJECTS;
      if (quoteKind === "final") {
        list = list.filter((p) => FINAL_STATUSES.includes(p.status));
      }
      if (term.trim()) {
        const q = term.trim().toLowerCase();
        list = list.filter(
          (p) =>
            p.project_number.toLowerCase().includes(q) ||
            p.customer_name.toLowerCase().includes(q)
        );
      }
      setProjects(list);
      return;
    }

    setLoading(true);
    try {
      let query = coreDb
        .from("v_projects_with_customer")
        .select("id, project_number, customer_name, status, modified_at, city")
        .not("status", "in", "(closed,lost,cancelled)")
        .order("modified_at", { ascending: false })
        .limit(8);

      if (term.trim()) {
        query = query.ilike("project_number", `%${term.trim()}%`);
      }

      if (quoteKind === "final") {
        query = query.in("status", FINAL_STATUSES);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProjects(
        (data ?? []).map((p: any) => ({
          id: p.id,
          project_number: p.project_number,
          status: p.status,
          customer_name: p.customer_name ?? "Client inconnu",
          city: p.city ?? "",
        }))
      );
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on step 2 entry and search changes
  useEffect(() => {
    if (step === 2 && kind && kind !== "service") {
      const timeout = setTimeout(() => searchProjects(search, kind), 300);
      return () => clearTimeout(timeout);
    }
  }, [step, kind, search, searchProjects]);

  const handleKindSelect = (k: QuoteKind) => {
    setKind(k);
    setStep(2);
  };

  const handleProjectSelect = (p: ProjectOption) => {
    setSelectedProject(p);
    setStep(3);
  };

  const handleConfirm = () => {
    if (!selectedProject || !kind) return;
    onOpenChange(false);
    navigate(`/projects/${selectedProject.id}/quotes/new?kind=${kind}`);
  };

  const KIND_CONFIG = {
    estimate: { label: "Devis estimatif", desc: "Budget rapide avant la visite technique", icon: FileText },
    final: { label: "Devis final", desc: "Devis contractuel après visite technique", icon: FileText },
    service: { label: "Devis SAV", desc: "Intervention sur installation existante", icon: Wrench },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Créer un devis"}
            {step === 2 && "Sélectionner le projet"}
            {step === 3 && "Confirmation"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choisissez le type de devis à créer"}
            {step === 2 && (kind === "final"
              ? "Un devis final nécessite une visite technique effectuée"
              : "Sélectionnez le projet associé au devis")}
            {step === 3 && "Vérifiez les informations avant de continuer"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1 — Kind selection */}
        {step === 1 && (
          <div className="space-y-2">
            {(["estimate", "final", "service"] as QuoteKind[]).map((k) => {
              const cfg = KIND_CONFIG[k];
              const disabled = k === "service";
              const Icon = cfg.icon;

              const card = (
                <Card
                  key={k}
                  className={`p-4 transition-colors ${
                    disabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:border-primary/30"
                  }`}
                  onClick={disabled ? undefined : () => handleKindSelect(k)}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
                    </div>
                  </div>
                </Card>
              );

              if (disabled) {
                return (
                  <Tooltip key={k}>
                    <TooltipTrigger asChild><span>{card}</span></TooltipTrigger>
                    <TooltipContent>Disponible depuis une installation</TooltipContent>
                  </Tooltip>
                );
              }
              return card;
            })}
          </div>
        )}

        {/* Step 2 — Project selection */}
        {step === 2 && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(1)}>
              <ArrowLeft className="h-3 w-3 mr-1" />
              Retour
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un projet…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {loading && (
                <div className="py-6 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && projects.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Aucun projet compatible.
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {kind === "final"
                      ? "Effectuez d'abord la visite technique sur un projet."
                      : "Créez d'abord un projet."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/projects");
                    }}
                  >
                    Créer un projet
                  </Button>
                </div>
              )}
              {!loading &&
                projects.map((p) => (
                  <Card
                    key={p.id}
                    className="p-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => handleProjectSelect(p)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {p.project_number}
                      </span>
                      <span className="text-sm font-medium truncate">{p.customer_name}</span>
                      {p.city && (
                        <span className="text-xs text-muted-foreground truncate">{p.city}</span>
                      )}
                      <span className="flex-1" />
                      <StatusBadge status={p.status} type="project" size="sm" />
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && selectedProject && kind && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep(2)}>
              <ArrowLeft className="h-3 w-3 mr-1" />
              Retour
            </Button>
            <Card className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{KIND_CONFIG[kind].label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Projet</span>
                <span className="font-mono text-xs">{selectedProject.project_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client</span>
                <span>{selectedProject.customer_name}</span>
              </div>
              {selectedProject.city && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ville</span>
                  <span>{selectedProject.city}</span>
                </div>
              )}
            </Card>
            <Button className="w-full" onClick={handleConfirm}>
              Créer le devis
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
