import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: './.env' });

const c = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
  const q1 = `
    CREATE TABLE IF NOT EXISTS sale_addons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  const q2 = `
    ALTER TABLE installments ADD COLUMN IF NOT EXISTS addon_id UUID REFERENCES sale_addons(id) ON DELETE CASCADE;
  `;
  console.log('CREATE:', await c.rpc('exec_sql', { query: q1 }));
  console.log('ALTER:', await c.rpc('exec_sql', { query: q2 }));
})();
