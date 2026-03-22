import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hejxvqghsyaauwzkfikg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlanh2cWdoc3lhYXV3emtmaWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU5MzUsImV4cCI6MjA4OTc3MTkzNX0.J8p-2ldZjLBXBPzXPhASa8DRoKHdZswAY7mjPBekZUI";

function isEphemeral() {
  try {
    return sessionStorage.getItem('lignia_ephemeral') === '1';
  } catch {
    return false;
  }
}

function createSupabaseClient(persist: boolean) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: persist ? localStorage : sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// Initial client: use sessionStorage if ephemeral flag is set (survives refresh, dies on tab close)
export let supabase = createSupabaseClient(!isEphemeral());

/**
 * Reconfigure the Supabase client for persist/ephemeral mode.
 * Call BEFORE signInWithPassword.
 * - persist=true  → localStorage (survives tab close)
 * - persist=false → sessionStorage (dies on tab close)
 */
export function reconfigureAuth(persist: boolean) {
  if (!persist) {
    sessionStorage.setItem('lignia_ephemeral', '1');
    // Clear any leftover persistent session
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  } else {
    sessionStorage.removeItem('lignia_ephemeral');
  }

  supabase = createSupabaseClient(persist);
  window.dispatchEvent(new Event('supabase-client-changed'));
}
