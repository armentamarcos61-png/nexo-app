import { useRef, useState, type ChangeEvent } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StoredVideo } from '@/components/stored-video';
import { deleteVideoBlob, saveVideoBlob, type StoredVideoRef } from '@/state/media-store';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  videos: StoredVideoRef[];
  onChange: (videos: StoredVideoRef[]) => void;
  title?: string;
  hint?: string;
  maxVideos?: number;
};

const MAX_DURATION_SECONDS = 5 * 60;
const MAX_FILE_BYTES = 250 * 1024 * 1024;

async function readDuration(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : 0);
      video.onerror = () => reject(new Error('No se pudo leer la duración del video.'));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDuration(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

export function VideoPicker({
  videos,
  onChange,
  title = 'Videos',
  hint = 'Puedes agregar videos de hasta 5 minutos.',
  maxVideos = 4,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    const available = Math.max(0, maxVideos - videos.length);
    if (!available) {
      setError(`Máximo ${maxVideos} videos.`);
      return;
    }

    try {
      setError('');
      const next: StoredVideoRef[] = [];

      for (const file of files.slice(0, available)) {
        if (!file.type.startsWith('video/')) {
          setError('Algunos archivos no eran videos y se omitieron.');
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setError('Un video era demasiado pesado para este prototipo y se omitió.');
          continue;
        }

        const duration = await readDuration(file);
        if (!duration || duration > MAX_DURATION_SECONDS + 0.5) {
          setError('Los videos deben durar máximo 5 minutos.');
          continue;
        }

        const ref: StoredVideoRef = {
          id: makeId(),
          name: file.name || 'Video',
          type: file.type || 'video/mp4',
          duration,
        };
        await saveVideoBlob(ref.id, file);
        next.push(ref);
      }

      if (next.length) onChange([...videos, ...next]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los videos.');
    }
  }

  async function removeVideo(index: number) {
    const video = videos[index];
    if (!video) return;
    try {
      await deleteVideoBlob(video.id);
    } catch {
      // Even if browser cleanup fails, remove the reference from the current gallery.
    }
    onChange(videos.filter((_, itemIndex) => itemIndex !== index));
    setSelectedIndex(null);
    setMenuOpen(false);
  }

  return (
    <View style={[styles.card, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.90)' : 'rgba(15,31,55,0.82)' }]}>
      <input ref={inputRef} type="file" accept="video/*" multiple onChange={handleFiles} style={{ display: 'none' }} />

      <View style={styles.heading}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
          <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
        </View>
        <Text style={[styles.count, { color: palette.muted }]}>{videos.length}/{maxVideos}</Text>
      </View>

      {!!videos.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {videos.map((video, index) => (
            <Pressable
              key={video.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir video ${index + 1}`}
              onPress={() => {
                setSelectedIndex(index);
                setMenuOpen(false);
              }}
              style={({ pressed }) => [styles.videoCard, pressed && styles.pressed]}
            >
              <StoredVideo video={video} controls={false} muted />
              <View pointerEvents="none" style={styles.playBadge}><Text style={styles.playText}>▶</Text></View>
              <View pointerEvents="none" style={styles.durationBadge}><Text style={styles.durationText}>{formatDuration(video.duration)}</Text></View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable onPress={() => inputRef.current?.click()} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Text style={styles.addText}>{videos.length ? '＋ Agregar más videos' : '＋ Agregar videos'}</Text>
      </Pressable>

      <Text style={[styles.note, { color: palette.muted }]}>Duración máxima: 5:00 por video.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSelectedIndex(null);
          setMenuOpen(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar video"
              onPress={() => {
                setSelectedIndex(null);
                setMenuOpen(false);
              }}
              style={styles.modalRoundButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>

            <View style={styles.menuWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Opciones de video"
                onPress={() => setMenuOpen((current) => !current)}
                style={styles.modalRoundButton}
              >
                <Text style={styles.dotsText}>⋯</Text>
              </Pressable>

              {menuOpen && selectedIndex !== null && (
                <View style={styles.menuCard}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void removeVideo(selectedIndex)}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteText}>Eliminar video</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {selectedIndex !== null && videos[selectedIndex] ? (
            <View style={styles.modalVideoArea}>
              <StoredVideo video={videos[selectedIndex]} controls contain />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 15, borderRadius: 20, borderWidth: 1 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '900' },
  hint: { fontSize: 12, lineHeight: 18 },
  count: { fontSize: 12, fontWeight: '900' },
  gallery: { gap: 10 },
  videoCard: { width: 150, height: 105, borderRadius: 15, overflow: 'hidden', position: 'relative', backgroundColor: '#14233D' },
  playBadge: { position: 'absolute', left: '50%', top: '50%', width: 38, height: 38, marginLeft: -19, marginTop: -19, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,14,28,0.70)' },
  playText: { color: '#FFFFFF', fontSize: 16, marginLeft: 2 },
  durationBadge: { position: 'absolute', right: 7, bottom: 7, paddingHorizontal: 7, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,14,28,0.76)' },
  durationText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  add: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(171,95,225,0.16)', borderWidth: 1, borderColor: 'rgba(200,139,255,0.42)' },
  addText: { color: '#F1DFFF', fontSize: 13, fontWeight: '900' },
  note: { fontSize: 10, lineHeight: 15 },
  error: { color: '#FF9CAF', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2,7,14,0.96)' },
  modalTopBar: { position: 'absolute', top: 18, left: 18, right: 18, zIndex: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalRoundButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,27,42,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  closeText: { color: '#FFFFFF', fontSize: 27, lineHeight: 29, fontWeight: '500' },
  dotsText: { color: '#FFFFFF', fontSize: 25, lineHeight: 25, fontWeight: '900', marginTop: -5 },
  menuWrap: { alignItems: 'flex-end', gap: 7 },
  menuCard: { minWidth: 150, padding: 6, borderRadius: 14, backgroundColor: 'rgba(20,30,46,0.98)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.34)' },
  menuItem: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10 },
  deleteText: { color: '#FF9FB1', fontSize: 13, fontWeight: '900' },
  modalVideoArea: { flex: 1, paddingHorizontal: 18, paddingTop: 74, paddingBottom: 28 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
