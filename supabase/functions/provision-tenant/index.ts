// =============================================================================
// LIGNIA — supabase/functions/provision-tenant/index.ts
// Edge Function : provisioning tenant + user admin après signup
//
// Appelée depuis OnboardingCompanyPage après validation du formulaire.
// Utilise service_role pour bypasser RLS.
//
// Idempotence :
//   - SIRET déjà existant → rattachement au tenant existant
//   - User déjà provisionné → retour already_provisioned
//
// Flux :
//   1. Valider JWT + extraire auth_uid
//   2. Valider format SIRET
//   3. Vérifier si tenant existe déjà (SIRET)
//   4. Créer ou récupérer le tenant
//   5. Créer ou vérifier le core.users
//   6. Retourner tenant_id pour que le frontend puisse refreshSession()
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Valider le JWT et extraire auth_uid
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'unauthorized', 'Token manquant')
    }

    const token = authHeader.replace('Bearer ', '')

    // Client avec le token utilisateur pour valider l'identité
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return errorResponse(401, 'unauthorized', 'Session invalide')
    }

    const auth_uid = user.id
    const email = user.email!

    // -------------------------------------------------------------------------
    // 2. Parser et valider le body
    // -------------------------------------------------------------------------
    const body = await req.json()
    const { company_name, siret, phone } = body

    if (!company_name || typeof company_name !== 'string' || company_name.trim().length < 2) {
      return errorResponse(400, 'invalid_company_name', 'Raison sociale invalide')
    }

    if (!siret || !/^\d{14}$/.test(siret)) {
      return errorResponse(400, 'invalid_siret', 'SIRET invalide — 14 chiffres requis')
    }

    // -------------------------------------------------------------------------
    // 3. Client service_role pour bypasser RLS
    // -------------------------------------------------------------------------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Clients scopés par schéma — même logique que schema-clients.ts côté frontend
    const coreDb = (supabase as any).schema('core')

    // -------------------------------------------------------------------------
    // 4. Vérifier si l'utilisateur est déjà provisionné
    // -------------------------------------------------------------------------
    const { data: existingUser } = await coreDb
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_uid', auth_uid)
      .maybeSingle()

    if (existingUser) {
      return successResponse({
        status: 'already_provisioned',
        tenant_id: existingUser.tenant_id,
        user_id: existingUser.id,
        role: existingUser.role,
      })
    }

    // -------------------------------------------------------------------------
    // 5. Vérifier si le tenant (SIRET) existe déjà
    // -------------------------------------------------------------------------
    const { data: existingTenant } = await coreDb
      .from('tenants')
      .select('id, name')
      .eq('siret', siret)
      .maybeSingle()

    let tenant_id: string

    if (existingTenant) {
      // SIRET déjà enregistré → rattacher l'utilisateur au tenant existant
      tenant_id = existingTenant.id
    } else {
      // -----------------------------------------------------------------------
      // 6. Créer le tenant
      // -----------------------------------------------------------------------
      const slug = generateSlug(company_name)

      const { data: newTenant, error: tenantError } = await coreDb
        .from('tenants')
        .insert({
          name: company_name.trim(),
          slug: await ensureUniqueSlug(coreDb, slug),
          siret,
          industry: 'wood_heating',
          environment: 'production',
          plan_code: 'starter',
          features: {},
          settings: {},
        })
        .select('id')
        .single()

      if (tenantError || !newTenant) {
        console.error('Tenant creation error:', tenantError)
        return errorResponse(500, 'tenant_creation_failed', 'Erreur lors de la création de votre espace')
      }

      tenant_id = newTenant.id
    }

    // -------------------------------------------------------------------------
    // 7. Créer l'utilisateur dans core.users avec rôle admin
    // -------------------------------------------------------------------------
    const { data: newCoreUser, error: userError } = await coreDb
      .from('users')
      .insert({
        tenant_id,
        auth_uid,
        role: 'admin',
        full_name: company_name.trim(), // sera mis à jour par l'utilisateur ensuite
        email,
        phone: phone || null,
        is_active: true,
        profile: {},
      })
      .select('id')
      .single()

    if (userError || !newCoreUser) {
      console.error('User creation error:', userError)
      return errorResponse(500, 'user_creation_failed', 'Erreur lors de la création de votre profil')
    }

    // -------------------------------------------------------------------------
    // 8. Retourner le succès
    // Le frontend doit appeler supabase.auth.refreshSession() après ce retour
    // pour que le JWT custom hook injecte tenant_id dans le token.
    // -------------------------------------------------------------------------
    return successResponse({
      status: 'provisioned',
      tenant_id,
      user_id: newCoreUser.id,
      role: 'admin',
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return errorResponse(500, 'unexpected_error', 'Une erreur inattendue est survenue')
  }
})

// =============================================================================
// HELPERS
// =============================================================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // retirer les accents
    .replace(/[^a-z0-9]+/g, '-')     // remplacer les caractères spéciaux par -
    .replace(/^-+|-+$/g, '')          // retirer les - au début et à la fin
    .substring(0, 50)
}

async function ensureUniqueSlug(
  coreDb: any,
  baseSlug: string
): Promise<string> {
  let slug = baseSlug
  let attempt = 0

  while (attempt < 10) {
    const { data } = await coreDb
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return slug // slug disponible

    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Fallback avec timestamp si toutes les tentatives échouent
  return `${baseSlug}-${Date.now()}`
}

function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
