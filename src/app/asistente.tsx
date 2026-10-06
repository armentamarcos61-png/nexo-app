import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AssistantAvatar } from '@/components/assistant-avatar';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { useAssistant } from '@/state/assistant';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

const quickQuestions = [
  '¿Cómo funciona Nexo?',
  '¿Cómo publico una vacante?',
  '¿Cómo publico un servicio?',
  '¿Cómo cambio de asistente?',
] as const;

function localAnswer(question: string, assistantName: string) {
  const normalized = question.trim().toLowerCase();

  if (!normalized) return 'Escribe una duda sobre Nexo y te oriento.';

  if (normalized.includes('vacante') || normalized.includes('empleo')) {
    return 'En Nexo puedes publicar una vacante desde Publicar y elegir la opción de empleo. Después completas puesto, descripción, horario, rango de pago y datos necesarios para que otras personas puedan postularse.';
  }

  if (normalized.includes('servicio')) {
    return 'Para ofrecer o contratar un servicio, entra a Servicios o usa Publicar. Nexo separa claramente quién ofrece y quién busca contratar para mostrarte el flujo correcto.';
  }

  if (normalized.includes('producto')) {
    return 'En Productos puedes explorar publicaciones o tocar Publicar producto para crear la tuya. La búsqueda te ayuda a encontrar lo que necesitas por nombre o categoría.';
  }

  if (normalized.includes('cambiar') && normalized.includes('asistente')) {
    return 'Puedes cambiar entre Nexa y Nexo desde Mi espacio. Tu preferencia queda guardada para que no tengas que elegir cada vez que entras.';
  }

  if (normalized.includes('funciona') || normalized.includes('nexo') || normalized.includes('ayuda')) {
    return 'Soy ' + assistantName + '. Mi función es ayudarte con Nexo: empleos, trabajadores, servicios, productos, perfil, publicaciones, cuenta y el funcionamiento de la aplicación.';
  }

  if (
    normalized.includes('contraseña') ||
    normalized.includes('correo') ||
    normalized.includes('cuenta') ||
    normalized.includes('perfil')
  ) {
    return 'Puedo orientarte con tu cuenta, perfil y recuperación de acceso dentro de Nexo. No mostraré contraseñas ni información sensible.';
  }

  return 'Mi ayuda está enfocada únicamente en Nexo. Puedo explicarte funciones de la app, empleos, servicios, productos, publicaciones, perfil, cuenta y procesos dentro de la plataforma.';
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (assistant) setAnswer(assistant.greeting);
  }, [assistant]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function respond(value: string) {
    if (!assistant) {
      router.push('/elegir-asistente');
      return;
    }

    const next = localAnswer(value, assistant.name);
    setAnswer(next);
    setQuestion('');
    setSpeaking(true);

    if (timer.current) clearTimeout(timer.current);
    const duration = Math.min(3600, Math.max(1300, next.length * 18));
    timer.current = setTimeout(() => setSpeaking(false), duration);
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
          colors={['rgba(35,67,119,0.96)', 'rgba(72,48,124,0.95)', 'rgba(14,63,77,0.94)']}
          style={StyleSheet.absoluteFill}
        />
        <AssistantAvatar profile={assistant} size={118} speaking={speaking} />
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

      <View style={[styles.message, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.messageTitle, { color: palette.title }]}>
          {speaking ? assistant.name + ' está hablando…' : assistant.name}
        </Text>
        <Text style={[styles.messageText, { color: palette.text }]}>{answer}</Text>
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

      <Field
        label="Tu pregunta sobre Nexo"
        value={question}
        onChangeText={setQuestion}
        placeholder="Ej. ¿Cómo publico un producto?"
        maxLength={300}
        onSubmitEditing={() => respond(question)}
      />
      <Action label="Preguntar" onPress={() => respond(question)} disabled={!question.trim()} />
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
    minHeight: 180,
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
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
  empty: {
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
