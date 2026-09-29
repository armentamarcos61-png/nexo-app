import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen, ui } from '@/components/nexo-screen';
import { categorias } from '@/constants/categories';

const intents = [
  {
    key: 'empleo',
    icon: '💼',
    title: 'Buscar empleo',
    text: 'Vacantes y oportunidades para tu perfil.',
    colors: ['#166ED7', '#526FF0', '#7A58E3'] as const,
  },
  {
    key: 'trabajadores',
    icon: '👥',
    title: 'Buscar trabajadores',
    text: 'Personas y perfiles que encajen con lo que necesitas.',
    colors: ['#275DCE', '#5551C6', '#7F4EC4'] as const,
  },
  {
    key: 'contratar',
    icon: '🤝',
    title: 'Contratar un servicio',
    text: 'Profesionales, oficios y especialistas disponibles.',
    colors: ['#7A3FCE', '#A64ED0', '#4868D9'] as const,
  },
  {
    key: 'ofrecer',
    icon: '🛠️',
    title: 'Ofrecer un servicio',
    text: 'Publica lo que sabes hacer y encuentra clientes.',
    colors: ['#0C8F8D', '#16A49A', '#3F73C9'] as const,
  },
  {
    key: 'comprar',
    icon: '🛍️',
    title: 'Comprar productos',
    text: 'Explora productos, fabricantes y vendedores.',
    colors: ['#B95A83', '#8750C9', '#4F67CF'] as const,
  },
  {
    key: 'vender',
    icon: '📦',
    title: 'Vender productos',
    text: 'Publica lo que fabricas o vendes dentro de Nexo.',
    colors: ['#B95F58', '#A65C94', '#7352C8'] as const,
  },
] as const;

type IntentKey = (typeof intents)[number]['key'];

function isIntent(value?: string): value is IntentKey {
  return !!value && intents.some((item) => item.key === value);
}

export default function ExplorarScreen() {
  const params = useLocalSearchParams<{ q?: string; categoria?: string; intencion?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [showIntents, setShowIntents] = useState(false);

  const selectedIntent = isIntent(params.intencion) ? params.intencion : undefined;
  const selectedIntentData = intents.find((item) => item.key === selectedIntent);
  const activeCategory = params.categoria || 'Todas';
  const shouldShowIntents = showIntents || !!params.q || !!params.categoria || !!selectedIntent;

  function buscar() {
    router.setParams({ q: query.trim() });
    setShowIntents(true);
  }

  function chooseCategory(item: string) {
    router.setParams({ categoria: item === 'Todas' ? '' : item });
    setShowIntents(true);
  }

  function chooseIntent(intent: IntentKey) {
    router.setParams({ intencion: intent });
    setShowIntents(true);
  }

  return (
    <NexoScreen title="Buscar en Nexo">
      <Field
        label="¿Qué necesitas?"
        value={query}
        onChangeText={setQuery}
        placeholder="Ej. Carpintero, empleo, mesa, plomero..."
        returnKeyType="search"
        onSubmitEditing={buscar}
      />

      <Action label="Buscar" onPress={buscar} />

      <View style={styles.filterBlock}>
        <Text style={styles.filterTitle}>Categoría</Text>
        <Text style={styles.filterText}>Puedes elegir una antes o después de escribir tu búsqueda.</Text>
        <View style={ui.row}>
          {['Todas', ...categorias].map((item) => (
            <Action
              key={item}
              label={item}
              secondary={activeCategory !== item}
              onPress={() => chooseCategory(item)}
            />
          ))}
        </View>
      </View>

      {shouldShowIntents ? (
        <View style={styles.intentSection}>
          <View style={styles.intentHeading}>
            <Text style={styles.intentTitle}>¿Qué quieres encontrar?</Text>
            <Text style={styles.intentSub}>
              {activeCategory === 'Todas'
                ? 'Dile a Nexo qué tipo de resultado buscas.'
                : `Elige qué quieres buscar dentro de ${activeCategory}.`}
            </Text>
          </View>

          <View style={styles.intentGrid}>
            {intents.map((intent) => {
              const selected = intent.key === selectedIntent;
              return (
                <Pressable
                  key={intent.key}
                  accessibilityRole="button"
                  onPress={() => chooseIntent(intent.key)}
                  style={({ pressed }) => [
                    styles.intentCard,
                    selected && styles.intentCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={intent.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.intentGradient}
                  />
                  <View pointerEvents="none" style={styles.intentGlowOne} />
                  <View pointerEvents="none" style={styles.intentGlowTwo} />
                  <View pointerEvents="none" style={styles.intentTopLine} />
                  <View style={styles.intentIcon}>
                    <Text style={styles.intentEmoji}>{intent.icon}</Text>
                  </View>
                  {selected ? (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  ) : (
                    <Text style={styles.intentArrow}>›</Text>
                  )}
                  <Text style={styles.intentCardTitle}>{intent.title}</Text>
                  <Text style={styles.intentCardText}>{intent.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.helperCard}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(28,55,91,0.96)', 'rgba(53,42,94,0.96)', 'rgba(17,83,88,0.94)']}
            style={styles.helperGradient}
          />
          <Text style={styles.helperIcon}>✦</Text>
          <View style={styles.helperCopy}>
            <Text style={styles.helperTitle}>Busca primero, Nexo organiza después</Text>
            <Text style={styles.helperText}>
              Escribe lo que necesitas y al tocar Buscar podrás elegir si buscas empleo, trabajadores, servicios o productos.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.resultCard}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(24,43,75,0.98)', 'rgba(45,39,82,0.98)', 'rgba(17,72,82,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.resultGradient}
        />
        <View pointerEvents="none" style={styles.resultGlow} />
        <View style={styles.resultIcon}>
          <Text style={styles.resultIconText}>{selectedIntentData?.icon ?? '⌕'}</Text>
        </View>

        <Text style={styles.resultEyebrow}>RESULTADOS NEXO</Text>
        <Text style={styles.resultTitle}>
          {selectedIntentData?.title ?? 'Elige qué tipo de resultado quieres ver'}
          {activeCategory !== 'Todas' ? ` · ${activeCategory}` : ''}
        </Text>

        <Text style={styles.resultText}>
          {selectedIntentData
            ? 'La búsqueda ya queda organizada por intención y categoría. En esta versión de prueba todavía no hay publicaciones públicas conectadas; cuando se conecte el catálogo, aquí aparecerán resultados reales.'
            : 'Selecciona una de las opciones de arriba para que Nexo sepa exactamente qué mostrarte.'}
        </Text>

        {selectedIntent === 'contratar' && (
          <Action label="Publicar lo que necesito" onPress={() => router.push('/publicar/necesidad')} />
        )}
        {selectedIntent === 'ofrecer' && (
          <Action label="Publicar mi servicio" onPress={() => router.push('/publicar/servicio')} />
        )}
        {selectedIntent === 'vender' && (
          <Action label="Publicar un producto" onPress={() => router.push('/publicar/producto')} />
        )}
      </View>
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  filterBlock: {
    gap: 8,
    paddingTop: 2,
  },
  filterTitle: {
    color: '#F5F8FF',
    fontSize: 17,
    fontWeight: '900',
  },
  filterText: {
    color: '#9FB0D1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 2,
  },
  intentSection: {
    gap: 12,
  },
  intentHeading: {
    gap: 4,
    marginTop: 4,
  },
  intentTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  intentSub: {
    color: '#A8B7D5',
    fontSize: 14,
    lineHeight: 20,
  },
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  intentCard: {
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 150,
    minHeight: 184,
    borderRadius: 23,
    padding: 18,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(175,203,255,0.44)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(42,39,93,0.96)',
    boxShadow: '0 12px 25px rgba(0,0,0,0.28)',
  },
  intentCardSelected: {
    borderColor: 'rgba(139,240,255,0.90)',
    boxShadow: '0 12px 28px rgba(82,142,255,0.34)',
  },
  intentGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 23,
  },
  intentGlowOne: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 999,
    right: -36,
    top: -54,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  intentGlowTwo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 999,
    left: -34,
    bottom: -56,
    backgroundColor: 'rgba(9,17,47,0.14)',
  },
  intentTopLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.70)',
  },
  intentIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    marginBottom: 16,
  },
  intentEmoji: {
    fontSize: 27,
  },
  intentArrow: {
    position: 'absolute',
    top: 17,
    right: 18,
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 34,
    opacity: 0.88,
  },
  selectedBadge: {
    position: 'absolute',
    top: 17,
    right: 18,
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211,250,255,0.92)',
  },
  selectedBadgeText: {
    color: '#0A3455',
    fontSize: 17,
    fontWeight: '900',
  },
  intentCardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 6,
  },
  intentCardText: {
    color: '#E0E7F5',
    fontSize: 13,
    lineHeight: 19,
  },
  helperCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(135,177,224,0.38)',
    borderTopColor: 'rgba(229,242,255,0.58)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(42,42,88,0.95)',
  },
  helperGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  helperIcon: {
    color: '#8EEFFF',
    fontSize: 27,
  },
  helperCopy: {
    flex: 1,
  },
  helperTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  helperText: {
    color: '#B8C7E4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  resultCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(131,169,219,0.42)',
    borderTopColor: 'rgba(230,242,255,0.62)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(45,44,96,0.97)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
  },
  resultGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  resultGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    right: -80,
    top: -80,
    backgroundColor: 'rgba(102,224,255,0.10)',
  },
  resultIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(101,112,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(136,222,255,0.40)',
  },
  resultIconText: {
    fontSize: 26,
    color: '#FFFFFF',
  },
  resultEyebrow: {
    color: '#8EEBFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  resultText: {
    color: '#BCC9E4',
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: {
    transform: [{ translateY: 2 }, { scale: 0.988 }],
    opacity: 0.92,
  },
});
