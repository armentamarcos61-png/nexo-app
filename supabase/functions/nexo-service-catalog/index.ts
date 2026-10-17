import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Only the service-role backend can insert categories; clients have SELECT rights.
const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info",
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
const slug = (s: string) => norm(s).replace(/ /g, "-").slice(0, 95);
const familyOf = (text: string) => {
  const s = norm(text);
  if (/nutric|dietetic|alimentacion/.test(s)) return { family: "nutrition", parent: "Salud y bienestar" };
  if (/abogad|juridic|derecho|notari|legal/.test(s)) return { family: "legal", parent: "Servicios profesionales" };
  if (/psicolog|psicoterap/.test(s)) return { family: "psychology", parent: "Salud y bienestar" };
  if (/medic|podolog|enfermer|salud|dentist|fisioterap/.test(s)) return { family: "health", parent: "Salud y bienestar" };
  if (/educac|tutoria|docenc|ensenan|profesor/.test(s)) return { family: "education", parent: "Educación" };
  if (/contab|auditor|fiscal/.test(s)) return { family: "accounting", parent: "Servicios profesionales" };
  if (/informatic|software|programac|tecnolog/.test(s)) return { family: "technology", parent: "Tecnología" };
  if (/carpinter|construcc|plomer|electric|mecan|tapicer|albanil|soldador/.test(s)) return { family: "physical", parent: "Oficios y construcción" };
  return { family: "general", parent: "Servicios profesionales" };
};
type Entry = { slug: string; name: string; family: string; parent: string; source_url: string | null };
const select = "slug,name,family,parent,source_url";
const aliases: [RegExp, string][] = [
  [/nutri|dietetic|alimentacion/, "nutricion"],
  [/abogad|juridic|asesoria legal|notari|litig/, "servicios-juridicos"],
  [/psicolog|psicoterap/, "psicologia"],
  [/contab|contador|fiscal/, "contabilidad"],
  [/clases particulares|tutori|docente/, "educacion-y-tutorias"],
  [/software|programacion|desarrollo web/, "desarrollo-de-software"],
];
const hits = new Map<string, { n: number; since: number }>();
async function readCatalog(): Promise<Entry[]> {
  const { data, error } = await db.from("nexo_service_categories").select(select).order("name").limit(300);
  if (error) throw error;
  return (data ?? []) as Entry[];
}
async function findExternalProfession(term: string): Promise<{ label: string; id: string } | null> {
  // Wikidata is used only to confirm a recognizable profession/service, not to treat any webpage as a profession.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4800);
  try {
    const url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=es&uselang=es&type=item&limit=8&search=" + encodeURIComponent(term);
    const response = await fetch(url, { signal: controller.signal, headers: { "accept": "application/json" } });
    if (!response.ok) return null;
    const result = await response.json();
    const exact = (Array.isArray(result.search) ? result.search : []).find((item: any) => {
      if (typeof item?.label !== "string" || typeof item?.description !== "string" || !/^Q[0-9]{1,15}$/.test(item.id ?? "")) return false;
      const label = norm(item.label);
      const requested = norm(term);
      const exactName = label === requested || norm(item.match?.text ?? "") === requested;
      const profession = /profesion|profesional|ocupacion|oficio|especialista|ejercicio profesional|practica clinica|trabajador|persona que ejerce|actividad economica|tipo de servicio/.test(norm(item.description));
      return exactName && profession && item.label.length <= 80;
    });
    return exact ? { label: exact.label, id: exact.id } : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return respond({ error: "Método no permitido" }, 405);
  try {
    if (req.method === "GET") return respond({ categories: await readCatalog() });
    const address = (req.headers.get("x-forwarded-for") ?? "public").split(",")[0].slice(0, 60);
    const at = Date.now(), current = hits.get(address);
    const state = current && at - current.since < 60000 ? current : { n: 0, since: at };
    state.n++; hits.set(address, state);
    if (state.n > 12) return respond({ error: "Espera antes de buscar más especialidades" }, 429);
    const body = await req.json().catch(() => null);
    const term = typeof body?.term === "string" ? body.term.trim() : "";
    if (term.length < 3 || term.length > 85 || !/^[\p{L}\p{N} .'-]+$/u.test(term)) {
      return respond({ entry: null, reason: "invalid" });
    }
    const normalized = norm(term);
    const categories = await readCatalog();
    const predefined = aliases.find(([pattern]) => pattern.test(normalized))?.[1];
    const present = categories.find((item) => item.slug === predefined
      || norm(item.name) === normalized || slug(item.name) === slug(term));
    if (present) return respond({ entry: present, verified: true, via: "catalog" });
    // Reject full questions and sentences. Search a specific occupation/service instead.
    if (normalized.split(" ").length > 4 || /^(busco|quiero|necesito|precio|cuanto|donde|contratar)\b/.test(normalized)) {
      return respond({ entry: null, reason: "search_specific_service" });
    }
    const external = await findExternalProfession(term);
    if (!external) return respond({ entry: null, reason: "not_verified" });
    // Avoid an unbounded number of automatically created public categories.
    const { count } = await db.from("nexo_service_categories").select("slug", { count: "exact", head: true })
      .gte("created_at", new Date(at - 86400000).toISOString());
    if ((count ?? 0) >= 100) return respond({ entry: null, reason: "catalog_limit" });
    const classification = familyOf(external.label);
    const newEntry = {
      slug: slug(external.label), name: external.label, parent: classification.parent,
      family: classification.family, source_url: "https://www.wikidata.org/wiki/" + external.id,
      source_label: "Wikidata", verified_at: new Date().toISOString(),
    };
    if (newEntry.slug.length < 3) return respond({ entry: null });
    const { error } = await db.from("nexo_service_categories").upsert(newEntry, { onConflict: "slug", ignoreDuplicates: true });
    if (error) throw error;
    const saved = await db.from("nexo_service_categories").select(select).eq("slug", newEntry.slug).maybeSingle();
    if (saved.error) throw saved.error;
    return respond({ entry: saved.data, verified: true, via: "wikidata" });
  } catch (error) {
    console.error("service catalog:", error instanceof Error ? error.message : "error");
    return respond({ error: "No se pudo consultar el catálogo de especialidades." }, 503);
  }
});
