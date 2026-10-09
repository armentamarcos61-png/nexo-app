import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, NexoScreen } from '@/components/nexo-screen';
import { AssistantStage } from '@/components/assistant-stage';
import { assistantProfiles, useAssistant } from '@/state/assistant';
import { speakAsAssistant, stopAssistantSpeech } from '@/lib/assistant-speech';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

// Nexa is the only selectable assistant for now.
// Her 2D image is a loading fallback INSIDE the same 3D stage, never
// a second card or a second assistant. Nexo can be developed later.
const nexa = assistantProfiles.nexa;

export default function ElegirAsistenteScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { selectAssistant } = useAssistant();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => { void stopAssistantSpeech(); }, []);

  function previewVoice() {
    setSpeaking(true);
    void speakAsAssistant(nexa.greeting, nexa.id, {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  function confirm() {
    void stopAssistantSpeech();
    selectAssistant('nexa');
    router.replace('/asistente');
  }

  return (
    <NexoScreen title="Conoce a Nexa">
      <View style={[styles.intro, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.heading, { color: palette.title }]}>
          Tu asistente personal de Nexo
        </Text>
        <Text style={[styles.description, { color: palette.text }]}>
          Una sola Nexa, con voz, movimientos y una presencia 3D.
          Te ayuda a conocer las funciones de la aplicación, encontrar
          servicios, buscar empleo y publicar productos.
        </Text>
      </View>

      <AssistantStage profile={nexa} speaking={speaking} />

      <View style={[styles.details, { borderColor: palette.cardBorder }]}>
        <View style={styles.identityRow}>
          <View style={styles.onlineDot} />
          <Text style={[styles.identity, { color: palette.title }]}>Nexa · Asistente virtual</Text>
        </View>
        <Text style={[styles.description, { color: palette.text }]}>
          Cálida, clara y profesional. Su imagen de respaldo y el modelo
          tridimensional representan al mismo personaje, nunca dos asistentes distintos.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Escuchar la voz de Nexa"
        onPress={previewVoice}
        style={({ pressed }) => [styles.voice, pressed && styles.pressed]}
      >
        <Text style={styles.voiceText}>{speaking ? '🔊 Nexa está hablando…' : '🔊 Escuchar a Nexa'}</Text>
      </Pressable>

      <Action label="Continuar con Nexa" onPress={confirm} />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    borderRadius: 23, borderWidth: 1, padding: 17, gap: 8,
    backgroundColor: 'rgba(30,35,75,0.55)',
  },
  heading: { fontSize: 19, fontWeight: '900', lineHeight: 26 },
  description: { fontSize: 13, lineHeight: 20 },
  details: {
    borderRadius: 20, borderWidth: 1, padding: 15, gap: 8,
    backgroundColor: 'rgba(15,26,52,0.48)',
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: '#75E7B1' },
  identity: { fontSize: 15, fontWeight: '900' },
  voice: {
    minHeight: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(120,198,255,0.55)',
    backgroundColor: 'rgba(52,77,137,0.47)',
  },
  voiceText: { fontSize: 14, fontWeight: '900', color: '#E4EEFF' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
});
