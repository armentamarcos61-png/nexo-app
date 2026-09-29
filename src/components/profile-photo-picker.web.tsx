import { useRef, useState, type ChangeEvent } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

type Props = {
  value: string;
  onChange: (dataUrl: string) => void;
};

async function prepareImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen válida.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen es demasiado grande. Usa una de menos de 10 MB.');

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      element.src = objectUrl;
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - side) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - side) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');

    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProfilePhotoPicker({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setError('');
      onChange(await prepareImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la foto.');
    }
  }

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
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <View style={styles.row}>
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
            Opcional. Una foto clara puede dar más confianza a clientes y contratadores.
          </Text>
          <Text style={[styles.hint, { color: palette.muted }]}>
            Nexo la recorta y reduce automáticamente.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => inputRef.current?.click()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{value ? 'Cambiar foto' : 'Agregar foto'}</Text>
        </Pressable>

        {value ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError('');
              onChange('');
            }}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: palette.cardBorder },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryText, { color: palette.title }]}>Quitar foto</Text>
          </Pressable>
        ) : null}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={[styles.privacy, { color: palette.text }]}>
        🔒 Por ahora la imagen se guarda sólo en este navegador y no se publica automáticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 13,
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    boxShadow: '0 9px 22px rgba(0,0,0,0.15)',
  },
  row: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  hint: {
    fontSize: 11,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#70E6FF',
  },
  primaryText: {
    color: '#072036',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '900',
  },
  privacy: {
    fontSize: 11,
    lineHeight: 17,
  },
  error: {
    color: '#FF9CAF',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
