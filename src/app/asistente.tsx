import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AssistantStage } from '@/components/assistant-stage';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import {
  classifyAssistantQuestion,
  recordAssistantQuestionMetric,
} from '@/lib/assistant-analytics';
import {
  getAssistantVoiceChoice, listAssistantVoices, previewAssistantVoice,
  setAssistantVoiceChoice, speakAsAssistant, stopAssistantSpeech,
  type AssistantVoiceOption,
} from '@/lib/assistant-speech';
import { useAssistant } from '@/state/assistant';
import { useAuth } from '@/state/auth';
import { clearNexaHistory, readNexaHistory, recallNexaNote, rememberNexaConversation, type NexaReply, type NexaSource } from '@/lib/nexa-knowledge';
import { answerVerifiedNexoQuestion, auditNexoKnowledge, refreshNexoKnowledge } from '@/lib/nexo-product-knowledge';
import { reviewNexoAnswer } from '@/lib/assistant-answer-review';
import { newAnswerFeedbackId, sendAssistantFeedback,
 type AssistantAnswerFeedback, type FeedbackVote } from '@/lib/nexo-assistant-feedback';
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
  const [knowledgeReviewed, setKnowledgeReviewed] = useState('');
  const requestId = useRef(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceOptions, setVoiceOptions] = useState<AssistantVoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string|null>(null);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [feedbackRecord,setFeedbackRecord]=useState<AssistantAnswerFeedback|null>(null);
  const [feedbackVote,setFeedbackVote]=useState<'up'|'down'|null>(null);
  const [feedbackComment,setFeedbackComment]=useState('');
  const [feedbackOpen,setFeedbackOpen]=useState(false);
  const [feedbackSharing,setFeedbackSharing]=useState(false);
  const [feedbackSaving,setFeedbackSaving]=useState(false);
  const [feedbackNotice,setFeedbackNotice]=useState('');
  const [feedbackError,setFeedbackError]=useState('');
  const recognizerRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    if (!assistant)return;
    let active=true;
    setSelectedVoice(getAssistantVoiceChoice(assistant.id));
    setVoiceOptions([]);
    setVoicesLoading(true);
    void listAssistantVoices(assistant.id).then(options=>{
      if(active)setVoiceOptions(options);
    }).catch(()=>{
      if(active)setVoiceOptions([]);
    }).finally(()=>{
      if(active)setVoicesLoading(false);
    });
    return ()=>{active=false;};
  },[assistant?.id]);

  function refreshVoiceChoices(){
    if(!assistant)return;
    setVoicesLoading(true);
    void listAssistantVoices(assistant.id).then(setVoiceOptions)
      .catch(()=>setVoiceOptions([]))
      .finally(()=>setVoicesLoading(false));
  }
  function testVoice(identifier:string|null){
    if(!assistant)return;
    setAssistantVoiceChoice(assistant.id,identifier);
    setSelectedVoice(identifier);
    setVoiceEnabled(true);
    const spoken=assistant.id==='nexa'
      ?'Hola, soy Nexa. Bienvenido a Nexo. Estoy aquí para ayudarte con lo que necesites.'
      :'Hola, soy Nexo. Puedo ayudarte a encontrar trabajo, servicios y productos.';
    setSpokenText(spoken);
    void previewAssistantVoice(assistant.id,{
      onStart:()=>setSpeaking(true),
      onDone:()=>setSpeaking(false),
      onStopped:()=>setSpeaking(false),
      onError:()=>setSpeaking(false),
    });
  }

  // Autonomous refresh: check the approved Nexo capability manifest when the
  // screen opens, once an hour while in use, and whenever the tab is restored.
  // No user message is needed, and no private chat is uploaded.
  useEffect(() => {
    let mounted=true;
    const review=()=>{void refreshNexoKnowledge().then(next=>{
      if(mounted)setKnowledgeReviewed(next.generatedAt);
    }).catch(()=>{});};
    review();
    const handle=setInterval(review,60*60*1000);
    const onVisible=()=>{if(typeof document!=='undefined'&&!document.hidden)review();};
    if(typeof document!=='undefined')
      document.addEventListener('visibilitychange',onVisible);
    return ()=>{
      mounted=false;
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

  async function saveFeedback(vote:FeedbackVote,fromModal=false){
    if(!feedbackRecord||feedbackSaving)return;
    const comment=feedbackComment.trim();
    if(vote==='comment'&&!comment){
      setFeedbackError('Escribe primero tu comentario.');
      return;
    }
    setFeedbackSaving(true);
    setFeedbackError('');
    setFeedbackNotice('');
    try{
      await sendAssistantFeedback(feedbackRecord,{
        rating:vote,comment,includeContext:feedbackSharing,
      });
      setFeedbackVote(vote==='comment'?null:vote);
      setFeedbackNotice(comment?'Comentario recibido. Gracias por ayudar a mejorar Nexo.'
        :vote==='up'?'Gracias. Registramos que esta respuesta te ayudó.'
        :'Gracias. Registramos que esta respuesta necesita mejorar.');
      if(fromModal)setFeedbackOpen(false);
    }catch(e){
      setFeedbackError(e instanceof Error?e.message:'No se pudo enviar. Intenta otra vez.');
    }finally{setFeedbackSaving(false);}
  }

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
    setFeedbackRecord(null);
    setFeedbackVote(null);
    setFeedbackComment('');
    setFeedbackSharing(false);
    setFeedbackOpen(false);
    setFeedbackNotice('');
    setFeedbackError('');
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
        const candidate=answerVerifiedNexoQuestion(questionText,metric.intentKey);
        // Self-review exact intent, source-backed status and next step BEFORE
        // any answer appears on screen or is spoken by Nexo/Nexa.
        const checked=reviewNexoAnswer(questionText,candidate);
        evaluated=checked.reviewedAnswer;
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
    setFeedbackRecord({
      responseId:newAnswerFeedbackId(),
      assistantId:assistant.id,
      intentKey:metric.intentKey,
      question:questionText,
      answer:reply.text,
    });
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
        {feedbackRecord&&!pending&&(
          <View style={styles.feedbackArea}>
            <Text style={[styles.feedbackPrompt,{color:palette.muted}]}>
              ¿Te sirvió esta respuesta?
            </Text>
            <View style={styles.feedbackActions}>
              <Pressable accessibilityRole="button"
                accessibilityLabel="Me gustó esta respuesta"
                accessibilityState={{selected:feedbackVote==='up',disabled:feedbackSaving}}
                disabled={feedbackSaving}
                onPress={()=>void saveFeedback('up')}
                style={[styles.feedbackButton,feedbackVote==='up'&&styles.feedbackSelected,
                  {borderColor:feedbackVote==='up'?assistant.secondaryAccent:palette.cardBorder}]}>
                <Text style={styles.feedbackButtonText}>👍 Me gustó</Text>
              </Pressable>
              <Pressable accessibilityRole="button"
                accessibilityLabel="Esta respuesta no me gustó"
                accessibilityState={{selected:feedbackVote==='down',disabled:feedbackSaving}}
                disabled={feedbackSaving}
                onPress={()=>void saveFeedback('down')}
                style={[styles.feedbackButton,feedbackVote==='down'&&styles.feedbackSelected,
                  {borderColor:feedbackVote==='down'?assistant.secondaryAccent:palette.cardBorder}]}>
                <Text style={styles.feedbackButtonText}>👎 No me gustó</Text>
              </Pressable>
              <Pressable accessibilityRole="button"
                accessibilityLabel="Escribir un comentario sobre la respuesta"
                onPress={()=>{setFeedbackError('');setFeedbackOpen(true);}}
                style={[styles.feedbackButton,{borderColor:palette.cardBorder}]}>
                <Text style={styles.feedbackButtonText}>✎ Comentar</Text>
              </Pressable>
            </View>
            {!!feedbackNotice&&(
              <Text accessibilityRole="text" style={styles.feedbackSuccess}>{feedbackNotice}</Text>
            )}
            {!!feedbackError&&(
              <Text accessibilityRole="alert" style={styles.feedbackFailure}>{feedbackError}</Text>
            )}
          </View>
        )}
      </View>

      <Modal visible={feedbackOpen&&!!feedbackRecord} animationType="fade"
        transparent onRequestClose={()=>setFeedbackOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}
          style={styles.feedbackModalBackdrop}>
          <View style={styles.feedbackModalCard}>
            <Text style={styles.feedbackModalTitle}>Ayúdanos a mejorar la respuesta</Text>
            <Text style={styles.feedbackModalCaption}>
              Tu comentario llegará al panel privado del equipo desarrollador.
              Puedes explicar qué información faltó o qué deberíamos corregir.
            </Text>
            <TextInput
              accessibilityLabel="Comentario sobre la respuesta"
              placeholder="Ejemplo: Me faltó saber dónde está el botón para publicar..."
              placeholderTextColor="#617086"
              multiline
              maxLength={1200}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              style={styles.feedbackTextarea}
              textAlignVertical="top"
            />
            <Text style={styles.feedbackCharacterCount}>{feedbackComment.length}/1200</Text>
            <Pressable accessibilityRole="checkbox"
              accessibilityState={{checked:feedbackSharing}}
              onPress={()=>setFeedbackSharing(v=>!v)}
              style={styles.feedbackConsent}>
              <Text style={[styles.feedbackConsentCheck,feedbackSharing&&styles.feedbackConsentActive]}>
                {feedbackSharing?'✓':'□'}
              </Text>
              <Text style={styles.feedbackConsentText}>
                También compartir mi pregunta y la respuesta con los desarrolladores
                para que puedan revisar el contexto.
              </Text>
            </Pressable>
            <Text style={styles.feedbackPrivacy}>
              Si no activas la casilla, solo enviaremos tu valoración, comentario y
              la categoría de la pregunta, no el texto de la conversación.
              No escribas contraseñas, códigos ni datos bancarios en el comentario.
            </Text>
            {!!feedbackError&&<Text accessibilityRole="alert" style={styles.feedbackFailure}>
              {feedbackError}
            </Text>}
            <View style={styles.feedbackModalActions}>
              <Pressable onPress={()=>setFeedbackOpen(false)}
                accessibilityRole="button" style={styles.feedbackCancel}>
                <Text style={styles.feedbackCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable accessibilityRole="button"
                disabled={feedbackSaving||!feedbackComment.trim()}
                onPress={()=>void saveFeedback(feedbackVote||'comment',true)}
                style={[styles.feedbackSend,
                  (feedbackSaving||!feedbackComment.trim())&&{opacity:.55}]}>
                <Text style={styles.feedbackSendText}>
                  {feedbackSaving?'Enviando…':'Enviar comentario'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Text style={{fontSize:11,lineHeight:17,color:palette.muted,textAlign:'center'}}>
        Conocimiento de Nexo: {knowledgeReviewed
          ? 'verificado con el código · actualizado '+new Date(knowledgeReviewed).toLocaleDateString('es-MX')
          : 'consultando la versión verificada…'}.
      </Text>
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
            {assistant.name} usa una voz en español. Puedes probar opciones gratis y elegir la que más te guste.
          </Text>
        </View>
      </Pressable>

      <View style={[styles.voicePicker,{borderColor:palette.cardBorder}]}>
        <Pressable accessibilityRole="button"
          onPress={()=>{
            setVoicesOpen(value=>!value);
            if(!voicesOpen)refreshVoiceChoices();
          }}
          style={styles.voicePickerHeader}>
          <Text style={{fontSize:18}}>🎧</Text>
          <View style={{flex:1,gap:3}}>
            <Text style={{fontWeight:'900',fontSize:13,color:palette.title}}>
              Elegir y probar voz gratis
            </Text>
            <Text style={{fontSize:11,color:palette.muted}}>
              {selectedVoice
                ?voiceOptions.find(x=>x.identifier===selectedVoice)?.name||'Voz elegida (no instalada aquí)'
                :'Selección automática de la mejor voz en español'}
            </Text>
          </View>
          <Text style={{fontSize:18,fontWeight:'800',color:palette.title}}>
            {voicesOpen?'⌃':'⌄'}
          </Text>
        </Pressable>
        {voicesOpen && (
          <View style={styles.voicePickerBody}>
            <Text style={{fontSize:11,lineHeight:17,color:palette.muted}}>
              Sin suscripciones ni pagos por respuesta. Estas voces dependen de las
              instaladas en tu teléfono o navegador. Prueba y escucha antes de elegir.
            </Text>
            <Pressable accessibilityRole="button"
              onPress={()=>testVoice(null)}
              style={[styles.voiceOption,{
                borderColor:!selectedVoice?assistant.secondaryAccent:palette.cardBorder,
                backgroundColor:!selectedVoice?'rgba(52,92,147,.43)':'rgba(20,37,65,.65)',
              }]}>
              <Text style={{fontSize:13,fontWeight:'800',color:palette.title}}>
                {!selectedVoice?'✓  ':''}Automática · Gratis
              </Text>
              <Text style={{color:palette.muted,fontSize:10}}>
                Tocar para escuchar con {assistant.name}
              </Text>
            </Pressable>
            {voiceOptions.slice(0,7).map(option=>(
              <Pressable key={option.identifier}
                accessibilityRole="button"
                onPress={()=>testVoice(option.identifier)}
                style={[styles.voiceOption,{
                  borderColor:selectedVoice===option.identifier?assistant.secondaryAccent:palette.cardBorder,
                  backgroundColor:selectedVoice===option.identifier
                    ?'rgba(52,92,147,.43)':'rgba(20,37,65,.65)',
                }]}>
                <Text style={{fontWeight:'800',fontSize:12,color:palette.title}}>
                  {selectedVoice===option.identifier?'✓  ':''}{option.name}
                  {option.recommended?' · Recomendada':''}
                </Text>
                <Text style={{color:palette.muted,fontSize:10}}>
                  {option.language}{option.quality==='Enhanced'?' · Calidad mejorada':''}
                  {' · Toca para escuchar'}
                </Text>
              </Pressable>
            ))}
            {!voicesLoading&&voiceOptions.length===0&&(
              <Text style={{fontSize:11,lineHeight:17,color:palette.muted}}>
                El navegador todavía no ha proporcionado voces españolas.
                Prueba «Actualizar voces» o instala una voz española desde
                los ajustes de síntesis de voz de tu dispositivo.
              </Text>
            )}
            <Pressable accessibilityRole="button"
              onPress={refreshVoiceChoices}
              style={{paddingVertical:10,alignItems:'center'}}>
              <Text style={{fontWeight:'800',color:assistant.secondaryAccent,fontSize:12}}>
                {voicesLoading?'Buscando voces…':'↻ Actualizar voces disponibles'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

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
  feedbackArea:{marginTop:14,paddingTop:14,borderTopWidth:1,
    borderTopColor:'rgba(139,178,216,.24)',gap:9},
  feedbackPrompt:{fontSize:12,fontWeight:'800'},
  feedbackActions:{flexDirection:'row',gap:7,flexWrap:'wrap'},
  feedbackButton:{borderWidth:1,borderRadius:12,minHeight:40,
    paddingVertical:9,paddingHorizontal:11,
    backgroundColor:'rgba(39,61,100,.45)',justifyContent:'center'},
  feedbackSelected:{backgroundColor:'rgba(47,124,171,.38)'},
  feedbackButtonText:{color:'#F5FAFF',fontSize:11,fontWeight:'800'},
  feedbackSuccess:{color:'#81F1CA',fontWeight:'800',fontSize:11,lineHeight:17},
  feedbackFailure:{color:'#FFB2BD',fontWeight:'800',fontSize:11,lineHeight:17},
  feedbackModalBackdrop:{flex:1,backgroundColor:'rgba(2,9,25,.80)',
    justifyContent:'center',paddingHorizontal:18},
  feedbackModalCard:{backgroundColor:'#132541',borderRadius:22,padding:19,
    borderWidth:1,borderColor:'#43658E',gap:11,maxWidth:520,width:'100%',alignSelf:'center'},
  feedbackModalTitle:{fontSize:19,fontWeight:'900',color:'#F6FBFF'},
  feedbackModalCaption:{fontSize:12,lineHeight:19,color:'#C7D9ED'},
  feedbackTextarea:{backgroundColor:'#F1F7FF',color:'#0E1F36',fontSize:15,
    minHeight:130,maxHeight:235,borderRadius:13,padding:13,fontWeight:'600'},
  feedbackCharacterCount:{alignSelf:'flex-end',fontSize:10,color:'#D3E2F2'},
  feedbackConsent:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingVertical:4},
  feedbackConsentCheck:{fontSize:20,color:'#E3F0FF',lineHeight:24},
  feedbackConsentActive:{color:'#7AE7F6'},
  feedbackConsentText:{flex:1,fontSize:11,lineHeight:18,color:'#E2F0FF'},
  feedbackPrivacy:{fontSize:10,lineHeight:16,color:'#ACC8E1'},
  feedbackModalActions:{flexDirection:'row',justifyContent:'flex-end',gap:10},
  feedbackCancel:{borderWidth:1,borderColor:'#6B819A',borderRadius:11,
    paddingVertical:11,paddingHorizontal:14},
  feedbackCancelText:{color:'#E9F1FC',fontWeight:'800'},
  feedbackSend:{borderRadius:11,backgroundColor:'#7FE5F2',
    paddingVertical:11,paddingHorizontal:14},
  feedbackSendText:{color:'#06263C',fontWeight:'900'},

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
  voicePicker:{
    borderRadius:17,
    borderWidth:1,
    backgroundColor:'rgba(9,27,53,.73)',
    overflow:'hidden',
  },
  voicePickerHeader:{
    minHeight:64,
    flexDirection:'row',
    alignItems:'center',
    paddingHorizontal:14,
    paddingVertical:10,
    gap:11,
  },
  voicePickerBody:{
    borderTopWidth:1,
    borderTopColor:'rgba(142,190,242,.18)',
    gap:8,
    padding:13,
  },
  voiceOption:{
    borderWidth:1,
    borderRadius:12,
    paddingHorizontal:12,
    paddingVertical:11,
    gap:4,
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
