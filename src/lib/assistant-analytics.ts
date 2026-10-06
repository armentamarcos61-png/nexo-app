export type AssistantMetric = {
  intentKey: string;
  resolved: boolean;
};

const endpoint =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/record-assistant-metric';

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function classifyAssistantQuestion(question: string): AssistantMetric {
  const text = normalize(question);

  if (
    includesAny(text, ['cambiar asistente', 'otro asistente', 'elegir asistente']) ||
    (text.includes('asistente') && includesAny(text, ['cambiar', 'elegir']))
  ) {
    return { intentKey: 'assistant.change_assistant', resolved: true };
  }

  if (
    includesAny(text, ['olvide mi contrasena', 'olvide la contrasena', 'recuperar contrasena', 'restablecer contrasena', 'codigo de recuperacion']) ||
    (text.includes('contrasena') && includesAny(text, ['olvide', 'recuperar', 'restablecer', 'codigo']))
  ) {
    return { intentKey: 'account.password_recovery', resolved: true };
  }

  if (includesAny(text, ['correo', 'email']) && includesAny(text, ['incorrecto', 'invalido', 'no existe', 'registrado', 'cambiar'])) {
    return { intentKey: 'account.email', resolved: true };
  }

  if (includesAny(text, ['iniciar sesion', 'entrar a mi cuenta', 'acceder a mi cuenta', 'login'])) {
    return { intentKey: 'account.sign_in', resolved: true };
  }

  if (
    includesAny(text, ['publicar vacante', 'crear vacante', 'subir vacante']) ||
    (text.includes('vacante') && includesAny(text, ['publicar', 'crear', 'subir']))
  ) {
    return { intentKey: 'employment.publish_vacancy', resolved: true };
  }

  if (
    includesAny(text, ['buscar trabajo', 'buscar empleo', 'conseguir trabajo', 'conseguir empleo', 'busco trabajo', 'busco empleo'])
  ) {
    return { intentKey: 'employment.find_job', resolved: true };
  }

  if (
    includesAny(text, ['buscar trabajadores', 'buscar trabajador', 'contratar personal', 'contratar trabajador', 'busco trabajadores'])
  ) {
    return { intentKey: 'employment.hire_worker', resolved: true };
  }

  if (
    includesAny(text, ['ofrecer un servicio', 'publicar un servicio', 'subir un servicio', 'vendo mi servicio'])
  ) {
    return { intentKey: 'services.offer_service', resolved: true };
  }

  if (
    includesAny(text, ['contratar un servicio', 'buscar un servicio', 'necesito un servicio', 'busco un servicio'])
  ) {
    return { intentKey: 'services.hire_service', resolved: true };
  }

  if (
    includesAny(text, ['publicar producto', 'vender producto', 'subir producto', 'vendo un producto'])
  ) {
    return { intentKey: 'products.publish_product', resolved: true };
  }

  if (
    includesAny(text, ['comprar producto', 'buscar producto', 'productos', 'marketplace'])
  ) {
    return { intentKey: 'products.find_product', resolved: true };
  }

  if (includesAny(text, ['pago', 'pagos', 'cobro', 'cobrar']) && includesAny(text, ['como', 'funciona', 'hacer'])) {
    return { intentKey: 'payments.how_payments_work', resolved: true };
  }

  if (
    includesAny(text, ['editar perfil', 'cambiar perfil', 'foto de perfil', 'mi perfil'])
  ) {
    return { intentKey: 'profile.edit_profile', resolved: true };
  }

  if (
    includesAny(text, ['como funciona nexo', 'para que sirve nexo', 'que es nexo', 'como se usa nexo'])
  ) {
    return { intentKey: 'navigation.how_nexo_works', resolved: true };
  }

  if (
    includesAny(text, ['donde esta', 'donde encuentro', 'donde puedo', 'en que parte']) &&
    includesAny(text, ['nexo', 'opcion', 'boton', 'seccion'])
  ) {
    return { intentKey: 'navigation.where_is_feature', resolved: true };
  }

  if (includesAny(text, ['chat', 'mensaje', 'mensajes'])) {
    return { intentKey: 'other.chat', resolved: true };
  }

  if (includesAny(text, ['verificar', 'verificacion', 'verificado', 'palomita'])) {
    return { intentKey: 'other.verification', resolved: true };
  }

  if (includesAny(text, ['notificacion', 'notificaciones', 'avisos'])) {
    return { intentKey: 'other.notifications', resolved: true };
  }

  if (includesAny(text, ['ubicacion', 'distancia', 'cerca de mi', 'cercano'])) {
    return { intentKey: 'other.location', resolved: true };
  }

  if (includesAny(text, ['comision', 'comisiones'])) {
    return { intentKey: 'other.commissions', resolved: true };
  }

  if (includesAny(text, ['envio', 'envios', 'flete', 'logistica', 'transporte'])) {
    return { intentKey: 'other.shipping', resolved: true };
  }

  if (includesAny(text, ['curriculum', 'curriculum', 'cv'])) {
    return { intentKey: 'other.cv', resolved: true };
  }

  if (includesAny(text, ['portafolio', 'portafolios'])) {
    return { intentKey: 'other.portfolio', resolved: true };
  }

  if (includesAny(text, ['afiliado', 'afiliados', 'directorio'])) {
    return { intentKey: 'other.affiliates', resolved: true };
  }

  if (includesAny(text, ['filtro', 'filtros', 'filtrar', 'busqueda', 'buscar'])) {
    return { intentKey: 'other.filters', resolved: true };
  }

  return { intentKey: 'other.unclassified', resolved: false };
}

export async function recordAssistantQuestionMetric(input: {
  intentKey: string;
  resolved: boolean;
  assistantId: 'nexa' | 'nexo';
  section: string;
}) {
  const safeSection = /^\/[a-zA-Z0-9_\/-]*$/.test(input.section)
    ? input.section.slice(0, 100)
    : '/unknown';

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intentKey: input.intentKey,
        resolved: input.resolved,
        assistantId: input.assistantId,
        section: safeSection || '/unknown',
      }),
    });
  } catch {
    // Analytics must never block or break the assistant experience.
  }
}
