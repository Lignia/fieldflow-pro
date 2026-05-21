import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { coreDb } from "@/integrations/supabase/schema-clients";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/PageContainer";

const FIELDS: { key: string; label: string; type: "text" | "number" }[] = [
  // Section 1
  { key: "construction_year", label: "Année de construction", type: "number" },
  { key: "living_area_m2", label: "Surface habitable (m²)", type: "number" },
  { key: "building_status", label: "Statut du bâtiment", type: "text" },
  { key: "property_usage", label: "Usage", type: "text" },
  // Section 2
  { key: "flue_scenario", label: "Scénario fumisterie", type: "text" },
  { key: "flue_diameter_mm", label: "Diamètre conduit (mm)", type: "number" },
  { key: "flue_bends_count", label: "Nombre de coudes", type: "number" },
  { key: "flue_bends_angle_deg", label: "Angle des coudes (°)", type: "number" },
  { key: "liner_length_m", label: "Longueur tubage (m)", type: "number" },
  { key: "new_flue_type", label: "Type nouveau conduit", type: "text" },
  { key: "new_flue_diameter_mm", label: "Diamètre nouveau conduit (mm)", type: "number" },
  { key: "new_flue_height_m", label: "Hauteur nouveau conduit (m)", type: "number" },
  // Section 3
  { key: "connection_flue_type", label: "Type raccordement", type: "text" },
  { key: "appliance_outlet_position", label: "Position sortie appareil", type: "text" },
  { key: "connection_diameter_mm", label: "Diamètre raccordement (mm)", type: "number" },
  { key: "connection_height_m", label: "Hauteur raccordement (m)", type: "number" },
];

const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "1. Logement", keys: ["construction_year", "living_area_m2", "building_status", "property_usage"] },
  {
    title: "2. Conduit fumisterie",
    keys: [
      "flue_scenario", "flue_diameter_mm", "flue_bends_count", "flue_bends_angle_deg",
      "liner_length_m", "new_flue_type", "new_flue_diameter_mm", "new_flue_height_m",
    ],
  },
  {
    title: "3. Raccordement",
    keys: ["connection_flue_type", "appliance_outlet_position", "connection_diameter_mm", "connection_height_m"],
  },
];

export default function TechnicalSurveyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [creatingInstall, setCreatingInstall] = useState(false);
  const [survey, setSurvey] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState("");
  const [croquisPath, setCroquisPath] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await coreDb
        .from("technical_surveys")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setSurvey(data);
      const f: Record<string, any> = {};
      for (const { key } of FIELDS) f[key] = (data as any)[key] ?? "";
      setForm(f);
      setNotes((data as any).notes ?? "");
      setCroquisPath((data as any).croquis_storage_path ?? "");
      setLoading(false);
    })();
  }, [id]);

  function setField(key: string, value: string) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function buildPayload() {
    const payload: Record<string, any> = { notes: notes || null, croquis_storage_path: croquisPath || null };
    for (const { key, type } of FIELDS) {
      const raw = form[key];
      if (raw === "" || raw === null || raw === undefined) {
        payload[key] = null;
      } else if (type === "number") {
        const n = Number(raw);
        payload[key] = Number.isFinite(n) ? n : null;
      } else {
        payload[key] = raw;
      }
    }
    return payload;
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await coreDb.from("technical_surveys").update(buildPayload()).eq("id", id);
      if (error) throw error;
      toast.success("Relevé enregistré");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate() {
    if (!id) return;
    setValidating(true);
    try {
      const { error: upErr } = await coreDb.from("technical_surveys").update(buildPayload()).eq("id", id);
      if (upErr) throw upErr;
      const { error } = await coreDb
        .from("technical_surveys")
        .update({ survey_status: "validated" })
        .eq("id", id);
      if (error) throw error;
      toast.success("Relevé validé");
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la validation");
    } finally {
      setValidating(false);
    }
  }

  async function handleCreateInstallation() {
    if (!id || !survey?.project_id) return;
    setCreatingInstall(true);
    try {
      const { data, error } = await coreDb.rpc("finalize_installation_from_survey", {
        p_survey_id: id,
        p_project_id: survey.project_id,
      });
      if (error) throw error;
      const installationId =
        typeof data === "string"
          ? data
          : (data as any)?.installation_id ?? (data as any)?.id ?? (Array.isArray(data) ? (data[0] as any)?.id : null);
      if (installationId) {
        toast.success("Installation créée");
        navigate(`/installations/${installationId}`);
      } else {
        toast.success("Installation créée");
        navigate(`/projects/${survey.project_id}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de la création de l'installation");
    } finally {
      setCreatingInstall(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!survey) {
    return <PageContainer>Relevé introuvable.</PageContainer>;
  }

  const status: string = survey.survey_status ?? "draft";
  const isDraft = status === "draft";
  const isValidated = status === "validated";
  const readOnly = !isDraft;

  const statusBadge =
    status === "validated"
      ? { label: "Validé", cls: "bg-accent/15 text-accent" }
      : status === "superseded"
        ? { label: "Remplacé", cls: "bg-muted text-muted-foreground" }
        : { label: "En cours", cls: "bg-warning/15 text-warning" };

  return (
    <PageContainer>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour
        </Button>
        <h1 className="text-xl font-semibold">Relevé technique</h1>
        <span
          className={cn(
            "ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            statusBadge.cls,
          )}
        >
          {statusBadge.label}
        </span>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="p-4 sm:p-5 space-y-3">
          <h2 className="text-sm font-semibold">{section.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.keys.map((k) => {
              const f = FIELDS.find((x) => x.key === k)!;
              return (
                <div key={k} className="space-y-1">
                  <Label htmlFor={k} className="text-xs">{f.label}</Label>
                  <Input
                    id={k}
                    type={f.type === "number" ? "number" : "text"}
                    value={form[k] ?? ""}
                    onChange={(e) => setField(k, e.target.value)}
                    readOnly={readOnly}
                    disabled={readOnly}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card className="p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-semibold">4. Notes & croquis</h2>
        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs">Notes libres</Label>
          <Textarea
            id="notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="croquis" className="text-xs">Chemin croquis (placeholder)</Label>
          <Input
            id="croquis"
            placeholder="storage path"
            value={croquisPath}
            onChange={(e) => setCroquisPath(e.target.value)}
            readOnly={readOnly}
            disabled={readOnly}
          />
        </div>
      </Card>

      <div className="flex gap-2 justify-end">
        {isDraft && (
          <>
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button onClick={handleValidate} disabled={validating}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> {validating ? "Validation..." : "Valider le relevé"}
            </Button>
          </>
        )}
        {isValidated && (
          <Button onClick={handleCreateInstallation} disabled={creatingInstall || !survey.project_id}>
            <Wrench className="h-4 w-4 mr-1" /> {creatingInstall ? "Création..." : "Créer l'installation"}
          </Button>
        )}
      </div>
    </PageContainer>
  );
}