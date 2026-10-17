export type ServiceFamily = 'nutrition' | 'legal' | 'psychology' | 'health' | 'education' | 'accounting' | 'technology' | 'physical' | 'general';
export type ServiceScale = { key: 'chico' | 'mediano' | 'grande' | 'flexible'; label: string; text: string };
export type ServiceContext = {
  family: ServiceFamily;
  category: string;
  eyebrow: string;
  intro: string;
  scales: ServiceScale[];
  detailLabel: string;
  detailPlaceholder: string;
  modeLabel: string;
  modes: string[];
  payOptions: string[];
};

type Profile = Omit<ServiceContext, 'scales'> & { sizes: [string, string, string, string, string, string] };

const professionalPay = ['Por consulta', 'Por hora', 'Por paquete', 'Por proyecto', 'Por acordar'];
const remoteModes = ['En línea', 'Presencial', 'Cualquiera'];
const profiles: Record<ServiceFamily, Profile> = {
  nutrition: {
    family: 'nutrition', category: 'Nutrición', eyebrow: 'ASESORÍA NUTRICIONAL',
    intro: 'Indica el alcance del acompañamiento nutricional; no se cotiza por piezas ni por metros.',
    sizes: ['Consulta inicial', 'Valoración o asesoría puntual.', 'Seguimiento', 'Varias consultas y ajustes de hábitos o plan.', 'Plan integral', 'Acompañamiento prolongado y revisiones periódicas.'],
    detailLabel: '¿Qué buscas mejorar con la asesoría?',
    detailPlaceholder: 'Ej. orientación alimentaria, deporte, hábitos, seguimiento...',
    modeLabel: '¿Cómo prefieres recibir la consulta?', modes: remoteModes,
    payOptions: ['Por consulta', 'Por sesión', 'Por plan mensual', 'Por paquete', 'Por acordar'],
  },
  legal: {
    family: 'legal', category: 'Servicios jurídicos', eyebrow: 'ASESORÍA LEGAL',
    intro: 'El alcance se define por la orientación o trámite requerido, no por cantidad de piezas.',
    sizes: ['Orientación', 'Una consulta para conocer tus opciones.', 'Asesoría o trámite', 'Revisión de documentos o gestiones con seguimiento.', 'Representación', 'Asunto complejo con varias etapas o comparecencias.'],
    detailLabel: '¿En qué tema legal necesitas ayuda?',
    detailPlaceholder: 'Ej. laboral, familiar, contrato, arrendamiento, mercantil...',
    modeLabel: 'Modalidad de atención', modes: remoteModes,
    payOptions: ['Por consulta', 'Por trámite', 'Por hora', 'Por asunto', 'Por acordar'],
  },
  psychology: {
    family: 'psychology', category: 'Psicología', eyebrow: 'ATENCIÓN PSICOLÓGICA',
    intro: 'Selecciona la modalidad de atención y el acompañamiento que estás buscando.',
    sizes: ['Primera sesión', 'Consulta inicial de orientación.', 'Sesiones periódicas', 'Acompañamiento con varias citas.', 'Proceso continuo', 'Atención a largo plazo, según valoración profesional.'],
    detailLabel: '¿Qué tipo de atención buscas?',
    detailPlaceholder: 'Ej. individual, pareja, familiar, orientación...',
    modeLabel: 'Modalidad de atención', modes: remoteModes,
    payOptions: ['Por sesión', 'Por consulta', 'Por paquete', 'Por acordar'],
  },
  health: {
    family: 'health', category: 'Salud y bienestar', eyebrow: 'ATENCIÓN DE SALUD',
    intro: 'Describe el tipo de atención y su alcance. El especialista confirmará qué corresponde.',
    sizes: ['Consulta', 'Valoración o atención puntual.', 'Seguimiento', 'Consultas y controles posteriores.', 'Atención prolongada', 'Varias etapas de atención indicadas por el profesional.'],
    detailLabel: '¿Qué atención necesitas?',
    detailPlaceholder: 'Ej. valoración, especialidad, consulta, seguimiento...',
    modeLabel: 'Modalidad de atención', modes: ['Presencial', 'En línea (si aplica)', 'Por definir'],
    payOptions: ['Por consulta', 'Por sesión', 'Por procedimiento', 'Por acordar'],
  },
  education: {
    family: 'education', category: 'Educación y tutorías', eyebrow: 'CLASES Y ASESORÍAS',
    intro: 'Elige si necesitas una clase, varias sesiones o un programa completo.',
    sizes: ['Una clase', 'Explicación o asesoría puntual.', 'Curso corto', 'Varias clases con objetivos definidos.', 'Programa completo', 'Formación de varias semanas o niveles.'],
    detailLabel: '¿Qué materia o habilidad quieres aprender?',
    detailPlaceholder: 'Ej. matemáticas, inglés, Excel, preparación para examen...',
    modeLabel: 'Modalidad de enseñanza', modes: remoteModes,
    payOptions: ['Por clase', 'Por hora', 'Por curso', 'Por mes', 'Por acordar'],
  },
  accounting: {
    family: 'accounting', category: 'Contabilidad', eyebrow: 'ASESORÍA CONTABLE',
    intro: 'Define si es una consulta, una gestión o un servicio contable recurrente.',
    sizes: ['Consulta', 'Duda fiscal o contable puntual.', 'Trámite o declaración', 'Preparación y revisión de documentación.', 'Gestión continua', 'Contabilidad periódica o atención integral.'],
    detailLabel: '¿Qué asunto contable o fiscal necesitas resolver?',
    detailPlaceholder: 'Ej. declaraciones, SAT, facturación, nómina...',
    modeLabel: 'Modalidad de atención', modes: remoteModes, payOptions: professionalPay,
  },
  technology: {
    family: 'technology', category: 'Tecnología', eyebrow: 'SERVICIO TECNOLÓGICO',
    intro: 'Elige el alcance de la solución: desde una corrección hasta un desarrollo completo.',
    sizes: ['Ajuste puntual', 'Revisión, instalación o corrección específica.', 'Proyecto mediano', 'Varias funciones o etapas técnicas.', 'Desarrollo integral', 'Sistema completo con pruebas y mantenimiento.'],
    detailLabel: '¿Qué herramienta o sistema necesitas?',
    detailPlaceholder: 'Ej. sitio web, aplicación, red, equipo, automatización...',
    modeLabel: 'Modalidad de trabajo', modes: ['Remoto', 'Presencial', 'Mixto'],
    payOptions: ['Por hora', 'Por proyecto', 'Por mantenimiento', 'Por acordar'],
  },
  physical: {
    family: 'physical', category: 'Oficios y construcción', eyebrow: 'ESCALA DEL PROYECTO',
    intro: 'Elige una escala aproximada. Sirve para comparar trabajos materiales equivalentes.',
    sizes: ['Chico', 'Trabajo puntual, una tarea o pocas piezas.', 'Mediano', 'Varias tareas, varios días o coordinación moderada.', 'Grande', 'Proyecto amplio, varias etapas o varias personas.'],
    detailLabel: '¿Qué trabajo necesitas realizar?',
    detailPlaceholder: 'Ej. reparación, fabricación, instalación, medidas y materiales...',
    modeLabel: 'Lugar del servicio', modes: ['A domicilio', 'En taller', 'Por definir'],
    payOptions: ['Por visita', 'Por hora', 'Por día', 'Por proyecto', 'Por acordar'],
  },
  general: {
    family: 'general', category: 'Servicios profesionales', eyebrow: 'ALCANCE DEL SERVICIO',
    intro: 'Cuéntale a Nexo qué tan completa debe ser la ayuda. La escala depende de la especialidad.',
    sizes: ['Puntual', 'Una consulta o intervención específica.', 'Con seguimiento', 'Varias sesiones o entregas relacionadas.', 'Integral', 'Servicio de mayor alcance con varias etapas.'],
    detailLabel: '¿Qué resultado esperas del servicio?',
    detailPlaceholder: 'Ej. asesoramiento, diagnóstico, consulta o trabajo que necesitas...',
    modeLabel: 'Modalidad del servicio', modes: remoteModes, payOptions: professionalPay,
  },
};

const needles: [ServiceFamily, RegExp][] = [
  ['nutrition', /nutri|diet[eé]tic|alimentaci[oó]n|plan aliment/],
  ['legal', /abogad|jur[ií]dic|legal|derecho|notari|litig|despacho jur/],
  ['psychology', /psic[oó]log|psicoterap|terapia emocional|salud mental/],
  ['accounting', /contab|contador|fiscal|impuest|declaraci[oó]n sat/],
  ['education', /tutor[ií]a|clases? particular|docent|ense[nñ]anz|educaci[oó]n|profesor|maestr[oa]|capacitaci[oó]n/],
  ['health', /m[eé]dic|odont[oó]log|dentist|enfermer|fisioterap|pediatr|oftalm[oó]log/],
  ['technology', /programaci[oó]n|desarrollo de software|aplicaci[oó]n|sitio web|inform[aá]tic|sistemas?|ciberseguridad|redes? inform[aá]tic/],
  ['physical', /carpinter|mueble|closet|cl[oó]set|electric|plomer|fontaner|tapicer|alba[nñ]il|construcci[oó]n|remodel|pintura de casa|herrer|soldadur|instalaci[oó]n|jardiner|mec[aá]nic|reparaci[oó]n/],
];
export function normalizeServiceTerm(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

export function getServiceContext(query: string, category = '', discovered?: { name: string; family: string } | null): ServiceContext {
  const search = normalizeServiceTerm(query);
  const chosen = normalizeServiceTerm(category === 'Todas' ? '' : category);
  const detected = needles.find(([, pattern]) => pattern.test(search))?.[0]
    ?? needles.find(([, pattern]) => pattern.test(chosen))?.[0];
  const remoteFamily = discovered?.family as ServiceFamily | undefined;
  const family = detected ?? (remoteFamily && remoteFamily in profiles ? remoteFamily : 'general');
  const profile = profiles[family];
  const [first, firstText, second, secondText, third, thirdText] = profile.sizes;
  return {
    ...profile,
    category: category && category !== 'Todas' ? category : discovered?.name || profile.category,
    scales: [
      { key: 'chico', label: first, text: firstText },
      { key: 'mediano', label: second, text: secondText },
      { key: 'grande', label: third, text: thirdText },
      { key: 'flexible', label: 'No estoy seguro', text: 'Nexo puede ayudarte a definir el alcance.' },
    ],
  };
}
