import { useRef, useState, type ChangeEvent } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  title?: string;
  hint?: string;
  maxImages?: number;
};

async function resizeImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      element.src = objectUrl;
    });

    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.76);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function MultiImagePicker({
  images,
  onChange,
  title = 'Fotos',
  hint = 'Agrega imágenes claras y representativas.',
  maxImages = 8,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    const available = Math.max(0, maxImages - images.length);
    if (!available) {
      setError(`Máximo ${maxImages} imágenes.`);
      return;
    }

    try {
      setError('');
      const accepted = files
        .filter((file) => file.type.startsWith('image/') && file.size <= 12 * 1024 * 1024)
        .slice(0, available);
      const prepared = await Promise.all(accepted.map(resizeImage));
      onChange([...images, ...prepared]);
      if (accepted.length !== files.length) setError('Algunas imágenes no se agregaron por formato, tamaño o límite.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las imágenes.');
    }
  }

  return (
    <View style={[styles.card, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.90)' : 'rgba(15,31,55,0.82)' }]}>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
      <View style={styles.heading}>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
          <Text style={[styles.hint, { color: palette.text }]}>{hint}</Text>
        </View>
        <Text style={[styles.count, { color: palette.muted }]}>{images.length}/{maxImages}</Text>
      </View>

      {!!images.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {images.map((uri, index) => (
            <View key={`${index}-${uri.length}`} style={styles.imageCard}>
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              <Pressable onPress={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable onPress={() => inputRef.current?.click()} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Text style={styles.addText}>{images.length ? '＋ Agregar más fotos' : '＋ Agregar fotos'}</Text>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
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
  imageCard: { width: 126, height: 104, borderRadius: 15, overflow: 'hidden', position: 'relative', backgroundColor: '#14233D' },
  image: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,14,27,0.82)' },
  removeText: { color: '#FFFFFF', fontSize: 20, lineHeight: 22, fontWeight: '900' },
  add: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(85,193,236,0.18)', borderWidth: 1, borderColor: 'rgba(105,226,255,0.48)' },
  addText: { color: '#DDF9FF', fontSize: 13, fontWeight: '900' },
  error: { color: '#FF9CAF', fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
