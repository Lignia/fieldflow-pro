import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { catalogDb } from "@/integrations/supabase/schema-clients";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type CatalogType = "fumisterie" | "appareils";

interface ImportResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  supplier?: string;
  error?: string;
}

interface SupplierBrand {
  name: string;
  brand_type: string;
}

const TYPE_OPTIONS: Record<
  CatalogType,
  {
    label: string;
    brandsHint: string;
    accordionTitle: string;
    accordionBody: string;
  }
> = {
  fumisterie: {
    label: "Fumisterie",
    brandsHint: "Joncoux, Poujoulat, Tubest, Jeremias, Dinak…",
    accordionTitle: "Quel fichier utiliser ?",
    accordionBody:
      "C'est le fichier .txt ou .tsv que votre commercial vous envoie par email. Colonnes utilisées : Code EAN · Référence · Désignation · Famille · Prix tarif · Prix remisé. Le prix tarif = votre prix de vente. Le prix remisé = votre coût d'achat.",
  },
  appareils: {
    label: "Appareils",
    brandsHint: "Jotul, RIKA, MCZ, Piazzetta, Godin, Invicta…",
    accordionTitle: "Quel fichier utiliser ?",
    accordionBody:
      "Exportez la liste depuis flammeverte.org (Rechercher → exporter en CSV). Colonnes : Marque · Modèle · Type · Combustible · Puissance · Rendement · Etas · Émissions · N° PV d'essai · Norme · Laboratoire.",
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
  const [customSupplierName, setCustomSupplierName] = useState("");
  const [brands, setBrands] = useState<SupplierBrand[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const config = useMemo(() => TYPE_OPTIONS[catalogType], [catalogType]);

  useEffect(() => {
    catalogDb
      .from("supplier_brands")
      .select("name, brand_type")
      .eq("is_active", true)
      .order("name")
      .then(({ data }: { data: SupplierBrand[] | null }) =>
        setBrands(data ?? []),
      );
  }, []);

  const filteredBrands = useMemo(() => {
    const target = catalogType;
    return brands.filter(
      (b) => b.brand_type === target || b.brand_type === "both",
    );
  }, [brands, catalogType]);

  const effectiveSupplierName =
    supplierName === "__autre__" ? customSupplierName.trim() : supplierName.trim();

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
    if (!effectiveSupplierName || !selectedFile) return;
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

      const supabaseUrl =
        (supabase as any).supabaseUrl ||
        import.meta.env.VITE_SUPABASE_URL;

      console.log("Import URL:", supabaseUrl);
      console.log(
        "Fichier:",
        selectedFile?.name,
        selectedFile?.size,
        "octets",
      );

      const response = await fetch(
        `${supabaseUrl}/functions/v1/import-catalog`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "x-supplier-name": effectiveSupplierName,
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

  const canImport = !!effectiveSupplierName && !!selectedFile && !importing;

  const ctaLabel = importing
    ? "Import en cours…"
    : !effectiveSupplierName && !selectedFile
    ? "Importer le catalogue"
    : effectiveSupplierName && !selectedFile
    ? "Sélectionnez un fichier pour continuer"
    : !effectiveSupplierName && selectedFile
    ? "Sélectionnez une marque"
    : "Lancer l'import";

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
            Importer un catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importez votre tarif fournisseur pour retrouver tous vos articles dans l'éditeur de devis.
          </p>
        </div>
      </div>

      {/* Result success card (above form when present) */}
      {result?.success && (
        <Card className="border-success/40 bg-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <CardTitle className="text-base">Import terminé ✅</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground">
              <span className="font-mono font-semibold">{result.inserted ?? 0}</span>{" "}
              article{(result.inserted ?? 0) !== 1 ? "s" : ""} ajouté{(result.inserted ?? 0) !== 1 ? "s" : ""}
            </p>
            {(result.updated ?? 0) > 0 && (
              <p className="text-sm text-foreground">
                <span className="font-mono font-semibold">{result.updated}</span>{" "}
                article{result.updated !== 1 ? "s" : ""} mis à jour
              </p>
            )}
            {(result.skipped ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {result.skipped} ligne{result.skipped !== 1 ? "s" : ""} ignorée{result.skipped !== 1 ? "s" : ""} (prix à zéro ou désignation vide)
              </p>
            )}
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
                Importer un autre fichier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Votre fichier fournisseur</CardTitle>
          <CardDescription>
            Sélectionnez le type, puis chargez votre fichier.
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
                setSupplierName("");
                setCustomSupplierName("");
                setResult(null);
              }}
            >
              <SelectTrigger id="catalog-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fumisterie">Fumisterie</SelectItem>
                <SelectItem value="appareils">Appareils</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{config.brandsHint}</p>
          </div>

          {/* Supplier brand */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Marque / Fournisseur</Label>
            <Select value={supplierName} onValueChange={setSupplierName}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {filteredBrands.map((b) => (
                  <SelectItem key={b.name} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
                <SelectItem value="__autre__">Autre (saisie libre)</SelectItem>
              </SelectContent>
            </Select>
            {supplierName === "__autre__" && (
              <Input
                value={customSupplierName}
                onChange={(e) => setCustomSupplierName(e.target.value)}
                placeholder="Nom du fournisseur"
                className="mt-2"
              />
            )}
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
                  Déposez votre fichier ici
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ou cliquez pour sélectionner
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Formats : .tsv · .csv · .txt (le fichier de votre commercial est souvent un .txt)
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
                  {ctaLabel}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {ctaLabel}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
        <AccordionItem value="format" className="border-b-0">
          <AccordionTrigger className="text-sm font-medium">
            {config.accordionTitle}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
            {config.accordionBody}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
