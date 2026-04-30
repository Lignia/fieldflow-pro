import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const body = await req.json();
    const rows: any[] = body.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];
    const batchSize = 200;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((r) => ({ ...r, tenant_id: null }));
      const { data, error } = await admin
        .schema("catalog")
        .from("heating_appliances")
        .upsert(batch, { onConflict: "data_source,normalized_brand,normalized_model,nominal_power_kw,fuel_type", ignoreDuplicates: true })
        .select("id");
      if (error) {
        errors.push(`batch ${i}: ${error.message}`);
      } else {
        inserted += data?.length ?? 0;
        skipped += batch.length - (data?.length ?? 0);
      }
    }

    return new Response(
      JSON.stringify({ ok: errors.length === 0, inserted, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
