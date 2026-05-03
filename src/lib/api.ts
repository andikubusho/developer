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
    
  upsert: (table: string, data: any, on_conflict: string = 'id') => 
    apiRequest(`${table}?on_conflict=${on_conflict}`, { 
      method: 'POST', 
      headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data) 
    }),
    
  update: (table: string, id: string | number, data: any, pk: string = 'id') => 
    apiRequest(`${table}?${pk}=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
  delete: (table: string, id: string | number, pk: string = 'id') => 
    apiRequest(`${table}?${pk}=eq.${id}`, { method: 'DELETE' }),

  rpc: (functionName: string, params: any) =>
    apiRequest(`rpc/${functionName}`, { method: 'POST', body: JSON.stringify(params) }),

  // Special Helpers for Budget Control
  getBudgetStatus: async (rabProjectId: string) => {
    // 1. Fetch all RAB items for this specific RAB project
    const rabItems = await api.get('rab_items',
      `select=id,parent_id,level,is_manual,volume,koeff,material_id,satuan,uraian,urutan&rab_project_id=eq.${rabProjectId}&order=urutan.asc`
    );
    if (!rabItems || rabItems.length === 0) return [];

    // 2. Build parent-child tree
    const nodeMap: Record<string, any> = {};
    rabItems.forEach((i: any) => { nodeMap[i.id] = { ...i, children: [] }; });
    const roots: any[] = [];
    rabItems.forEach((i: any) => {
      if (i.parent_id && nodeMap[i.parent_id]) nodeMap[i.parent_id].children.push(nodeMap[i.id]);
      else roots.push(nodeMap[i.id]);
    });

    // 3. Inject parent volumes (level 2 volume propagates to level 3 children)
    const injectParentVol = (nodes: any[], parentVol: number | null = null) => {
      nodes.forEach(node => {
        node._parentVolume = parentVol;
        const nextVol = node.level === 2 ? (Number(node.volume) || 0) : parentVol;
        if (node.children.length) injectParentVol(node.children, nextVol);
      });
    };
    injectParentVol(roots);

    // 4. Aggregate quotas per material_id using correct tree logic
    const quotas: Record<string, { material_id: string, name: string, unit: string, quota: number, used: number, received: number }> = {};
    const walk = (node: any) => {
      if (node.level === 3 && !node.is_manual && node.material_id) {
        const qty = (node.volume && Number(node.volume) !== 0)
          ? Number(node.volume)
          : (Number(node.koeff) || 0) * (node._parentVolume || 0);
        const mid = node.material_id;
        if (!quotas[mid]) quotas[mid] = { material_id: mid, name: node.uraian, unit: node.satuan || '', quota: 0, used: 0, received: 0 };
        quotas[mid].quota += qty;
      }
      node.children.forEach((c: any) => walk(c));
    };
    roots.forEach((r: any) => walk(r));

    // 5. Aggregate PR usage linked specifically to this RAB
    const prs = await api.get('purchase_requests',
      `rab_project_id=eq.${rabProjectId}&status=in.(APPROVED,PENDING,SUBMITTED)`
    );
    prs.forEach((pr: any) => {
      (pr.items || []).forEach((item: any) => {
        const mid = item.material_id;
        if (quotas[mid]) quotas[mid].used += (Number(item.quantity) || 0);
      });
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
