const BASE = 'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/nexo-service-catalog';
const PUBLISHABLE_KEY = 'sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';
export type VerifiedServiceCategory = { name: string; family: string; parent: string; source_url: string | null };

async function requestCatalog(method: 'GET' | 'POST', term?: string): Promise<any> {
  const response = await fetch(BASE, {
    method,
    headers: { apikey: PUBLISHABLE_KEY, 'content-type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ term }) } : {}),
  });
  if (!response.ok) throw new Error('El catálogo de servicios no está disponible.');
  return response.json();
}

function validCategory(input: any): input is VerifiedServiceCategory {
  return !!input && typeof input.name === 'string' && input.name.length <= 100
    && typeof input.family === 'string' && typeof input.parent === 'string'
    && (input.source_url === null || typeof input.source_url === 'string');
}
export async function loadServiceCategories(): Promise<VerifiedServiceCategory[]> {
  const data = await requestCatalog('GET');
  return Array.isArray(data?.categories) ? data.categories.filter(validCategory) : [];
}
export async function discoverServiceCategory(term: string): Promise<VerifiedServiceCategory | null> {
  if (term.trim().length < 3 || term.trim().length > 85) return null;
  const data = await requestCatalog('POST', term.trim());
  return validCategory(data?.entry) ? data.entry : null;
}
