import { StyleSheet, Text, View } from 'react-native';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  title?: string;
  hint?: string;
  maxImages?: number;
};

export function MultiImagePicker({
  images,
  title = 'Fotos',
  hint = 'Agrega imágenes claras y representativas.',
  maxImages = 8,
}: Props) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  return (
    <View style={[styles.card, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.90)' : 'rgba(15,31,55,0.82)' }]}>
      <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
      <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
      <Text style={[styles.hint, { color: palette.muted }]}>
        {images.length}/{maxImages} imágenes · La selección desde el dispositivo se habilitará en la versión móvil nativa.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 15, borderRadius: 20, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '900' },
  hint: { fontSize: 12, lineHeight: 18 },
});
