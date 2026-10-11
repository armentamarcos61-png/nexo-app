import { Platform } from 'react-native';
import { countNexoSearch } from '@/lib/nexo-control-api';

export type NexaSource = { title: string; url: string };
export type NexaReply = { text: string; sources: NexaSource[]; online: boolean };
export type NexaHistoryEntry = {
  question: string; answer: string; sources: NexaSource[]; date: string;
};
const PREFIX = 'nexo.nexa-history.v1.';
const MAX_ITEMS = 45;
const inWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';
const key = (userId?: string | null) => PREFIX + (userId || 'guest');
const clean = (text: string, limit: number) => text.replace(/\s+/g, ' ').trim().slice(0, limit);

export function readNexaHistory(userId?: string | null): NexaHistoryEntry[] {
  if (!inWeb()) return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key(userId)) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is NexaHistoryEntry =>
      !!item && typeof item.question === 'string' &&
      typeof item.answer === 'string' && typeof item.date === 'string' &&
      Array.isArray(item.sources)).slice(-MAX_ITEMS);
  } catch { return []; }
}
export function rememberNexaConversation(
  question: string, reply: NexaReply, userId?: string | null
): NexaHistoryEntry[] {
  const prev = readNexaHistory(userId);
  const entry: NexaHistoryEntry = {
    question: clean(question, 300),
    answer: clean(reply.text, 1200),
    sources: reply.sources.slice(0, 3),
    date: new Date().toISOString(),
  };
  const next = [...prev, entry].slice(-MAX_ITEMS);
  if (inWeb()) {
    try { window.localStorage.setItem(key(userId), JSON.stringify(next)); }
    catch { /* Private mode or storage quota: the assistant still replies. */ }
  }
  return next;
}
export function clearNexaHistory(userId?: string | null): void {
  if (!inWeb()) return;
  try { window.localStorage.removeItem(key(userId)); } catch { /* no storage */ }
}

/** The history is for recalling prior questions, never for claiming that a
 * previously generated answer is verified or for teaching the model weights.
 * Only exact recent repeats can be recalled, with their original citations.
 */
export function recallNexaAnswer(query: string, userId?: string | null): NexaReply | null {
  const norm = (s: string) => s.toLocaleLowerCase('es').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[¿?.,!]/g, '').trim();
  const matches = readNexaHistory(userId)
    .filter(item => norm(item.question) === norm(query));
  const last = matches[matches.length - 1];
  if (!last) return null;
  return {
    text: 'Ya habíamos hablado de esto: ' + last.answer,
    sources: last.sources,
    online: false,
  };
}

/** Search things the user EXPLICITLY asked Nexa to remember.
 * Never infer private attributes or claim the assistant learned model weights.
 */
export function recallNexaNote(question: string, userId?: string | null): NexaReply | null {
  const normalize = (value: string) => value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ');
  const skip = new Set(['que', 'cual', 'como', 'donde', 'cuando', 'quien',
    'recuerdas', 'recuerda', 'dime', 'sabes', 'tengo', 'tienes', 'sobre',
    'de', 'del', 'el', 'la', 'los', 'las', 'en', 'mi', 'mis', 'me', 'yo',
    'es', 'son', 'un', 'una', 'a', 'y', 'lo', 'por', 'para', 'cuanto']);
  const terms = normalize(question).split(/\s+/)
    .filter(token => token.length > 3 && !skip.has(token));
  if (!terms.length) return null;
  const notes = readNexaHistory(userId)
    .filter(item => /^recuerda que\b/i.test(item.question))
    .map(item => item.question.replace(/^recuerda que\s*/i, ''));
  const scored = notes.map(note => ({
    note, score: terms.filter(term => normalize(note).includes(term)).length,
  })).sort((a,b)=>b.score-a.score);
  const match=scored[0];
  if (!match || match.score < 1) return null;
  return {text: 'Antes me pediste recordar esto: ' + clean(match.note, 500),
    sources: [], online: false};
}

function timeoutSignal(milliseconds: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, clear: () => clearTimeout(id) };
}
type WikiPage = {
  title?: string; extract?: string; fullurl?: string;
  pageid?: number; missing?: string;
};
/** Public Wikimedia Search API. No API keys in the browser and no scraping.
 * The requested words are sent to Wikimedia, never the user's local history.
 * This is source-backed reference search, not an unrestricted AI model.
 */
export async function searchNexaReferences(question: string): Promise<NexaReply> {
  const query = clean(question, 180);
  if (!query) return { text: 'Escribe tu pregunta y te ayudo.', sources: [], online: false };
  void countNexoSearch('nexa_external','nexa');
  const pending = timeoutSignal(11000);
  try {
    const params = new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      generator: 'search', gsrsearch: query, gsrlimit: '3',
      prop: 'extracts|info', inprop: 'url',
      exintro: '1', explaintext: '1', exchars: '540',
      redirects: '1',
    });
    const response = await fetch('https://es.wikipedia.org/w/api.php?' + params.toString(), {
      signal: pending.signal,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const json: { query?: { pages?: Record<string, WikiPage> } } = await response.json();
    const pages = Object.values(json.query?.pages || {})
      .filter(page => !!page.title && !!page.extract && !page.missing)
      .sort((a, b) => (b.extract?.length || 0) - (a.extract?.length || 0))
      .slice(0, 2);
    if (!pages.length) return {
      text: 'No encontré información verificable para esa pregunta en Wikipedia. Puedes probar con palabras más específicas o consultar una búsqueda general.',
      sources: [], online: true,
    };
    const sources: NexaSource[] = pages.map(page => ({
      title: clean(page.title || '', 100),
      url: page.fullurl || ('https://es.wikipedia.org/?curid=' + page.pageid),
    }));
    const summary = clean(pages[0].extract || '', 600);
    return {
      text: summary + (pages.length > 1 ?
        ' También encontré una referencia relacionada: ' + clean(pages[1].title || '', 85) + '.' : '') +
        ' Consulta las fuentes antes de tomar decisiones importantes.',
      sources, online: true,
    };
  } catch {
    return {
      text: 'No pude consultar fuentes en línea ahora mismo. Comprueba tu conexión o vuelve a intentar; no voy a inventar una respuesta.',
      sources: [], online: false,
    };
  } finally { pending.clear(); }
}

export function generalSearchUrl(query: string): string {
  return 'https://www.google.com/search?q=' + encodeURIComponent(query.slice(0, 180));
}
