import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidSupabaseConfig = (url?: string, key?: string) => {
  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  if (url.includes('your-') || key.includes('your-')) return false;
  if (url === 'https://test-12345.supabase.co') return false;
  return true;
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase URL or Anon Key. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

const storage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value ?? null,
  setItem: async (key: string, value: string) => { await Preferences.set({ key, value }); },
  removeItem: async (key: string) => { await Preferences.remove({ key }); },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  hasValidConfig: isValidSupabaseConfig(supabaseUrl, supabaseAnonKey)
};
