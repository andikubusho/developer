
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: units, error: uError } = await supabase.from('units').select('status, project_id').limit(10);
  console.log('UNITS STATUS:', units);
  if (uError) console.error('UNIT ERROR:', uError);

  const { data: profiles, error: pError } = await supabase.from('profiles').select('role').limit(10);
  console.log('PROFILES ROLES:', profiles);
  if (pError) console.error('PROFILE ERROR:', pError);

  const { data: projects, error: prError } = await supabase.from('projects').select('id, name');
  console.log('PROJECTS:', projects);
}

checkData();
