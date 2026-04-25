import { useState, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Upload, FileText, X, Loader2, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type CatalogType = "fumisterie" | "appareils";

interface ImportResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  supplier?: string;
  error?: string;
}

const TYPE_OPTIONS: Record<
  CatalogType,
  {
    label: string;
    placeholder: string;
    helpTitle: string;
    helpBody: string;
    formatDetail: string;
  }
> = {
  fumisterie: {
    label: "Fumisterie — Joncoux, Poujoulat, Tubest, Jeremias, Dinak, Modinox…",
    placeholder: "Joncoux, Poujoulat, Schiedel…",
    helpTitle: "Tarif fournisseur fumisterie",
    helpBody:
      "Importez un tarif fournisseur avec références, désignations, familles et prix remisés. Le prix remisé sera utilisé comme coût d'achat.",
    formatDetail:
      "Fichier TSV exporté depuis votre ERP fournisseur (SAP, Sage…). Colonnes attendues : Code EAN · Référence · Code article · Désignation · Famille · Prix remisé. Le prix remisé est votre prix d'achat net.",
  },
  appareils: {
    label: "Appareils — poêles, inserts, granulés, bois…",
    placeholder: "Jotul, RIKA, MCZ, Harman…",
    helpTitle: "Catalogue d'appareils",
    helpBody:
      "Importez un catalogue d'appareils avec puissance, rendement, Etas, émissions, norme et PV d'essai.",
    formatDetail:
      "Fichier CSV avec colonnes dans l'ordre : Marque · Modèle · Type appareil · Combustible · Puissance (kW) · Rendement (%) · Etas (%) · CO · COV · Poussières · NOx · PM+COV · N° PV d'essai · Norme · Laboratoire. Compatible avec l'export flammeverte.org.",
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export default function CatalogImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [catalogType, setCatalogType] = useState<CatalogType>("fumisterie");
  const [supplierName, setSupplierName] = useState("");
  const [marginPct, setMarginPct] = useState<number>(30);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const config = useMemo(() => TYPE_OPTIONS[catalogType], [catalogType]);
  const isAppliances = catalogType === "appareils";

  const handleFile = (file: File | null) => {
    setSelectedFile(file);
    setResult(null);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!supplierName.trim() || !selectedFile) return;
    setImporting(true);
    setResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée. Reconnectez-vous.");
        return;
      }

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-catalog`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-supplier-name": supplierName.trim(),
            "x-margin-pct": marginPct.toString(),
            "x-catalog-type": catalogType,
          },
          body: formData,
        },
      );

      const data: ImportResult = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || "Erreur lors de l'import");
        setResult({ success: false, error: data.error });
        return;
      }

      setResult(data);
      toast.success("Import terminé");
    } catch (err: any) {
      toast.error(err.message || "Erreur réseau");
      setResult({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const canImport = !!supplierName.trim() && !!selectedFile && !importing;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
          <Link to="/catalog">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au catalogue
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Importer un catalogue fournisseur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez vos tarifs fumisterie ou vos appareils pour accélérer la création des devis.
          </p>
        </div>
      </div>

      {/* Result success card (above form when present) */}
      {result?.success && (
        <Card className="border-success/40 bg-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle className="text-base">Import terminé</CardTitle>
            </div>
            <CardDescription>
              Les articles sont maintenant disponibles dans l'éditeur de devis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Ajoutés</p>
                <p className="font-mono text-xl font-semibold text-foreground">
                  {result.inserted ?? 0}
                </p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Mis à jour</p>
                <p className="font-mono text-xl font-semibold text-foreground">
                  {result.updated ?? 0}
                </p>
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground">Ignorés</p>
                <p className="font-mono text-xl font-semibold text-muted-foreground">
                  {result.skipped ?? 0}
                </p>
              </div>
            </div>
            {result.supplier && (
              <p className="text-sm text-muted-foreground">
                Fournisseur : <span className="font-medium text-foreground">{result.supplier}</span>
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={() => navigate("/catalog")}>
                Voir le catalogue →
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                }}
              >
                Nouvel import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paramètres d'import</CardTitle>
          <CardDescription>
            Sélectionnez le type de catalogue puis chargez votre fichier fournisseur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Catalog type */}
          <div className="space-y-2">
            <Label htmlFor="catalog-type">Type de catalogue</Label>
            <Select
              value={catalogType}
              onValueChange={(v) => {
                setCatalogType(v as CatalogType);
                setResult(null);
              }}
            >
              <SelectTrigger id="catalog-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fumisterie">{TYPE_OPTIONS.fumisterie.label}</SelectItem>
                <SelectItem value="appareils">{TYPE_OPTIONS.appareils.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Supplier name */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Nom du fournisseur</Label>
            <Input
              id="supplier"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={config.placeholder}
            />
          </div>

          {/* Margin */}
          <div className="space-y-2">
            <Label htmlFor="margin">Votre marge %</Label>
            <Input
              id="margin"
              type="number"
              min={0}
              max={100}
              value={marginPct}
              onChange={(e) => setMarginPct(Number(e.target.value) || 0)}
              disabled={isAppliances}
              className="max-w-[160px] font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Prix vente = coût × (1 + marge%)
              {isAppliances && (
                <span className="ml-1 text-muted-foreground/70">(ignoré pour les appareils)</span>
              )}
            </p>
          </div>

          <Separator />

          {/* Upload zone */}
          <div className="space-y-2">
            <Label>Fichier source</Label>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".txt,.tsv,.csv"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`border-dashed border-2 rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-accent bg-accent/10"
                    : "border-border bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Glissez votre fichier ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formats acceptés : .tsv · .csv · .txt
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border bg-card p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFile(null)}
                  disabled={importing}
                  aria-label="Retirer le fichier"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                Import en cours… cela peut prendre quelques secondes.
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={handleImport} disabled={!canImport}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer le catalogue
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help block — context-aware */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {config.helpTitle}
          <Badge variant="secondary" className="font-mono text-[10px]">
            {isAppliances ? ".csv" : ".tsv"}
          </Badge>
        </AlertTitle>
        <AlertDescription className="mt-1">
          {config.helpBody}
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
        <AccordionItem value="format" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium">
            Format de fichier attendu
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
            {config.formatDetail}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
