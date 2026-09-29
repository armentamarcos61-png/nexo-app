import { Image, StyleSheet, Text, View } from 'react-native';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

export function ProfilePhotoPicker({ value }: Props) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.88)' : 'rgba(15,30,53,0.82)',
          borderColor: palette.cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: mode === 'claro' ? '#E9F1FB' : '#162844',
            borderColor: value ? '#72E9FF' : palette.cardBorder,
          },
        ]}
      >
        {value ? (
          <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
        ) : (
          <Text style={styles.placeholder}>👤</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.title }]}>Foto de perfil</Text>
        <Text style={[styles.text, { color: palette.text }]}>
          La foto es opcional. La selección desde el dispositivo se habilitará en la versión móvil nativa.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    fontSize: 36,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
});
