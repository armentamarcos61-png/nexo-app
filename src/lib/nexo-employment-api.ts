import { getCloudAccess } from '@/lib/nexo-cloud-identity';

const BASE = 'https://wfwyftxbanwvixplzhcd.supabase.co/rest/v1';
const KEY = 'sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';
const HEADERS = { apikey: KEY, 'content-type': 'application/json' };

export type EmploymentKind = 'seeking_job' | 'vacancy';
export type EmploymentPost = {
  id: string;
  owner_id: string;
  kind: EmploymentKind;
  title: string;
  description: string;
  category: string;
  location: string;
  author_name: string;
  experience: string;
  availability: string;
  hours: string;
  payment_unit: string;
  payment_min: number | null;
  payment_max: number | null;
  status: 'active' | 'closed';
  created_at: string;
};

export type EmploymentInterest = {
  id: string;
  post_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  response: string;
  created_at: string;
  responded_at: string | null;
};

export type PostInput = {
  kind: EmploymentKind;
  title: string;
  description: string;
  category: string;
  location: string;
  author_name: string;
  experience: string;
  availability: string;
  hours: string;
  payment_unit: string;
  payment_min: number | null;
  payment_max: number | null;
};

async function checked(response: Response): Promise<any> {
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message = String(json?.message || json?.error_description || json?.error || '');
    if (response.status === 401 || response.status === 403)
      throw new Error('Inicia sesión con tu correo verificado de Nexo para publicar o contactar.');
    if (response.status === 409)
      throw new Error('Ya registraste tu interés en esta propuesta. Puedes revisar tu mensaje en Mis solicitudes.');
    throw new Error(message || 'No se pudo completar la operación en Nexo Central.');
  }
  return json;
}
function cleanText(value: string, max: number): string { return value.trim().slice(0, max); }
function isEmploymentPost(x: any): x is EmploymentPost {
  return !!x && typeof x.id === 'string' && typeof x.owner_id === 'string'
    && (x.kind === 'seeking_job' || x.kind === 'vacancy')
    && typeof x.title === 'string' && typeof x.description === 'string';
}
function isEmploymentInterest(x: any): x is EmploymentInterest {
  return !!x && typeof x.id === 'string' && typeof x.post_id === 'string'
    && typeof x.sender_id === 'string' && typeof x.message === 'string';
}

const SELECT_POST = 'id,owner_id,kind,title,description,category,location,author_name,experience,availability,hours,payment_unit,payment_min,payment_max,status,created_at';
const SELECT_INTEREST = 'id,post_id,sender_id,sender_name,message,response,created_at,responded_at';

/** Public results only. PostgreSQL RLS excludes closed or private records. */
export async function listEmploymentPosts(): Promise<EmploymentPost[]> {
  const result = await checked(await fetch(
    BASE+'/nexo_employment_posts?select='+encodeURIComponent(SELECT_POST)+'&status=eq.active&order=created_at.desc&limit=150',
    { headers: HEADERS, cache: 'no-store' },
  ));
  return Array.isArray(result) ? result.filter(isEmploymentPost) : [];
}

function canonicalTerm(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
const relatedTerms: [RegExp, string[]][] = [
  [/ebanist|carpinter/, ['ebanista', 'ebanisteria', 'carpintero', 'carpinteria', 'muebles']],
  [/abogad|juridic|derecho/, ['abogado', 'juridico', 'legal']],
  [/tapicer/, ['tapiceria', 'tapicero']],
  [/nutri/, ['nutriologo', 'nutricion']],
];
export function filterEmploymentPosts(posts: EmploymentPost[], query: string, category: string, kind?: EmploymentKind): EmploymentPost[] {
  const q = canonicalTerm(query);
  const termWords = q.split(/\s+/).filter((word) => word.length > 2 && !['busco','empleo','vacante','trabajo','para','como'].includes(word));
  const equivalents = relatedTerms.find(([pattern]) => pattern.test(q))?.[1] || [];
  const selectedCategory = canonicalTerm(category === 'Todas' ? '' : category);
  return posts.filter((post) => {
    if (kind && post.kind !== kind) return false;
    const title = canonicalTerm([post.title, post.description, post.category].join(' '));
    if (selectedCategory && !title.includes(selectedCategory)) return false;
    if (!termWords.length) return true;
    return termWords.some((word) => title.includes(word)) || equivalents.some((word) => title.includes(word));
  });
}

export async function publishEmploymentPost(input: PostInput): Promise<EmploymentPost> {
  if (input.title.trim().length < 3 || input.description.trim().length < 10)
    throw new Error('Agrega un puesto y una descripción de al menos 10 caracteres.');
  const { token, userId } = await getCloudAccess();
  const body = {
    owner_id: userId,
    kind: input.kind,
    title: cleanText(input.title, 100),
    description: cleanText(input.description, 1400),
    category: cleanText(input.category, 100),
    location: cleanText(input.location, 120),
    author_name: cleanText(input.author_name || 'Usuario Nexo', 80),
    experience: cleanText(input.experience, 100),
    availability: cleanText(input.availability, 100),
    hours: cleanText(input.hours, 100),
    payment_unit: cleanText(input.payment_unit, 80),
    payment_min: input.payment_min,
    payment_max: input.payment_max,
    status: 'active',
  };
  const result = await checked(await fetch(
    BASE+'/nexo_employment_posts?select='+encodeURIComponent(SELECT_POST),
    { method: 'POST', headers: { ...HEADERS, Authorization: 'Bearer '+token,
      Prefer: 'return=representation' }, body: JSON.stringify(body) },
  ));
  if (!Array.isArray(result) || !isEmploymentPost(result[0]))
    throw new Error('Nexo no confirmó la publicación. Revisa Mis solicitudes antes de reintentar.');
  return result[0];
}

export async function sendEmploymentInterest(post: EmploymentPost, senderName: string, message: string): Promise<EmploymentInterest> {
  if (message.trim().length < 10) throw new Error('Escribe un mensaje de al menos 10 caracteres.');
  const { token, userId } = await getCloudAccess();
  if (post.owner_id === userId) throw new Error('No puedes mostrar interés en tu propia publicación.');
  const data = await checked(await fetch(
    BASE+'/nexo_employment_interests?select='+encodeURIComponent(SELECT_INTEREST),
    { method: 'POST', headers: { ...HEADERS, Authorization: 'Bearer '+token,
      Prefer: 'return=representation' },
      body: JSON.stringify({
        post_id: post.id, sender_id: userId,
        sender_name: cleanText(senderName || 'Usuario Nexo',80),
        message: cleanText(message,1200),
      }),
    },
  ));
  if (!Array.isArray(data) || !isEmploymentInterest(data[0]))
    throw new Error('No se pudo confirmar el interés.');
  return data[0];
}

export async function listMyEmploymentPosts(): Promise<EmploymentPost[]> {
  const { token, userId } = await getCloudAccess();
  const result = await checked(await fetch(
    BASE+'/nexo_employment_posts?select='+encodeURIComponent(SELECT_POST)
      +'&owner_id=eq.'+encodeURIComponent(userId)+'&order=created_at.desc&limit=100',
    { headers: { ...HEADERS, Authorization: 'Bearer '+token }, cache:'no-store' },
  ));
  return Array.isArray(result) ? result.filter(isEmploymentPost) : [];
}

export async function listMyEmploymentInterests(): Promise<EmploymentInterest[]> {
  const { token } = await getCloudAccess();
  const result = await checked(await fetch(
    BASE+'/nexo_employment_interests?select='+encodeURIComponent(SELECT_INTEREST)
      +'&order=created_at.desc&limit=150',
    { headers: { ...HEADERS, Authorization: 'Bearer '+token }, cache:'no-store' },
  ));
  return Array.isArray(result) ? result.filter(isEmploymentInterest) : [];
}

export async function respondEmploymentInterest(interestId: string, responseText: string): Promise<void> {
  const value = cleanText(responseText, 1200);
  if (value.length < 10) throw new Error('Escribe una respuesta de al menos 10 caracteres.');
  const { token } = await getCloudAccess();
  await checked(await fetch(
    BASE+'/nexo_employment_interests?id=eq.'+encodeURIComponent(interestId),
    { method: 'PATCH', headers: { ...HEADERS, Authorization: 'Bearer '+token,
      Prefer: 'return=minimal' },
      body: JSON.stringify({ response: value, responded_at: new Date().toISOString() }) },
  ));
}

export async function closeEmploymentPost(postId: string): Promise<void> {
  const { token } = await getCloudAccess();
  await checked(await fetch(
    BASE+'/nexo_employment_posts?id=eq.'+encodeURIComponent(postId),
    { method: 'PATCH', headers: { ...HEADERS, Authorization: 'Bearer '+token,
      Prefer: 'return=minimal' }, body: JSON.stringify({ status:'closed' }) },
  ));
}
