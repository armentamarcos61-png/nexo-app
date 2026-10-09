import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AssistantStage } from '@/components/assistant-stage';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import {
  classifyAssistantQuestion,
  recordAssistantQuestionMetric,
  type AssistantMetric,
} from '@/lib/assistant-analytics';
import { speakAsAssistant, stopAssistantSpeech } from '@/lib/assistant-speech';
import { useAssistant } from '@/state/assistant';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

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
      return 'Puedes cambiar entre Nexa y Nexo desde Mi espacio. Los dos tienen las mismas capacidades; cambia su estilo y personalidad.';

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
      return 'Esta pregunta todavía no está dentro de mis respuestas específicas. La registraré únicamente como una categoría anónima para ayudarnos a detectar qué parte de Nexo necesita una mejor explicación. No guardo el texto completo de tu pregunta.';
  }
}

export default function AsistenteScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { assistant } = useAssistant();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(
    assistant?.greeting ?? 'Primero elige tu asistente para comenzar.'
  );
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    return () => {
      void stopAssistantSpeech();
    };
  }, []);

  function respond(value: string) {
    if (!assistant) {
      router.push('/elegir-asistente');
      return;
    }

    const metric = classifyAssistantQuestion(value);
    const next = localAnswer(metric, assistant.name);
    const section =
      typeof params.from === 'string' && params.from.startsWith('/')
        ? params.from
        : '/asistente';

    void recordAssistantQuestionMetric({
      intentKey: metric.intentKey,
      resolved: metric.resolved,
      assistantId: assistant.id,
      section,
    });

    setAnswer(next);
    setQuestion('');

    if (voiceEnabled) {
      setSpeaking(true);
      void speakAsAssistant(next, assistant.id, {
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    } else {
      setSpeaking(false);
    }
  }

  if (!assistant) {
    return (
      <NexoScreen title="Asistente Nexo">
        <Text style={[styles.empty, { color: palette.text }]}>
          Aún no has elegido entre Nexa y Nexo.
        </Text>
        <Action label="Elegir asistente" onPress={() => router.push('/elegir-asistente')} />
      </NexoScreen>
    );
  }

  return (
    <NexoScreen title={'Asistente · ' + assistant.name}>
      <View style={styles.hero}>
        <LinearGradient
          pointerEvents="none"
          colors={
            assistant.id === 'nexa'
              ? ['rgba(91,44,145,0.96)', 'rgba(55,27,100,0.95)', 'rgba(24,34,70,0.94)']
              : ['rgba(24,82,156,0.96)', 'rgba(18,58,116,0.95)', 'rgba(13,39,83,0.94)']
          }
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.heroCopy}>
          <Text style={styles.name}>{assistant.name}</Text>
          <Text style={styles.role}>{assistant.genderLabel} · {assistant.roleLabel}</Text>
          <Text style={styles.scope}>
            Ayuda limitada al funcionamiento y contenido de Nexo.
          </Text>
          {params.from ? (
            <Text style={styles.context}>Sección actual: {String(params.from)}</Text>
          ) : null}
        </View>
      </View>

      <AssistantStage key={assistant.id} profile={assistant} speaking={speaking} />

      <View style={[styles.message, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.messageTitle, { color: palette.title }]}>
          {speaking ? assistant.name + ' está hablando…' : assistant.name}
        </Text>
        <Text style={[styles.messageText, { color: palette.text }]}>{answer}</Text>
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

      <Field
        label="Tu pregunta sobre Nexo"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ej. ¿Cómo publico un producto?"
        maxLength={300}
        onSubmitEditing={() => respond(question)}
      />
      <Action label="Preguntar" onPress={() => respond(question)} disabled={!question.trim()} />

      <View style={[styles.privacy, { borderColor: palette.cardBorder }]}>
        <Text style={styles.privacyIcon}>◉</Text>
        <Text style={[styles.privacyText, { color: palette.muted }]}>
          Para mejorar Nexo sólo se registra la categoría anónima de la pregunta, la sección y si pude resolverla. No se envía ni se guarda el texto completo que escribiste.
        </Text>
      </View>

      <Action
        label="Cambiar de asistente"
        secondary
        onPress={() => router.push('/elegir-asistente')}
      />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 117,
    borderRadius: 26,
    padding: 19,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(150,194,255,0.40)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(61,49,132,0.95)',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
  },
  role: {
    color: '#AEEBFF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  scope: {
    color: '#D6DFF4',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  context: {
    color: '#9DACCB',
    fontSize: 10,
    marginTop: 7,
  },
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
