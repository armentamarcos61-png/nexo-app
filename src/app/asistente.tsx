import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AssistantStage } from '@/components/assistant-stage';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import {
  classifyAssistantQuestion,
  recordAssistantQuestionMetric,
} from '@/lib/assistant-analytics';
import { speakAsAssistant, stopAssistantSpeech } from '@/lib/assistant-speech';
import { useAssistant } from '@/state/assistant';
import { useAuth } from '@/state/auth';
import { clearNexaHistory, readNexaHistory, recallNexaNote, rememberNexaConversation, type NexaReply, type NexaSource } from '@/lib/nexa-knowledge';
import { answerVerifiedNexoQuestion, auditNexoKnowledge, refreshNexoKnowledge } from '@/lib/nexo-product-knowledge';
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
  const [historyCount, setHistoryCount] = useState(() => readNexaHistory(user?.id).length);
  const requestId = useRef(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const recognizerRef = useRef<BrowserSpeechRecognition | null>(null);

  // Autonomous refresh: check the approved Nexo capability manifest when the
  // screen opens, once an hour while in use, and whenever the tab is restored.
  // No user message is needed, and no private chat is uploaded.
  useEffect(() => {
    void refreshNexoKnowledge();
    const handle=setInterval(()=>{void refreshNexoKnowledge();},60*60*1000);
    const onVisible=()=>{if(typeof document!=='undefined'&&!document.hidden)
      void refreshNexoKnowledge();};
    if(typeof document!=='undefined')
      document.addEventListener('visibilitychange',onVisible);
    return ()=>{
      clearInterval(handle);
      if(typeof document!=='undefined')
        document.removeEventListener('visibilitychange',onVisible);
    };
  }, []);

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

    let evaluated = null as ReturnType<typeof answerVerifiedNexoQuestion>|null;

    try {
      if (remembering) {
        reply = {text:'Guardaré esa nota únicamente en el historial de este navegador. Esto no cambia las funciones oficiales de Nexo, y puedes borrar el historial cuando quieras.',sources:[],online:false};
      } else if (askingHistory) {
        const recent=historic.slice(-5).map(item=>item.question).reverse();
        reply={text:recent.length
          ? 'Tus últimas preguntas guardadas en este navegador: '+recent.join(' · ')
          : 'Aún no hay preguntas guardadas en este navegador.',
          sources:[],online:false};
      } else if (/(?:que recuerdas sobre|recuerdas lo que te dije|que te pedi recordar)/i.test(questionText)) {
        reply=recallNexaNote(questionText,user?.id)||{
          text:'No encontré una nota tuya sobre ese tema en el historial local.',
          sources:[],online:false};
      } else {
        // The self-check runs BEFORE composing the answer. Unknown features
        // never fall through to Wikipedia or to old, unverified chat snippets.
        await refreshNexoKnowledge();
        evaluated=answerVerifiedNexoQuestion(questionText,metric.intentKey);
        auditNexoKnowledge(evaluated);
        reply={text:evaluated.text,sources:[],online:false};
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
      resolved: (evaluated?.verified ?? false) || remembering || askingHistory,
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
          Todavía no has elegido entre Nexa y Nexo.
        </Text>
        <Action label="Elegir Nexa o Nexo" onPress={() => router.push('/elegir-asistente')} />
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
        <Text style={[styles.messageText, { color: palette.text }]}>{pending ? 'Comprobando funciones y preparando la respuesta…' : answer}</Text>
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
          accessibilityLabel={listening ? 'Detener dictado' : 'Preguntarle por voz a '+assistant.name}
          onPress={toggleDictation}
          style={({ pressed }) => [
            styles.micAction,
            { borderColor: listening ? '#79E9FF' : palette.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.micIcon}>{listening ? '⏹' : '🎙️'}</Text>
          <Text style={[styles.micLabel, { color: palette.title }]}>
            {listening ? 'Escuchando… toca para detener' : 'Hablar con '+assistant.name}
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

      <View style={[styles.privacy, { borderColor: palette.cardBorder }]}>
        <Text style={styles.privacyIcon}>◉</Text>
        <Text style={[styles.privacyText, { color: palette.muted }]}>
          Nexo y Nexa responden sobre la aplicación usando su catálogo verificado, que se actualiza desde los cambios del código incluso sin recibir preguntas. Distinguen funciones disponibles de funciones planeadas; nunca convierten respuestas anteriores en hechos ni buscan definiciones genéricas de Internet para explicar Nexo. El historial y las notas permanecen en este navegador, no se sincronizan entre dispositivos y puedes borrarlos arriba. La comprobación local registra solo categorías, no tus preguntas. Las métricas externas se agrupan por categoría. El dictado puede procesarse mediante el proveedor del navegador. Nunca compartas contraseñas ni información sensible.
        </Text>
      </View>

      <Action
        label="Cambiar entre Nexa y Nexo"
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
