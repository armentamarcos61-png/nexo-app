import { getCloudAccess } from '@/lib/nexo-cloud-identity';
import type { EmploymentPost } from '@/lib/nexo-employment-api';
import type { ServicePortfolio } from '@/state/portfolios';

const API = 'https://wfwyftxbanwvixplzhcd.supabase.co/rest/v1';
const KEY = 'sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';
const BASE_HEADERS = { apikey: KEY, 'content-type': 'application/json' };
const REQUEST_FIELDS = 'id,owner_id,title,description,category,location,budget_mxn,status,created_at';
const PROPOSAL_FIELDS = 'id,request_id,sender_id,sender_name,portfolio_title,message,response,responded_at,created_at';

export type ServiceRequest = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget_mxn: number | null;
  status: 'active' | 'closed';
  created_at: string;
};
export type ServiceProposal = {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  portfolio_title: string;
  message: string;
  response: string;
  responded_at: string | null;
  created_at: string;
};

export type PortfolioOpportunity =
  | { type: 'service'; key: string; item: ServiceRequest; created_at: string }
  | { type: 'vacancy'; key: string; item: EmploymentPost; created_at: string };

async function readResponse(response: Response): Promise<any> {
  const value = await response.json().catch(() => null);
  if (response.ok) return value;
  if (response.status === 401 || response.status === 403)
    throw Error('Inicia sesión en Nexo con tu cuenta verificada para publicar o enviar propuestas.');
  if (response.status === 409)
    throw Error('Ya enviaste una propuesta a esta solicitud. Puedes consultar Mis propuestas.');
  throw Error(value?.message || value?.error_description || 'Nexo Central no pudo completar la operación.');
}
const requestIsValid = (item: any): item is ServiceRequest =>
  !!item && typeof item.id === 'string' && typeof item.owner_id === 'string'
  && typeof item.title === 'string' && typeof item.description === 'string'
  && typeof item.category === 'string' && typeof item.location === 'string';
const proposalIsValid = (item: any): item is ServiceProposal =>
  !!item && typeof item.id === 'string' && typeof item.request_id === 'string'
  && typeof item.sender_id === 'string' && typeof item.message === 'string';

export async function listServiceRequests(): Promise<ServiceRequest[]> {
  const data = await readResponse(await fetch(
    API+'/nexo_service_requests?select='+encodeURIComponent(REQUEST_FIELDS)
      +'&status=eq.active&order=created_at.desc&limit=300',
    {headers:BASE_HEADERS,cache:'no-store'},
  ));
  return Array.isArray(data) ? data.filter(requestIsValid) : [];
}

export async function publishServiceRequest(input:{
  title:string; description:string; category:string; location:string; budget_mxn:number|null;
}): Promise<ServiceRequest> {
  const {token,userId} = await getCloudAccess();
  const body = {
    owner_id:userId, title:input.title.trim().slice(0,100),
    description:input.description.trim().slice(0,3000),
    category:input.category.trim().slice(0,100),
    location:input.location.trim().slice(0,150),
    budget_mxn:input.budget_mxn, status:'active',
  };
  if(body.title.length<3 || body.description.length<10 || body.location.length<2)
    throw Error('Completa el título, la descripción y la ciudad antes de publicar.');
  const data = await readResponse(await fetch(API+'/nexo_service_requests?select='+encodeURIComponent(REQUEST_FIELDS),{
    method:'POST',headers:{...BASE_HEADERS,Authorization:'Bearer '+token,Prefer:'return=representation'},
    body:JSON.stringify(body),
  }));
  if(!Array.isArray(data)||!requestIsValid(data[0]))
    throw Error('Nexo no confirmó la publicación. Revisa tus solicitudes antes de intentarlo de nuevo.');
  return data[0];
}

export async function sendServiceProposal(request:ServiceRequest, senderName:string,
  portfolioTitle:string,message:string):Promise<ServiceProposal> {
  if(message.trim().length<10) throw Error('Agrega un mensaje de al menos 10 caracteres.');
  const {token,userId}=await getCloudAccess();
  if(userId===request.owner_id)throw Error('No puedes enviar una propuesta a tu propia solicitud.');
  const body={
    request_id:request.id,sender_id:userId,sender_name:(senderName.trim()||'Usuario Nexo').slice(0,80),
    portfolio_title:portfolioTitle.trim().slice(0,80),
    message:message.trim().slice(0,1200),
  };
  const data=await readResponse(await fetch(API+'/nexo_service_proposals?select='+encodeURIComponent(PROPOSAL_FIELDS),{
    method:'POST',headers:{...BASE_HEADERS,Authorization:'Bearer '+token,Prefer:'return=representation'},
    body:JSON.stringify(body),
  }));
  if(!Array.isArray(data)||!proposalIsValid(data[0]))throw Error('No se confirmó tu propuesta.');
  return data[0];
}

export async function listMyServiceRequests():Promise<ServiceRequest[]> {
  const {token,userId}=await getCloudAccess();
  const data=await readResponse(await fetch(
    API+'/nexo_service_requests?select='+encodeURIComponent(REQUEST_FIELDS)+'&owner_id=eq.'
      +encodeURIComponent(userId)+'&order=created_at.desc&limit=150',
    {headers:{...BASE_HEADERS,Authorization:'Bearer '+token},cache:'no-store'},
  ));
  return Array.isArray(data)?data.filter(requestIsValid):[];
}
export async function listMyServiceProposals():Promise<ServiceProposal[]> {
  const {token}=await getCloudAccess();
  const data=await readResponse(await fetch(
    API+'/nexo_service_proposals?select='+encodeURIComponent(PROPOSAL_FIELDS)
      +'&order=created_at.desc&limit=150',
    {headers:{...BASE_HEADERS,Authorization:'Bearer '+token},cache:'no-store'},
  ));
  return Array.isArray(data)?data.filter(proposalIsValid):[];
}
export async function replyServiceProposal(id:string,response:string):Promise<void> {
  if(response.trim().length<10)throw Error('La respuesta debe tener al menos 10 caracteres.');
  const {token}=await getCloudAccess();
  await readResponse(await fetch(API+'/nexo_service_proposals?id=eq.'+encodeURIComponent(id),{
    method:'PATCH',
    headers:{...BASE_HEADERS,Authorization:'Bearer '+token,Prefer:'return=minimal'},
    body:JSON.stringify({response:response.trim().slice(0,1200),responded_at:new Date().toISOString()}),
  }));
}

// Normalize common Spanish plurals and diacritics without requiring an AI guess.
export function normalizeOpportunityWords(value:string):string[] {
  const clean=value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9 ]/g,' ');
  return clean.split(/\s+/).filter(Boolean).map(word=>{
    if(word.endsWith('es') && word.length>5 && !word.endsWith('ales'))return word.slice(0,-2);
    if(word.endsWith('s') && word.length>4)return word.slice(0,-1);
    return word;
  });
}
const ignored=new Set([
  'la','las','el','los','un','una','unos','unas','de','del','al','por','para','con','y','en',
  'servicio','trabajo','trabajo','proyecto','integrale','integral','nuevo','nueva','hecho',
  'diseño','diseno','fabricacion','reparacion','instalacion','oferta','solicitud','necesito',
  'busco','quiero','varios','varias','profesional','especialidad','experiencia','experto',
]);
const synonyms:Record<string,string[]>={
  cocina:['cocina','cocineta','gabinete','alacena'],
  closet:['closet','armario','ropero','guardarropa','vestidor'],
  sillon:['sillon','sofa','sala','tapizado','tapiceria'],
  mueble:['mueble','carpinteria','ebanisteria','ebanista','carpintero'],
  puerta:['puerta','porton'],
  mesa:['mesa','comedor','escritorio'],
  ventana:['ventana','cancel'],
  escritorio:['escritorio','mesa'],
};
function portfolioKeywords(portfolio:ServicePortfolio):string[]{
  const words=normalizeOpportunityWords(portfolio.title)
    .filter(w=>w.length>=4 && !ignored.has(w));
  const basis=words.length?words:normalizeOpportunityWords(portfolio.service)
    .filter(w=>w.length>=4&&!ignored.has(w));
  const mapped=basis.flatMap(w=>synonyms[w]||[w]);
  return [...new Set(mapped)].map(w=>normalizeOpportunityWords(w)[0]).filter(Boolean);
}
export function matchesPortfolioOpportunity(portfolio:ServicePortfolio,
  offer:Pick<ServiceRequest,'title'|'description'|'category'>):boolean {
  const search=new Set(normalizeOpportunityWords(offer.title+' '+offer.description+' '+offer.category));
  const keys=portfolioKeywords(portfolio);
  return keys.length>0 && keys.some(word=>search.has(word));
}
export function findPortfolioOpportunities(portfolio:ServicePortfolio,
  requests:ServiceRequest[], vacancies:EmploymentPost[]):PortfolioOpportunity[]{
  const matches:PortfolioOpportunity[]=[
    ...requests.filter(request=>request.status==='active' && matchesPortfolioOpportunity(portfolio,request))
      .map(request=>({type:'service' as const,key:'service:'+request.id,item:request,created_at:request.created_at})),
    ...vacancies.filter(post=>post.kind==='vacancy'&&post.status==='active'
      && matchesPortfolioOpportunity(portfolio,post))
      .map(post=>({type:'vacancy' as const,key:'vacancy:'+post.id,item:post,created_at:post.created_at})),
  ];
  return matches.sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
