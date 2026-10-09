import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, NexoScreen } from '@/components/nexo-screen';
import { AssistantAvatar } from '@/components/assistant-avatar';
import { AssistantStage } from '@/components/assistant-stage';
import {
  assistantProfiles,
  useAssistant,
  type AssistantId,
} from '@/state/assistant';
import { speakAsAssistant, stopAssistantSpeech } from '@/lib/assistant-speech';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

export default function ElegirAsistenteScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { assistantId, selectAssistant } = useAssistant();
  const [candidate, setCandidate] = useState<AssistantId>(assistantId ?? 'nexa');
  const [previewing, setPreviewing] = useState<AssistantId | null>(null);

  useEffect(() => {
    return () => {
      void stopAssistantSpeech();
    };
  }, []);

  function preview(id: AssistantId) {
    const item = assistantProfiles[id];
    setCandidate(id);
    setPreviewing(id);

    void speakAsAssistant(item.greeting, id, {
      onStart: () => setPreviewing(id),
      onDone: () => setPreviewing(null),
      onStopped: () => setPreviewing(null),
      onError: () => setPreviewing(null),
    });
  }

  function confirm() {
    selectAssistant(candidate);
    router.replace('/');
  }

  return (
    <NexoScreen title="Elige tu asistente">
      <View style={[styles.intro, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.introTitle, { color: palette.title }]}>
          ¿Con cuál te sientes más a gusto?
        </Text>
        <Text style={[styles.introText, { color: palette.text }]}>
          Los dos pueden ayudarte con las mismas funciones de Nexo. La diferencia es su estilo, presencia y personalidad. Puedes cambiar después cuando quieras.
        </Text>
      </View>

      <View style={styles.cards}>
        {(Object.keys(assistantProfiles) as AssistantId[]).map((id) => {
          const item = assistantProfiles[id];
          const selected = candidate === id;

          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCandidate(id)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: selected ? item.secondaryAccent : palette.cardBorder,
                  backgroundColor:
                    mode === 'claro' ? 'rgba(255,255,255,0.90)' : 'rgba(11,25,47,0.90)',
                },
                selected && styles.cardSelected,
                pressed && styles.pressed,
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={
                  id === 'nexa'
                    ? ['rgba(111,48,174,0.55)', 'rgba(82,38,138,0.34)', 'rgba(11,25,47,0.10)']
                    : ['rgba(24,86,164,0.58)', 'rgba(20,70,130,0.34)', 'rgba(11,25,47,0.10)']
                }
                style={StyleSheet.absoluteFill}
              />

              <AssistantAvatar
                profile={item}
                size={132}
                speaking={previewing === id}
                selected={selected}
              />

              <Text style={[styles.name, { color: palette.title }]}>{item.name}</Text>
              <Text style={[styles.gender, { color: item.secondaryAccent }]}>{item.genderLabel}</Text>
              <Text style={[styles.role, { color: palette.text }]}>{item.roleLabel}</Text>
              <Text style={[styles.description, { color: palette.text }]}>
                {id === 'nexa'
                  ? 'Cálida, serena y profesional. Una guía con presencia más humana y tranquila.'
                  : 'Cercano, seguro y práctico. Un guía con estilo de trabajador experto y confiable.'}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => preview(id)}
                style={({ pressed }) => [styles.previewButton, pressed && styles.pressed]}
              >
                <Text style={styles.previewButtonText}>
                  {previewing === id ? 'Hablando…' : 'Probar voz y movimiento'}
                </Text>
              </Pressable>

              {selected ? (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedText}>✓ Seleccionado</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <AssistantStage profile={assistantProfiles[candidate]} speaking={previewing === candidate} />

      <Text style={[styles.note, { color: palette.muted }]}>
        La elección no depende de tu género. Elige simplemente con quién te resulte más cómodo interactuar.
      </Text>

      <Action
        label={'Continuar con ' + assistantProfiles[candidate].name}
        onPress={confirm}
      />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    gap: 7,
    backgroundColor: 'rgba(24,44,76,0.48)',
  },
  introTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  introText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 260,
    minHeight: 360,
    borderRadius: 27,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(54,52,113,0.94)',
    boxShadow: '0 14px 30px rgba(0,0,0,0.26)',
  },
  cardSelected: {
    boxShadow: '0 14px 34px rgba(79,109,255,0.30)',
  },
  name: {
    marginTop: 13,
    fontSize: 26,
    fontWeight: '900',
  },
  gender: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '900',
  },
  role: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  previewButton: {
    marginTop: 14,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(28,48,83,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(131,181,255,0.42)',
  },
  previewButtonText: {
    color: '#DDEBFF',
    fontSize: 11,
    fontWeight: '900',
  },
  selectedPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(40,197,137,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(83,230,170,0.54)',
  },
  selectedText: {
    color: '#78F2BD',
    fontSize: 10,
    fontWeight: '900',
  },
  note: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
