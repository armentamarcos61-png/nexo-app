import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import {
  appearanceOptions,
  getAppearancePalette,
  useAppearance,
  type AppearanceMode,
} from '@/state/appearance';
import {
  availabilityOptions,
  educationOptions,
  experienceOptions,
  useProfessionalProfile,
  workModeOptions,
} from '@/state/professional-profile';

export default function PerfilScreen() {
  const { mode, setMode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { profile, updateField } = useProfessionalProfile();

  const completedFields = Object.values(profile).filter((value) => value.trim()).length;
  const totalFields = Object.keys(profile).length;
  const completion = Math.round((completedFields / totalFields) * 100);

  function chooseAppearance(next: AppearanceMode) {
    setMode(next);
  }

  function buscarTrabajo() {
    router.push({
      pathname: '/explorar',
      params: {
        intencion: 'empleo',
        q: profile.role.trim(),
      },
    });
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

      <View style={styles.profileHero}>
        <LinearGradient
          pointerEvents="none"
          colors={
            mode === 'claro'
              ? ['rgba(225,242,255,0.98)', 'rgba(236,229,255,0.98)', 'rgba(223,250,247,0.96)']
              : ['rgba(20,74,103,0.98)', 'rgba(64,47,118,0.98)', 'rgba(93,42,105,0.96)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroFill}
        />
        <View style={styles.profileHeroTop}>
          <View style={styles.profileHeroCopy}>
            <Text style={[styles.profileEyebrow, mode === 'claro' && styles.profileEyebrowLight]}>
              PERFIL PROFESIONAL · OPCIONAL
            </Text>
            <Text style={[styles.profileTitle, { color: palette.title }]}>
              Haz que Nexo entienda mejor lo que sabes hacer
            </Text>
          </View>
          <View style={styles.scoreBubble}>
            <Text style={styles.scoreValue}>{completion}%</Text>
            <Text style={styles.scoreLabel}>perfil</Text>
          </View>
        </View>

        <Text style={[styles.profileIntro, { color: palette.text }]}>
          Ningún campo es obligatorio. Cada dato puede ayudar a ampliar tus coincidencias de empleo o contratación.
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completion}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: palette.text }]}>
          {completedFields} de {totalFields} datos añadidos · Se guarda automáticamente
        </Text>
      </View>

      <View style={styles.profileForm}>
        <Field
          label="Profesión, oficio o puesto que buscas"
          value={profile.role}
          onChangeText={(value) => updateField('role', value)}
          placeholder="Ej. Carpintero, chofer, auxiliar administrativo..."
          maxLength={100}
        />

        <View style={styles.optionBlock}>
          <Text style={[styles.optionTitle, { color: palette.title }]}>Nivel de estudios</Text>
          <Text style={[styles.optionHint, { color: palette.text }]}>
            Si no tienes estudios formales, puedes indicarlo sin problema y destacar tu experiencia práctica.
          </Text>
          <View style={styles.chips}>
            {educationOptions.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                selected={profile.education === item}
                onPress={() => updateField('education', item)}
                palette={palette}
                light={mode === 'claro'}
              />
            ))}
          </View>
        </View>

        <Field
          label="Rama, especialidad o área en la que destacas"
          value={profile.specialty}
          onChangeText={(value) => updateField('specialty', value)}
          placeholder="Ej. muebles a medida, tapicería automotriz, ventas, Excel..."
          maxLength={140}
        />

        <View style={styles.optionBlock}>
          <Text style={[styles.optionTitle, { color: palette.title }]}>Experiencia aproximada</Text>
          <View style={styles.chips}>
            {experienceOptions.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                selected={profile.experience === item}
                onPress={() => updateField('experience', item)}
                palette={palette}
                light={mode === 'claro'}
              />
            ))}
          </View>
        </View>

        <View style={styles.optionBlock}>
          <Text style={[styles.optionTitle, { color: palette.title }]}>Disponibilidad</Text>
          <View style={styles.chips}>
            {availabilityOptions.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                selected={profile.availability === item}
                onPress={() => updateField('availability', item)}
                palette={palette}
                light={mode === 'claro'}
              />
            ))}
          </View>
        </View>

        <View style={styles.optionBlock}>
          <Text style={[styles.optionTitle, { color: palette.title }]}>Cómo puedes trabajar</Text>
          <View style={styles.chips}>
            {workModeOptions.map((item) => (
              <ChoiceChip
                key={item}
                label={item}
                selected={profile.workMode === item}
                onPress={() => updateField('workMode', item)}
                palette={palette}
                light={mode === 'claro'}
              />
            ))}
          </View>
        </View>

        <Field
          label="Habilidades principales"
          value={profile.skills}
          onChangeText={(value) => updateField('skills', value)}
          placeholder="Ej. manejo de herramienta, soldadura, atención al cliente, inventarios..."
          multiline
          maxLength={500}
        />

        <Field
          label="Breve presentación profesional"
          value={profile.bio}
          onChangeText={(value) => updateField('bio', value)}
          placeholder="Cuéntale a una empresa o cliente qué haces bien y qué tipo de oportunidad buscas."
          multiline
          maxLength={600}
        />

        <View
          style={[
            styles.privacyNote,
            {
              borderColor: palette.cardBorder,
              backgroundColor:
                mode === 'claro' ? 'rgba(230,241,252,0.92)' : 'rgba(8,26,47,0.72)',
            },
          ]}
        >
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={[styles.privacyText, { color: palette.text }]}>
            No necesitas poner teléfono, domicilio particular ni documentos sensibles aquí. Este espacio es sólo para información profesional.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.title }]}>Actividad</Text>
        <Text style={[styles.sectionText, { color: palette.text }]}>
          Busca oportunidades, prepara publicaciones o guarda ideas para después.
        </Text>
      </View>

      <Action label="Busco trabajo" onPress={buscarTrabajo} />
      <Action label="Mis borradores" secondary onPress={() => router.push('/borradores')} />
      <Action label="Ofrezco un servicio" secondary onPress={() => router.push('/publicar/servicio')} />
      <Action label="Vendo un producto" secondary onPress={() => router.push('/publicar/producto')} />
    </NexoScreen>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
  palette,
  light,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof getAppearancePalette>;
  light: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: selected ? '#74E8FF' : palette.cardBorder,
          backgroundColor: selected
            ? light
              ? 'rgba(122,218,255,0.28)'
              : 'rgba(78,108,185,0.58)'
            : light
              ? 'rgba(255,255,255,0.76)'
              : 'rgba(18,31,54,0.76)',
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.chipText, { color: palette.title }]}>
        {selected ? '✓ ' : ''}{label}
      </Text>
    </Pressable>
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
  profileHero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 19,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(126,203,235,0.40)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(54,48,115,0.95)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.22)',
  },
  heroFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  profileHeroTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  profileHeroCopy: {
    flex: 1,
    gap: 6,
  },
  profileEyebrow: {
    color: '#8DEBFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  profileEyebrowLight: {
    color: '#176B8F',
  },
  profileTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  profileIntro: {
    fontSize: 13,
    lineHeight: 19,
  },
  scoreBubble: {
    minWidth: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,26,52,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(139,239,255,0.60)',
  },
  scoreValue: {
    color: '#8DEBFF',
    fontSize: 17,
    fontWeight: '900',
  },
  scoreLabel: {
    color: '#D9F7FF',
    fontSize: 9,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,20,40,0.28)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#63E2FF',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileForm: {
    gap: 16,
  },
  optionBlock: {
    gap: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  optionHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  privacyIcon: {
    fontSize: 17,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
});
