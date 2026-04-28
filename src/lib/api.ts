// Central API utility for Singapore Direct Connection
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isDev = import.meta.env.DEV;

export async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  if (isDev) console.log(`🚀 API CALL: ${url}`);

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
      if (isDev) console.error(`❌ API ERROR [${response.status}] for ${url}:`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    if (isDev) console.log(`✅ API SUCCESS: ${url}`);
    // Handle DELETE or empty responses
    if (response.status === 204) return null;

    return await response.json();
  } catch (err) {
    if (isDev) console.error(`💥 API CRASH for ${url}:`, err);
    throw err;
  }
}

export const api = {
  get: async (table: string, query: string = 'select=*', options: RequestInit = {}) => {
    try {
      const data = await apiRequest(`${table}?${query}`, { method: 'GET', ...options });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      if (isDev) console.error(`[API Standardizer] Fallback to [] for ${table}:`, err);
      return [];
    }
  },
    
  insert: (table: string, data: any) => 
    apiRequest(table, { method: 'POST', body: JSON.stringify(data) }),
    
  update: (table: string, id: string | number, data: any) => 
    apiRequest(`${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
  delete: (table: string, id: string | number) => 
    apiRequest(`${table}?id=eq.${id}`, { method: 'DELETE' }),

  rpc: (functionName: string, params: any) =>
    apiRequest(`rpc/${functionName}`, { method: 'POST', body: JSON.stringify(params) }),

  // Special Helpers for Budget Control
  getBudgetStatus: async (projectId: string, unitId?: string) => {
    // 1. Fetch RAB Items (Volume & Koeff)
    let rabQuery = `select=id,material_id,volume,koeff,satuan,uraian,rab_project_id&material_id=not.is.null`;
    if (unitId) {
      // Need to find rab_project_id first
      const rabProjects = await api.get('rab_projects', `project_id=eq.${projectId}&unit_id=eq.${unitId}&select=id`);
      if (rabProjects.length > 0) {
        rabQuery += `&rab_project_id=eq.${rabProjects[0].id}`;
      } else {
        return [];
      }
    } else {
      const rabProjects = await api.get('rab_projects', `project_id=eq.${projectId}&select=id`);
      if (rabProjects.length > 0) {
        const ids = rabProjects.map(rp => rp.id).join(',');
        rabQuery += `&rab_project_id=in.(${ids})`;
      } else {
        return [];
      }
    }
    
    const [rabItems, prs, logs] = await Promise.all([
      api.get('rab_items', rabQuery),
      api.get('purchase_requests', `project_id=eq.${projectId}${unitId ? `&unit_id=eq.${unitId}` : ''}&status=in.(APPROVED,PENDING,SUBMITTED)`),
      api.get('material_stock_logs', `project_id=eq.${projectId}${unitId ? `&unit_id=eq.${unitId}` : ''}&transaction_type=eq.GR`)
    ]);

    // Aggregate RAB Quotas
    const quotas: Record<string, { material_id: string, name: string, unit: string, quota: number, used: number, received: number }> = {};
    
    // We need parent volumes for RAB items if they are not manual
    // Actually RABForm calculates them. Let's simplify: 
    // In our simplified logic, rab_items.volume is the level 2 volume or manual volume.
    
    rabItems.forEach((item: any) => {
      const mid = item.material_id;
      if (!mid) return;
      if (!quotas[mid]) quotas[mid] = { material_id: mid, name: item.uraian, unit: item.satuan, quota: 0, used: 0, received: 0 };
      
      // In the current RAB system: Level 3 Volume = parent.volume * node.koeff
      // But if it's manual, volume is stored in the node.
      // For simplicity here, we assume volume * koeff is the target if both exist.
      const vol = Number(item.volume) || 0;
      const koeff = Number(item.koeff) || 1;
      quotas[mid].quota += (vol * koeff);
    });

    // Aggregate PR Usage
    prs.forEach((pr: any) => {
      const items = pr.items || [];
      items.forEach((item: any) => {
        const mid = item.material_id;
        if (quotas[mid]) {
          quotas[mid].used += (Number(item.quantity) || 0);
        }
      });
    });

    // Aggregate GR Received
    logs.forEach((log: any) => {
      const mid = log.material_id;
      if (quotas[mid]) {
        quotas[mid].received += (Number(log.qty_change) || 0);
      }
    });

    return Object.values(quotas);
  },
    
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
