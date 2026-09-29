import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, NexoScreen } from '@/components/nexo-screen';
import {
  appearanceOptions,
  getAppearancePalette,
  useAppearance,
  type AppearanceMode,
} from '@/state/appearance';

export default function PerfilScreen() {
  const { mode, setMode } = useAppearance();
  const palette = getAppearancePalette(mode);

  function chooseAppearance(next: AppearanceMode) {
    setMode(next);
  }

  return (
    <NexoScreen title="Mi espacio">
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.title }]}>Apariencia</Text>
        <Text style={[styles.sectionText, { color: palette.text }]}>
          Elige cómo quieres ver Nexo. La preferencia se guarda en este dispositivo.
        </Text>

        <View style={styles.appearanceGrid}>
          {appearanceOptions.map((option) => {
            const selected = mode === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => chooseAppearance(option.key)}
                style={({ pressed }) => [
                  styles.appearanceCard,
                  {
                    borderColor: selected ? '#76E7FF' : palette.cardBorder,
                    backgroundColor:
                      mode === 'claro'
                        ? 'rgba(255,255,255,0.88)'
                        : 'rgba(17,28,49,0.84)',
                  },
                  selected && styles.appearanceSelected,
                  pressed && styles.pressed,
                ]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={
                    option.key === 'claro'
                      ? ['#FFFFFF', '#EDF4FF', '#F8F1FF']
                      : option.key === 'oscuro'
                        ? ['#06080D', '#111622', '#1B1726']
                        : ['#124D77', '#573F9B', '#A33B99']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.preview}
                >
                  <Text style={styles.previewIcon}>{option.icon}</Text>
                  <View style={styles.previewLine} />
                  <View style={[styles.previewLine, styles.previewLineShort]} />
                </LinearGradient>

                <View style={styles.appearanceCopy}>
                  <View style={styles.appearanceTitleRow}>
                    <Text style={[styles.appearanceTitle, { color: palette.title }]}>
                      {option.label}
                    </Text>
                    {selected && <Text style={styles.check}>✓</Text>}
                  </View>
                  <Text style={[styles.appearanceText, { color: palette.text }]}>
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.title }]}>Actividad</Text>
        <Text style={[styles.sectionText, { color: palette.text }]}>
          Prepara tus necesidades, servicios y productos. Las cuentas completas llegarán en una etapa posterior.
        </Text>
      </View>

      <Action label="Mis borradores" onPress={() => router.push('/borradores')} />
      <Action label="Ofrezco un servicio" secondary onPress={() => router.push('/publicar/servicio')} />
      <Action label="Vendo un producto" secondary onPress={() => router.push('/publicar/producto')} />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 21,
  },
  appearanceGrid: {
    gap: 10,
    marginTop: 4,
  },
  appearanceCard: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
  },
  appearanceSelected: {
    borderWidth: 2,
    boxShadow: '0 10px 24px rgba(71,178,255,0.22)',
  },
  preview: {
    width: 86,
    height: 70,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
  },
  previewIcon: {
    position: 'absolute',
    top: 8,
    right: 9,
    fontSize: 17,
  },
  previewLine: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.74)',
    marginTop: 5,
  },
  previewLineShort: {
    width: '62%',
    opacity: 0.65,
  },
  appearanceCopy: {
    flex: 1,
    gap: 4,
  },
  appearanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appearanceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  appearanceText: {
    fontSize: 12,
    lineHeight: 17,
  },
  check: {
    color: '#73ECFF',
    fontSize: 18,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
});
