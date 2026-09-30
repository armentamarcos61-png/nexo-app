import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { NexoScreen } from '@/components/nexo-screen';
import { StoredVideo } from '@/components/stored-video';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { useMarketplace } from '@/state/marketplace';

export default function ProductosScreen() {
  const { products } = useMarketplace();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) =>
      [item.title, item.description, item.category, item.location]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [products, query]);

  return (
    <NexoScreen title="Productos">
      <View style={styles.topRow}>
        <View style={styles.topCopy}>
          <Text style={[styles.title, { color: palette.title }]}>Marketplace Nexo</Text>
          <Text style={[styles.subtitle, { color: palette.text }]}>
            Aquí aparecen todos los productos publicados. Busca sólo cuando quieras afinar.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/publicar/producto')}
          style={({ pressed }) => [styles.publishButton, pressed && styles.pressed]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#45D9F5', '#6A80F7', '#B85CE1']}
            style={styles.buttonFill}
          />
          <Text style={styles.publishText}>＋ Publicar producto</Text>
        </Pressable>
      </View>

      <View style={[styles.searchShell, { borderColor: palette.cardBorder }]}>
        <LinearGradient pointerEvents="none" colors={palette.input} style={styles.searchFill} />
        <Text style={[styles.searchIcon, { color: '#66E6FF' }]}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar producto, categoría o zona..."
          placeholderTextColor={palette.placeholder}
          style={[styles.searchInput, { color: palette.inputText }]}
        />
      </View>

      <View style={styles.resultHeader}>
        <Text style={[styles.resultCount, { color: palette.title }]}>
          {filtered.length} {filtered.length === 1 ? 'producto' : 'productos'}
        </Text>
        {!!query.trim() && (
          <Pressable onPress={() => setQuery('')}>
            <Text style={styles.clear}>Limpiar búsqueda</Text>
          </Pressable>
        )}
      </View>

      {!filtered.length ? (
        <View style={[styles.empty, { borderColor: palette.cardBorder, backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.88)' : 'rgba(18,31,53,0.78)' }]}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={[styles.emptyTitle, { color: palette.title }]}>
            {products.length ? 'No encontramos coincidencias' : 'Todavía no hay productos publicados'}
          </Text>
          <Text style={[styles.emptyText, { color: palette.text }]}>
            {products.length
              ? 'Prueba otra palabra o categoría.'
              : 'El primer producto que publiques aparecerá aquí automáticamente con sus fotos o videos.'}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  borderColor: palette.cardBorder,
                  backgroundColor: mode === 'claro' ? 'rgba(255,255,255,0.94)' : 'rgba(15,29,50,0.90)',
                },
              ]}
            >
              <View style={styles.photoShell}>
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.photo} resizeMode="cover" />
                ) : item.videos[0] ? (
                  <StoredVideo video={item.videos[0]} controls />
                ) : (
                  <LinearGradient colors={['#214F72', '#553E8A', '#80406D']} style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>📦</Text>
                    <Text style={styles.placeholderText}>Sin multimedia</Text>
                  </LinearGradient>
                )}
                {item.images.length + item.videos.length > 1 && (
                  <View style={styles.photoCount}>
                    <Text style={styles.photoCountText}>
                      {item.images.length} 📷 · {item.videos.length} 🎬
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badge}>{item.category || 'Producto'}</Text>
                  {!!item.location && <Text style={[styles.location, { color: palette.muted }]}>📍 {item.location}</Text>}
                </View>
                <Text style={[styles.cardTitle, { color: palette.title }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.cardText, { color: palette.text }]} numberOfLines={3}>{item.description}</Text>
                {!!item.videos.length && item.images[0] && (
                  <View style={styles.videoPreview}>
                    <StoredVideo video={item.videos[0]} controls />
                  </View>
                )}
                <Text style={styles.price}>{item.price ? `${item.price} MXN` : 'Precio por acordar'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  topCopy: { flexGrow: 1, flexBasis: 210, gap: 4 },
  title: { fontSize: 23, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  publishButton: { position: 'relative', overflow: 'hidden', minHeight: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,245,255,0.72)', borderBottomWidth: 3, borderBottomColor: 'rgba(64,57,139,0.92)' },
  buttonFill: { ...StyleSheet.absoluteFill, borderRadius: 14 },
  publishText: { color: '#07192C', fontSize: 13, fontWeight: '900' },
  searchShell: { position: 'relative', overflow: 'hidden', minHeight: 54, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  searchFill: { ...StyleSheet.absoluteFill, borderRadius: 17 },
  searchIcon: { fontSize: 26, marginLeft: 15, marginRight: 9 },
  searchInput: { flex: 1, minHeight: 44, marginVertical: 5, marginRight: 8, paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#000000', backgroundColor: 'rgba(241,244,249,0.94)', borderRadius: 12, outlineStyle: 'none' } as any,
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  resultCount: { fontSize: 15, fontWeight: '900' },
  clear: { color: '#78E8FF', fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 7, padding: 26, borderRadius: 22, borderWidth: 1 },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 420 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexGrow: 1, flexBasis: 220, maxWidth: 370, minWidth: 190, overflow: 'hidden', borderRadius: 20, borderWidth: 1, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' },
  photoShell: { height: 180, position: 'relative', backgroundColor: '#172944' },
  photo: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  placeholderIcon: { fontSize: 33 },
  placeholderText: { color: '#DFEAFA', fontSize: 12, fontWeight: '800' },
  photoCount: { position: 'absolute', right: 9, bottom: 9, minWidth: 32, height: 28, borderRadius: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,13,25,0.80)' },
  photoCountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  cardBody: { padding: 14, gap: 7 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge: { color: '#9AF0FF', fontSize: 10, fontWeight: '900', backgroundColor: 'rgba(47,126,157,0.22)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  location: { fontSize: 10, fontWeight: '700', flexShrink: 1 },
  cardTitle: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  cardText: { fontSize: 12, lineHeight: 18 },
  videoPreview: { height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111F36', marginTop: 3 },
  price: { color: '#76E9FF', fontSize: 16, fontWeight: '900', marginTop: 2 },
  pressed: { opacity: 0.9, transform: [{ translateY: 1 }, { scale: 0.99 }] },
});
