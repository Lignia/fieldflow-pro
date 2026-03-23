import { supabase } from "./client";

// Clients typés pour chaque schéma custom
// "as any" centralisé ici — ne pas répéter dans les hooks
export const billingDb    = (supabase as any).schema("billing");
export const operationsDb = (supabase as any).schema("operations");
export const coreDb       = (supabase as any).schema("core");
export const catalogDb    = (supabase as any).schema("catalog");
export const expertiseDb  = (supabase as any).schema("expertise");
export const aiDb         = (supabase as any).schema("ai");
