import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssistantStage } from '@/components/assistant-stage';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import {
  classifyAssistantQuestion,
  recordAssistantQuestionMetric,
  type AssistantMetric,
} from '@/lib/assistant-analytics';
import { speakAsAssistant, stopAssistantSpeech } from '@/lib/assistant-speech';
import { useAssistant } from '@/state/assistant';
import { useAuth } from '@/state/auth';
import { clearNexaHistory, generalSearchUrl, readNexaHistory, recallNexaAnswer, recallNexaNote, rememberNexaConversation, searchNexaReferences, type NexaReply, type NexaSource } from '@/lib/nexa-knowledge';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

const quickQuestions = [
  '¿Cómo funciona Nexo?',
  '¿Cómo publico una vacante?',
  '¿Cómo publico un servicio?',
  '¿Cómo cambio de asistente?',
] as const;

function localAnswer(metric: AssistantMetric, assistantName: string) {
  switch (metric.intentKey) {
    case 'navigation.how_nexo_works':
      return 'Nexo conecta empleo, trabajadores, servicios y productos en un mismo lugar. Puedes buscar oportunidades, publicar lo que ofreces o necesitas y usar tu perfil para mostrar tu experiencia.';
    case 'navigation.where_is_feature':
      return 'Dime qué función buscas dentro de Nexo y te indico en qué sección está. También puedo orientarte desde la pantalla en la que abriste el asistente.';

    case 'employment.publish_vacancy':
      return 'Para publicar una vacante entra a Publicar y elige la opción de empleo. Después agrega puesto, descripción, horario, rango de pago y los datos necesarios para que las personas adecuadas puedan postularse.';
    case 'employment.find_job':
      return 'Para buscar empleo entra a Buscar empleo. Puedes usar la búsqueda y los filtros para acercarte a puestos compatibles con tu experiencia, horario y tipo de trabajo.';
    case 'employment.hire_worker':
      return 'Para buscar trabajadores entra a la parte de empleo y elige buscar personal. Ahí podrás definir qué necesitas, experiencia, horario y rango de pago.';

    case 'services.offer_service':
      return 'Para ofrecer un servicio entra a Publicar y elige servicio. Agrega qué haces, categoría, descripción, zona de trabajo y la información que ayude al cliente a entender tu oferta.';
    case 'services.hire_service':
      return 'Para contratar un servicio entra a Servicios o usa la búsqueda. Puedes describir lo que necesitas y Nexo te mostrará opciones relacionadas.';

    case 'products.publish_product':
      return 'Para vender un producto entra a Productos y toca Publicar producto. Ahí podrás agregar nombre, descripción, fotos, precio y categoría.';
    case 'products.find_product':
      return 'En Productos puedes explorar el marketplace completo o buscar por nombre y categoría para encontrar lo que necesitas.';

    case 'account.password_recovery':
      return 'En Iniciar sesión toca Olvidé mi contraseña. Nexo puede enviar el flujo de recuperación al correo registrado sin mostrar tu contraseña actual.';
    case 'account.email':
      return 'Si Nexo indica un problema con el correo, revisa que esté escrito completo y con el formato correcto. Si el correo no está registrado, la app te lo indicará.';
    case 'account.sign_in':
      return 'Para iniciar sesión usa tu correo o nombre de usuario y tu contraseña. Si alguno no coincide, Nexo te mostrará un mensaje específico para ayudarte a corregirlo.';

    case 'profile.edit_profile':
      return 'En Mi espacio puedes editar tu nombre visible, foto, profesión, experiencia, habilidades, disponibilidad y otras preferencias del perfil.';

    case 'payments.how_payments_work':
      return 'La parte de pagos está pensada para que Nexo pueda coordinar cobros y pagos entre las partes. Conforme se active esa función te explicaré desde aquí cada paso y comisión antes de confirmar.';

    case 'assistant.change_assistant':
      return 'Por ahora Nexa es la asistente virtual de Nexo. Puedes abrirla desde la pantalla principal o Mi espacio y configurar su experiencia.';

    case 'other.chat':
      return 'El chat de Nexo está pensado para mantener la comunicación dentro de la plataforma entre las partes relacionadas con una oportunidad, servicio o producto.';
    case 'other.verification':
      return 'La verificación sirve para dar más confianza dentro de Nexo. La idea es reconocer a usuarios que ya hayan completado operaciones o servicios correctamente.';
    case 'other.notifications':
      return 'Las notificaciones te ayudarán a enterarte de respuestas, solicitudes y cambios importantes dentro de Nexo sin tener que revisar cada sección manualmente.';
    case 'other.location':
      return 'La ubicación se usa para ayudarte a encontrar oportunidades, servicios o productos relevantes por zona. Evitaremos mostrar datos personales innecesarios.';
    case 'other.commissions':
      return 'Nexo busca manejar comisiones bajas y claras. Cuando una operación tenga comisión, debe mostrarse antes de aceptar para que sepas cuánto se cobra y por qué.';
    case 'other.shipping':
      return 'La logística puede incluir transporte, flete y coordinación entre participantes. Nexo está pensado para ir integrando esas opciones sin obligarte a salir de la plataforma.';
    case 'other.cv':
      return 'Nexo contempla ayudarte a crear y mejorar tu currículum usando los datos profesionales de tu perfil para que puedas postularte más rápido.';
    case 'other.portfolio':
      return 'En el portafolio podrás organizar trabajos por temas o categorías para que clientes y empresas vean mejor lo que sabes hacer.';
    case 'other.affiliates':
      return 'El directorio de afiliados está pensado para reunir empresas, profesionales, trabajadores, prestadores y vendedores que formen parte del ecosistema de Nexo.';
    case 'other.filters':
      return 'Los filtros sirven para reducir resultados por categoría, tipo de oportunidad y otros criterios para encontrar algo útil sin recorrer cientos de opciones.';

    default:
      return 'No tengo todavía una respuesta específica sobre esa función de Nexo.';
  }
}

export default function AsistenteScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { assistant } = useAssistant();
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(
    assistant?.greeting ?? 'Primero elige tu asistente para comenzar.'
  );
  const [speaking, setSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [sources, setSources] = useState<NexaSource[]>([]);
  const [pending, setPending] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [historyCount, setHistoryCount] = useState(() => readNexaHistory(user?.id).length);
  const requestId = useRef(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const recognizerRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    return () => {
      requestId.current += 1;
      void stopAssistantSpeech();
      const recognizer = recognizerRef.current;
      if (recognizer) {
        recognizer.onend = null;
        recognizer.onresult = null;
        recognizer.onerror = null;
        recognizer.stop();
      }
      recognizerRef.current = null;
    };
  }, []);

  async function respond(value: string) {
    const questionText = value.trim().slice(0, 300);
    if (!questionText) return;
    if (!assistant) {
      router.push('/elegir-asistente');
      return;
    }
    const current = ++requestId.current;
    setLastQuery(questionText);
    setPending(true);
    setSources([]);
    setQuestion('');
    setSpeaking(false);
    await stopAssistantSpeech();
    if (current !== requestId.current) return;

    const metric = classifyAssistantQuestion(questionText);
    let reply: NexaReply;
    const remembering = /^recuerda que\b/i.test(questionText);
    const askingHistory = /(?:que recuerdas|qué recuerdas|que te pregunte|qué te pregunté|de que hablamos|de qué hablamos|historial de (?:nexa|nuestra conversación))/i.test(questionText);
    const historic = readNexaHistory(user?.id);
    const changingFact = /(?:hoy|ahora|actual|ultimo|último|reciente|noticias|clima|precio|cotizaci[oó]n)/i.test(questionText);

    try {
      if (remembering) {
        reply = { text: 'Guardaré esa nota en el historial de este navegador para nuestras próximas conversaciones. Puedes borrarlo cuando quieras.', sources: [], online: false };
      } else if (askingHistory) {
        const recent = historic.slice(-5).map(item => item.question).reverse();
        reply = { text: recent.length
          ? 'Estas son nuestras preguntas más recientes: ' + recent.join(' · ')
          : 'Aún no tenemos preguntas guardadas en este navegador.',
          sources: [], online: false };
      } else if (metric.resolved && !(metric.intentKey === 'other.filters' &&
        !/nexo|filtr|categor[ií]a/i.test(questionText))) {
        reply = { text: localAnswer(metric, assistant.name), sources: [], online: false };
      } else {
        const recalled = changingFact ? null : (recallNexaAnswer(questionText, user?.id) || recallNexaNote(questionText, user?.id));
        reply = recalled || await searchNexaReferences(questionText);
      }
    } catch {
      reply = { text: 'Ocurrió un problema al consultar la información. Prueba nuevamente.', sources: [], online: false };
    }
    if (current !== requestId.current) return;

    rememberNexaConversation(questionText, reply, user?.id);
    setHistoryCount(readNexaHistory(user?.id).length);
    setAnswer(reply.text);
    setSources(reply.sources);
    setSpokenText(reply.text);
    setPending(false);
    const section = typeof params.from === 'string' && params.from.startsWith('/')
      ? params.from : '/asistente';
    void recordAssistantQuestionMetric({
      intentKey: metric.intentKey,
      resolved: metric.resolved || reply.sources.length > 0 || remembering || askingHistory,
      assistantId: assistant.id,
      section,
    });
    if (voiceEnabled) {
      void speakAsAssistant(reply.text, assistant.id, {
        onStart: () => { if (current === requestId.current) setSpeaking(true); },
        onDone: () => { if (current === requestId.current) setSpeaking(false); },
        onStopped: () => { if (current === requestId.current) setSpeaking(false); },
        onError: () => { if (current === requestId.current) setSpeaking(false); },
      });
    }
  }

  function toggleDictation() {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      return;
    }
    setMicError('');
    if (Platform.OS !== 'web') {
      setMicError('El dictado aún no está disponible en la app instalada. Puedes escribir tu pregunta.');
      return;
    }
    // Chrome on Android exposes webkitSpeechRecognition; supported browsers
    // request microphone permission themselves. Never record or upload audio here.
    const browser = globalThis as typeof globalThis & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setMicError('Este navegador no admite dictado. Prueba Chrome actualizado o escribe tu pregunta.');
      return;
    }
    void stopAssistantSpeech();
    setSpeaking(false);
    const recognition = new Recognition();
    recognition.lang = 'es-MX';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (transcript) respond(transcript);
    };
    recognition.onerror = (event) => {
      setMicError(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Necesitas permitir el micrófono en el navegador para hablar con Nexa.'
        : event.error === 'no-speech'
          ? 'No escuché ninguna pregunta. Vuelve a tocar el micrófono.'
          : 'No se pudo reconocer tu voz. Inténtalo de nuevo o escribe tu pregunta.');
    };
    recognition.onend = () => {
      if (recognizerRef.current === recognition) recognizerRef.current = null;
      setListening(false);
    };
    recognizerRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognizerRef.current = null;
      setListening(false);
      setMicError('El micrófono no pudo iniciarse. Verifica los permisos del navegador.');
    }
  }

  if (!assistant) {
    return (
      <NexoScreen title="Asistente Nexo">
        <Text style={[styles.empty, { color: palette.text }]}>
          Todavía no has activado a Nexa.
        </Text>
        <Action label="Activar a Nexa" onPress={() => router.push('/elegir-asistente')} />
      </NexoScreen>
    );
  }

  return (
    <NexoScreen title={'Asistente · ' + assistant.name}>
      <AssistantStage key={assistant.id} profile={assistant} speaking={speaking} speechText={spokenText} />

      <View style={[styles.message, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.messageTitle, { color: palette.title }]}>
          {speaking ? assistant.name + ' está hablando…' : assistant.name}
        </Text>
        <Text style={[styles.messageText, { color: palette.text }]}>{pending ? 'Consultando fuentes y preparando la respuesta…' : answer}</Text>
        {sources.map((source, i) => (
          <Pressable key={source.url + i} accessibilityRole="link"
            onPress={() => { void Linking.openURL(source.url); }}
            style={{ marginTop: 9 }}>
            <Text style={{ color: '#8CE9FF', fontSize: 12, fontWeight: '700' }}>↗ Fuente: {source.title}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.historyRow}>
        <Text style={[styles.historyLabel, { color: palette.muted }]}>
          Historial local · {historyCount} conversaciones
        </Text>
        <Pressable accessibilityRole="button" onPress={() => {
          clearNexaHistory(user?.id);
          setHistoryCount(0);
        }}>
          <Text style={{ color: '#9EDFFF', fontSize: 12, fontWeight: '700' }}>Borrar historial</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: voiceEnabled }}
        onPress={() => {
          const nextEnabled = !voiceEnabled;
          setVoiceEnabled(nextEnabled);

          if (!nextEnabled) {
            void stopAssistantSpeech();
            setSpeaking(false);
          }
        }}
        style={({ pressed }) => [
          styles.voiceToggle,
          {
            borderColor: voiceEnabled ? assistant.secondaryAccent : palette.cardBorder,
            backgroundColor: voiceEnabled
              ? 'rgba(52,92,147,0.34)'
              : 'rgba(13,29,52,0.62)',
          },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.voiceIcon}>{voiceEnabled ? '🔊' : '🔇'}</Text>
        <View style={styles.voiceCopy}>
          <Text style={[styles.voiceTitle, { color: palette.title }]}>
            {voiceEnabled ? 'Voz activada' : 'Voz desactivada'}
          </Text>
          <Text style={[styles.voiceHint, { color: palette.muted }]}>
            {assistant.name} usa una voz en español adaptada a su perfil.
          </Text>
        </View>
      </Pressable>

      <View style={styles.quickGrid}>
        {quickQuestions.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            onPress={() => respond(item)}
            style={({ pressed }) => [
              styles.quick,
              { borderColor: palette.cardBorder },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.quickText, { color: palette.title }]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {Platform.OS === 'web' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={listening ? 'Detener dictado' : 'Preguntarle por voz a Nexa'}
          onPress={toggleDictation}
          style={({ pressed }) => [
            styles.micAction,
            { borderColor: listening ? '#79E9FF' : palette.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.micIcon}>{listening ? '⏹' : '🎙️'}</Text>
          <Text style={[styles.micLabel, { color: palette.title }]}>
            {listening ? 'Escuchando… toca para detener' : 'Hablar con Nexa'}
          </Text>
        </Pressable>
      )}
      {!!micError && <Text style={[styles.micError, { color: palette.text }]}>{micError}</Text>}
      <Field
        label="Tu pregunta sobre Nexo"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ej. ¿Cómo publico un producto?"
        maxLength={300}
        onSubmitEditing={() => respond(question)}
      />
      <Action label={pending ? 'Buscando fuentes…' : 'Preguntar'} onPress={() => { void respond(question); }} disabled={!question.trim() || pending} />
      <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(generalSearchUrl(question || lastQuery || 'Nexo')); }}>
        <Text style={{ color: '#9EDFFF', fontWeight: '700', textAlign: 'center' }}>Abrir búsqueda general en Internet ↗</Text>
      </Pressable>

      <View style={[styles.privacy, { borderColor: palette.cardBorder }]}>
        <Text style={styles.privacyIcon}>◉</Text>
        <Text style={[styles.privacyText, { color: palette.muted }]}>
          Nexa consulta Wikipedia cuando la pregunta sale de las funciones de Nexo. Las palabras de búsqueda se envían a Wikimedia. El historial y las notas se guardan sólo en este navegador, no se sincronizan entre teléfonos y puedes borrarlos arriba. Las métricas externas son anónimas y por categoría. Si usas dictado, el navegador puede procesar tu voz con su proveedor. No compartas contraseñas ni información sensible en preguntas web.
        </Text>
      </View>

      <Action
        label="Ver presentación de Nexa"
        secondary
        onPress={() => router.push('/elegir-asistente')}
      />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  micAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 15,
    backgroundColor: 'rgba(21,39,67,0.67)',
    paddingHorizontal: 14,
  },
  micIcon: { fontSize: 19 },
  micLabel: { fontSize: 13, fontWeight: '800' },
  micError: { fontSize: 12, lineHeight: 18 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 3 },
  historyLabel: { fontSize: 11, flexShrink: 1 },
  message: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(13,29,52,0.70)',
  },
  messageTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  voiceToggle: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voiceIcon: {
    fontSize: 21,
  },
  voiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  voiceTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  voiceHint: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  quick: {
    flexGrow: 1,
    flexBasis: 210,
    minHeight: 46,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(21,39,67,0.60)',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '800',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(10,26,45,0.52)',
  },
  privacyIcon: {
    color: '#79E9FF',
    fontSize: 13,
    marginTop: 2,
  },
  privacyText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  empty: {
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
