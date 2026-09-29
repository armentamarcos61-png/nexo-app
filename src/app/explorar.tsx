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

const workerOptions = [
  'Abogado', 'Administrador', 'Albañil', 'Arquitecto', 'Barbero', 'Bodeguero', 'Carpintero', 'Cargador',
  'Chofer', 'Cocinero', 'Contador', 'Costurero', 'Diseñador', 'Electricista', 'Enfermero', 'Fotógrafo',
  'Herrero', 'Ingeniero', 'Instalador', 'Jardinero', 'Lavador', 'Mecánico', 'Mensajero', 'Mesero',
  'Montacarguista', 'Operador', 'Pintor', 'Plomero', 'Programador', 'Repartidor', 'Soldador',
  'Supervisor', 'Tapicero', 'Técnico', 'Tornero', 'Vendedor', 'Velador', 'Yesero',
] as const;

const experienceOptions = ['Sin experiencia', '1+ año', '3+ años', '5+ años'];
const availabilityOptions = ['Tiempo completo', 'Medio tiempo', 'Por proyecto', 'Fines de semana'];
const productModes = ['Cualquiera', 'Nuevo', 'Usado', 'Hecho a medida', 'Mayoreo'];

type IntentKey = (typeof intents)[number]['key'];

function isIntent(value?: string): value is IntentKey {
  return !!value && intents.some((item) => item.key === value);
}

export default function ExplorarScreen() {
  const params = useLocalSearchParams<{ q?: string; categoria?: string; intencion?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [showIntents, setShowIntents] = useState(false);
  const [roleQuery, setRoleQuery] = useState('');
  const [requirements, setRequirements] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [productMode, setProductMode] = useState('Cualquiera');
  const [productHow, setProductHow] = useState('');
  const [productPurpose, setProductPurpose] = useState('');

  const selectedIntent = isIntent(params.intencion) ? params.intencion : undefined;
  const selectedIntentData = intents.find((item) => item.key === selectedIntent);
  const activeCategory = params.categoria || 'Todas';
  const shouldShowIntents = showIntents || !!params.q || !!params.categoria || !!selectedIntent;
  const filteredWorkers = workerOptions.filter((item) =>
    item.toLowerCase().includes(roleQuery.trim().toLowerCase())
  );

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

      {(selectedIntent === 'trabajadores' || selectedIntent === 'empleo') && (
        <View style={styles.smartPanel}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(22,51,90,0.98)', 'rgba(54,42,96,0.98)', 'rgba(15,82,88,0.96)']}
            style={styles.smartPanelGradient}
          />
          <Text style={styles.smartEyebrow}>
            {selectedIntent === 'trabajadores' ? 'PERFIL DEL TRABAJADOR' : 'TIPO DE EMPLEO'}
          </Text>
          <Text style={styles.smartTitle}>
            {selectedIntent === 'trabajadores'
              ? 'Dile a Nexo exactamente a quién necesitas'
              : 'Dile a Nexo qué trabajo estás buscando'}
          </Text>
          <Text style={styles.smartText}>
            Entre más claro seas, mejores coincidencias podrá mostrar Nexo.
          </Text>

          <Field
            label={selectedIntent === 'trabajadores' ? 'Puesto, oficio o habilidad' : 'Puesto o área'}
            value={roleQuery}
            onChangeText={setRoleQuery}
            placeholder="Ej. Carpintero, chofer, contador..."
          />

          {selectedIntent === 'trabajadores' && (
            <Field
              label="Requisitos indispensables"
              value={requirements}
              onChangeText={setRequirements}
              placeholder="Ej. licencia vigente, manejo de herramienta, disponibilidad..."
              multiline
            />
          )}

          <Text style={styles.choiceLabel}>Experiencia</Text>
          <View style={styles.chipWrap}>
            {experienceOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setExperience(item)}
                style={[styles.chip, experience === item && styles.chipSelected]}
              >
                <Text style={[styles.chipText, experience === item && styles.chipTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.choiceLabel}>Disponibilidad</Text>
          <View style={styles.chipWrap}>
            {availabilityOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setAvailability(item)}
                style={[styles.chip, availability === item && styles.chipSelected]}
              >
                <Text style={[styles.chipText, availability === item && styles.chipTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.directoryHeading}>
            <Text style={styles.choiceLabel}>Directorio A–Z</Text>
            <Text style={styles.directoryHint}>Toca una opción o escribe arriba para filtrar.</Text>
          </View>
          <View style={styles.roleGrid}>
            {filteredWorkers.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setRoleQuery(item);
                  setQuery(item);
                }}
                style={styles.rolePill}
              >
                <Text style={styles.rolePillText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {selectedIntent === 'comprar' && (
        <View style={styles.smartPanel}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(70,39,91,0.98)', 'rgba(37,53,101,0.98)', 'rgba(18,81,88,0.96)']}
            style={styles.smartPanelGradient}
          />
          <Text style={styles.smartEyebrow}>BÚSQUEDA DE PRODUCTO</Text>
          <Text style={styles.smartTitle}>Qué buscas, cómo lo quieres y para qué lo necesitas</Text>
          <Text style={styles.smartText}>
            Así Nexo podrá sugerirte el producto principal y también complementos, alternativas o proveedores relacionados.
          </Text>

          <Text style={styles.choiceLabel}>¿Cómo lo buscas?</Text>
          <View style={styles.chipWrap}>
            {productModes.map((item) => (
              <Pressable
                key={item}
                onPress={() => setProductMode(item)}
                style={[styles.chip, productMode === item && styles.chipSelected]}
              >
                <Text style={[styles.chipText, productMode === item && styles.chipTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="Detalles de cómo lo necesitas"
            value={productHow}
            onChangeText={setProductHow}
            placeholder="Ej. medidas, material, color, cantidad, presupuesto..."
          />

          <Field
            label="¿Para qué lo necesitas?"
            value={productPurpose}
            onChangeText={setProductPurpose}
            placeholder="Ej. para una cocina, negocio, regalo, reparación..."
            multiline
          />

          <View style={styles.complementCard}>
            <Text style={styles.complementIcon}>✦</Text>
            <Text style={styles.complementText}>
              Nexo podrá usar este contexto para complementar la búsqueda en vez de mostrarte solamente coincidencias por palabra.
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
            ? 'Nexo ya puede usar esta intención para organizar la necesidad, comparar opciones y preparar una solución completa de prueba.'
            : 'Selecciona una de las opciones de arriba para que Nexo sepa exactamente qué mostrarte.'}
        </Text>

        {(selectedIntent === 'trabajadores' || selectedIntent === 'contratar' || selectedIntent === 'comprar') && (
          <Action
            label="Continuar y dejar que Nexo lo organice"
            onPress={() =>
              router.push({
                pathname: '/resolver',
                params: {
                  q: query.trim(),
                  tipo: selectedIntent,
                  categoria: activeCategory === 'Todas' ? '' : activeCategory,
                },
              })
            }
          />
        )}

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
  smartPanel: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(133,183,229,0.42)',
    borderTopColor: 'rgba(232,245,255,0.64)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(47,43,101,0.97)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
  },
  smartPanelGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  smartEyebrow: {
    color: '#8EEBFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  smartTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  smartText: {
    color: '#BCC9E4',
    fontSize: 14,
    lineHeight: 21,
  },
  choiceLabel: {
    color: '#F4F8FF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(151,181,224,0.42)',
    backgroundColor: 'rgba(22,35,64,0.72)',
  },
  chipSelected: {
    backgroundColor: 'rgba(122,225,255,0.92)',
    borderColor: 'rgba(219,250,255,0.96)',
  },
  chipText: {
    color: '#D6E1F5',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#09213B',
  },
  directoryHeading: {
    gap: 2,
    marginTop: 2,
  },
  directoryHint: {
    color: '#98AACC',
    fontSize: 12,
    lineHeight: 17,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(37,55,91,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(124,159,209,0.34)',
  },
  rolePillText: {
    color: '#E8F0FF',
    fontSize: 12,
    fontWeight: '800',
  },
  complementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(14,31,57,0.60)',
    borderWidth: 1,
    borderColor: 'rgba(111,212,232,0.26)',
  },
  complementIcon: {
    color: '#8EEBFF',
    fontSize: 18,
  },
  complementText: {
    flex: 1,
    color: '#C1D0E8',
    fontSize: 13,
    lineHeight: 19,
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
