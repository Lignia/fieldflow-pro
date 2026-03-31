import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://hejxvqghsyaauwzkfikg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhlanh2cWdoc3lhYXV3emtmaWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU5MzUsImV4cCI6MjA4OTc3MTkzNX0.J8p-2ldZjLBXBPzXPhASa8DRoKHdZswAY7mjPBekZUI";

/* ------------------------------------------------------------------ */
/*  Dynamic storage: switches between localStorage and sessionStorage */
/*  based on a persist flag, WITHOUT recreating the Supabase client.  */
/* ------------------------------------------------------------------ */

let _persist = (() => {
  try {
    return sessionStorage.getItem('lignia_ephemeral') !== '1';
  } catch {
    return true;
  }
})();

function target(): Storage {
  return _persist ? localStorage : sessionStorage;
}

const dynamicStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: (key: string) => target().getItem(key),
  setItem: (key: string, value: string) => target().setItem(key, value),
  removeItem: (key: string) => target().removeItem(key),
};

/* Single Supabase instance — never recreated */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: dynamicStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Switch session persistence mode.
 * Call BEFORE signInWithPassword or after signOut.
 * - persist=true  → localStorage (survives tab close) — default
 * - persist=false → sessionStorage (dies on tab close)
 */
export function setPersistSession(persist: boolean) {
  _persist = persist;

  if (!persist) {
    sessionStorage.setItem('lignia_ephemeral', '1');
    // Clear any leftover persistent tokens
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
  } else {
    sessionStorage.removeItem('lignia_ephemeral');
  }
}
