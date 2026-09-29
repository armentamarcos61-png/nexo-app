import { useRef, useState, type ChangeEvent } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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
            <Pressable
              key={`${index}-${uri.length}`}
              accessibilityRole="button"
              accessibilityLabel={`Abrir imagen ${index + 1}`}
              onPress={() => {
                setSelectedIndex(index);
                setMenuOpen(false);
              }}
              style={({ pressed }) => [styles.imageCard, pressed && styles.pressed]}
            >
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              <View pointerEvents="none" style={styles.openHint}>
                <Text style={styles.openHintText}>Ver</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable onPress={() => inputRef.current?.click()} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Text style={styles.addText}>{images.length ? '＋ Agregar más fotos' : '＋ Agregar fotos'}</Text>
      </Pressable>
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
              accessibilityLabel="Cerrar imagen"
              onPress={() => {
                setSelectedIndex(null);
                setMenuOpen(false);
              }}
              style={styles.modalRoundButton}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>

            <View style={styles.menuWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Opciones de imagen"
                onPress={() => setMenuOpen((current) => !current)}
                style={styles.modalRoundButton}
              >
                <Text style={styles.dotsText}>⋯</Text>
              </Pressable>

              {menuOpen && selectedIndex !== null && (
                <View style={styles.menuCard}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      onChange(images.filter((_, itemIndex) => itemIndex !== selectedIndex));
                      setSelectedIndex(null);
                      setMenuOpen(false);
                    }}
                    style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteMenuText}>Eliminar foto</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {selectedIndex !== null && images[selectedIndex] ? (
            <Pressable
              style={styles.modalImageArea}
              onPress={() => setMenuOpen(false)}
            >
              <Image source={{ uri: images[selectedIndex] }} style={styles.modalImage} resizeMode="contain" />
            </Pressable>
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
  imageCard: { width: 126, height: 104, borderRadius: 15, overflow: 'hidden', position: 'relative', backgroundColor: '#14233D' },
  image: { width: '100%', height: '100%' },
  openHint: {
    position: 'absolute',
    right: 7,
    bottom: 7,
    paddingHorizontal: 8,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,14,28,0.72)',
  },
  openHintText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  add: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(85,193,236,0.18)', borderWidth: 1, borderColor: 'rgba(105,226,255,0.48)' },
  addText: { color: '#DDF9FF', fontSize: 13, fontWeight: '900' },
  error: { color: '#FF9CAF', fontSize: 12, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,7,14,0.95)',
  },
  modalTopBar: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalRoundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,27,42,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '500',
  },
  dotsText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 25,
    fontWeight: '900',
    marginTop: -5,
  },
  menuWrap: {
    alignItems: 'flex-end',
    gap: 7,
  },
  menuCard: {
    minWidth: 150,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(20,30,46,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
  },
  menuItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  deleteMenuText: {
    color: '#FF9FB1',
    fontSize: 13,
    fontWeight: '900',
  },
  modalImageArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 74,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
