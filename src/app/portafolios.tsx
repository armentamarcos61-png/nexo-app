import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { MultiImagePicker } from '@/components/multi-image-picker';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { usePortfolios } from '@/state/portfolios';

export default function PortafoliosScreen() {
  const { portfolios, save, remove } = usePortfolios();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [service, setService] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<{ portfolioId: string; imageIndex: number } | null>(null);
  const [viewerMenuOpen, setViewerMenuOpen] = useState(false);
  const [viewerMessage, setViewerMessage] = useState('');
  const idRef = useRef<string | null>(null);

  const activePortfolio = viewer
    ? portfolios.find((portfolio) => portfolio.id === viewer.portfolioId)
    : undefined;
  const activeImage = activePortfolio && viewer
    ? activePortfolio.images[viewer.imageIndex]
    : undefined;

  function resetForm() {
    idRef.current = null;
    setTitle('');
    setService('');
    setDescription('');
    setImages([]);
    setError('');
    setCreating(false);
  }

  function openImage(portfolioId: string, imageIndex: number) {
    setViewer({ portfolioId, imageIndex });
    setViewerMenuOpen(false);
    setViewerMessage('');
  }

  function closeViewer() {
    setViewer(null);
    setViewerMenuOpen(false);
    setViewerMessage('');
  }

  function deleteActiveImage() {
    if (!activePortfolio || !viewer) return;

    if (activePortfolio.images.length <= 1) {
      setViewerMessage('Este portafolio necesita al menos una foto. Agrega otra antes de eliminar ésta.');
      setViewerMenuOpen(false);
      return;
    }

    const nextImages = activePortfolio.images.filter((_, index) => index !== viewer.imageIndex);
    save({ ...activePortfolio, images: nextImages });
    closeViewer();
  }

  function guardar() {
    if (!title.trim() || !service.trim()) {
      setError('Escribe el nombre del portafolio y el tipo de servicio.');
      return;
    }
    if (!images.length) {
      setError('Agrega al menos una foto para que este portafolio tenga sentido visual.');
      return;
    }

    try {
      idRef.current ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      save({
        id: idRef.current,
        title: title.trim(),
        service: service.trim(),
        description: description.trim(),
        images,
        createdAt: new Date().toISOString(),
      });
      resetForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el portafolio.');
    }
  }

  return (
    <NexoScreen title="Portafolios de trabajo">
      <View style={styles.intro}>
        <View style={styles.introCopy}>
          <Text style={[styles.title, { color: palette.title }]}>Galerías separadas por tipo de trabajo</Text>
          <Text style={[styles.text, { color: palette.text }]}>
            Crea un portafolio para Cocinas, otro para Clósets, otro para Sillones, etc. Así el cliente abre justo lo que le interesa.
          </Text>
        </View>
        {!creating && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setCreating(true)}
            style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}
          >
            <LinearGradient colors={['#3FD9F1', '#6E79F1', '#B158D7']} style={styles.fill} />
            <Text style={styles.newButtonText}>＋ Nuevo portafolio</Text>
          </Pressable>
        )}
      </View>

      {creating && (
        <View style={[styles.formCard, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.94)' : 'rgba(15,29,51,0.90)' }]}>
          <Text style={[styles.formTitle, { color: palette.title }]}>Crear una galería</Text>
          <Text style={[styles.formHelp, { color: palette.text }]}>
            Mantén cada portafolio enfocado en un solo tipo de trabajo. Ejemplo: “Cocinas integrales” con puras cocinas que tú hiciste.
          </Text>

          <Field
            label="Nombre del portafolio *"
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Cocinas integrales"
            maxLength={80}
          />

          <Field
            label="Servicio u oficio *"
            value={service}
            onChangeText={setService}
            placeholder="Ej. Carpintería"
            maxLength={80}
          />

          <Field
            label="Descripción breve (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Ej. Cocinas fabricadas a medida en MDF, madera y melamina."
            multiline
            maxLength={500}
          />

          <MultiImagePicker
            images={images}
            onChange={setImages}
            maxImages={10}
            title="Fotos de este portafolio"
            hint="Sube sólo fotos de esta misma categoría de trabajo. Si este portafolio es de cocinas, aquí van puras cocinas."
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Action label="Guardar portafolio" onPress={guardar} />
          <Action label="Cancelar" secondary onPress={resetForm} />
        </View>
      )}

      <View style={styles.headingRow}>
        <Text style={[styles.sectionTitle, { color: palette.title }]}>Tus portafolios</Text>
        <Text style={[styles.counter, { color: palette.muted }]}>
          {portfolios.length} {portfolios.length === 1 ? 'galería' : 'galerías'}
        </Text>
      </View>

      {!portfolios.length ? (
        <View style={[styles.empty, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.88)' : 'rgba(18,31,53,0.78)' }]}>
          <Text style={styles.emptyIcon}>🖼️</Text>
          <Text style={[styles.emptyTitle, { color: palette.title }]}>Todavía no tienes portafolios</Text>
          <Text style={[styles.emptyText, { color: palette.text }]}>
            Crea uno para cada tipo de trabajo que quieras mostrar. Tus galerías quedarán separadas y ordenadas.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {portfolios.map((portfolio) => (
            <View
              key={portfolio.id}
              style={[
                styles.card,
                {
                  borderColor: palette.cardBorder,
                  backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.94)' : 'rgba(15,29,50,0.90)',
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir portada de ${portfolio.title}`}
                onPress={() => openImage(portfolio.id, 0)}
                style={({ pressed }) => [styles.coverShell, pressed && styles.pressed]}
              >
                <Image source={{ uri: portfolio.images[0] }} style={styles.cover} resizeMode="cover" />
                <View pointerEvents="none" style={styles.countBubble}>
                  <Text style={styles.countText}>{portfolio.images.length} fotos</Text>
                </View>
              </Pressable>

              <View style={styles.body}>
                <Text style={styles.serviceBadge}>{portfolio.service}</Text>
                <Text style={[styles.cardTitle, { color: palette.title }]}>{portfolio.title}</Text>
                {!!portfolio.description && (
                  <Text style={[styles.cardText, { color: palette.text }]} numberOfLines={3}>{portfolio.description}</Text>
                )}

                <View style={styles.thumbRow}>
                  {portfolio.images.slice(0, 4).map((uri, index) => (
                    <Pressable
                      key={`${portfolio.id}-${index}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir imagen ${index + 1} de ${portfolio.title}`}
                      onPress={() => openImage(portfolio.id, index)}
                      style={({ pressed }) => [styles.thumbButton, pressed && styles.pressed]}
                    >
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                    </Pressable>
                  ))}
                </View>

                <Pressable onPress={() => remove(portfolio.id)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                  <Text style={styles.deleteText}>Eliminar portafolio</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={!!viewer && !!activeImage}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <View style={styles.viewerBackdrop}>
          <View style={styles.viewerTopBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar imagen"
              onPress={closeViewer}
              style={styles.viewerRoundButton}
            >
              <Text style={styles.viewerClose}>×</Text>
            </Pressable>

            <View style={styles.viewerMenuWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Opciones de imagen"
                onPress={() => {
                  setViewerMenuOpen((current) => !current);
                  setViewerMessage('');
                }}
                style={styles.viewerRoundButton}
              >
                <Text style={styles.viewerDots}>⋯</Text>
              </Pressable>

              {viewerMenuOpen && (
                <View style={styles.viewerMenu}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={deleteActiveImage}
                    style={({ pressed }) => [styles.viewerMenuItem, pressed && styles.pressed]}
                  >
                    <Text style={styles.viewerDeleteText}>Eliminar foto</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          <Pressable
            style={styles.viewerImageArea}
            onPress={() => setViewerMenuOpen(false)}
          >
            {activeImage ? (
              <Image source={{ uri: activeImage }} style={styles.viewerImage} resizeMode="contain" />
            ) : null}
          </Pressable>

          {!!viewerMessage && (
            <View style={styles.viewerMessage}>
              <Text style={styles.viewerMessageText}>{viewerMessage}</Text>
            </View>
          )}
        </View>
      </Modal>
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  introCopy: { flexGrow: 1, flexBasis: 220, gap: 5 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '900' },
  text: { fontSize: 13, lineHeight: 19 },
  newButton: { position: 'relative', overflow: 'hidden', minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(216,246,255,0.75)', borderBottomWidth: 3, borderBottomColor: 'rgba(62,55,137,0.92)' },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 14 },
  newButtonText: { color: '#07192C', fontSize: 13, fontWeight: '900' },
  formCard: { gap: 14, padding: 17, borderRadius: 22, borderWidth: 1 },
  formTitle: { fontSize: 19, fontWeight: '900' },
  formHelp: { fontSize: 12, lineHeight: 18 },
  error: { color: '#FF9CAF', fontSize: 12, lineHeight: 18, fontWeight: '800' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  counter: { fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 7, padding: 24, borderRadius: 22, borderWidth: 1 },
  emptyIcon: { fontSize: 37 },
  emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 450 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexBasis: 230, minWidth: 200, maxWidth: 390, overflow: 'hidden', borderRadius: 21, borderWidth: 1, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' },
  coverShell: { height: 190, position: 'relative', backgroundColor: '#172944' },
  cover: { width: '100%', height: '100%' },
  countBubble: { position: 'absolute', right: 9, bottom: 9, paddingHorizontal: 9, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,14,28,0.80)' },
  countText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  body: { padding: 14, gap: 8 },
  serviceBadge: { alignSelf: 'flex-start', color: '#94F0FF', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(42,130,155,0.23)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  cardText: { fontSize: 12, lineHeight: 18 },
  thumbRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  thumbButton: { borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 50, height: 42, borderRadius: 8, backgroundColor: '#162640' },
  deleteButton: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 7 },
  deleteText: { color: '#F3A1B2', fontSize: 11, fontWeight: '900' },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,7,14,0.96)',
  },
  viewerTopBar: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    zIndex: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  viewerRoundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,27,42,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  viewerClose: {
    color: '#FFFFFF',
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '500',
  },
  viewerDots: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 25,
    fontWeight: '900',
    marginTop: -5,
  },
  viewerMenuWrap: {
    alignItems: 'flex-end',
    gap: 7,
  },
  viewerMenu: {
    minWidth: 150,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(20,30,46,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
  },
  viewerMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  viewerDeleteText: {
    color: '#FF9FB1',
    fontSize: 13,
    fontWeight: '900',
  },
  viewerImageArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 74,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerMessage: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 22,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(106,35,54,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,172,0.35)',
  },
  viewerMessageText: {
    color: '#FFE6EC',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
