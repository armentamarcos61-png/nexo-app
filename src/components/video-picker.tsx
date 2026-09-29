import { StyleSheet, Text, View } from 'react-native';
import type { StoredVideoRef } from '@/state/media-store';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  videos: StoredVideoRef[];
  onChange: (videos: StoredVideoRef[]) => void;
  title?: string;
  hint?: string;
  maxVideos?: number;
};

export function VideoPicker({
  videos,
  title = 'Videos',
  hint = 'Puedes agregar videos de hasta 5 minutos.',
  maxVideos = 4,
}: Props) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  return (
    <View style={[styles.card, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.90)' : 'rgba(15,31,55,0.82)' }]}>
      <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
      <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
      <Text style={[styles.hint, { color: palette.muted }]}>{videos.length}/{maxVideos} videos · Carga nativa pendiente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 15, borderRadius: 20, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '900' },
  hint: { fontSize: 12, lineHeight: 18 },
});
