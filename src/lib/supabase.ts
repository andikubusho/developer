import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App will fall back to mock mode.');
  console.log('Detected URL:', supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'NONE');
} else {
  console.log('Supabase initialized with URL:', `${supabaseUrl.substring(0, 15)}...`);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
