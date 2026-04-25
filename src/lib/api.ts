// Central API utility for Singapore Direct Connection
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  console.log(`🚀 API CALL: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API ERROR [${response.status}] for ${url}:`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    console.log(`✅ API SUCCESS: ${url}`);
    // Handle DELETE or empty responses
    if (response.status === 204) return null;
    
    return await response.json();
  } catch (err) {
    console.error(`💥 API CRASH for ${url}:`, err);
    throw err;
  }
}

export const api = {
  get: (table: string, query: string = 'select=*') => 
    apiRequest(`${table}?${query}`, { method: 'GET' }),
    
  insert: (table: string, data: any) => 
    apiRequest(table, { method: 'POST', body: JSON.stringify(data) }),
    
  update: (table: string, id: string | number, data: any) => 
    apiRequest(`${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
  delete: (table: string, id: string | number) => 
    apiRequest(`${table}?id=eq.${id}`, { method: 'DELETE' }),
    
  storage: {
    upload: async (bucket: string, path: string, file: File) => {
      const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'x-upsert': 'true'
        },
        body: file
      });
      if (!response.ok) throw new Error(`Upload failed: ${await response.text()}`);
      return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
    }
  },
  
  apiRequest: apiRequest
};
