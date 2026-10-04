import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categorias } from '@/constants/categories';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { useAuth } from '@/state/auth';
import { useProfessionalProfile } from '@/state/professional-profile';
import { NEXO_LOGO_DATA_URI } from '@/constants/brand-logo';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const actions = [
  {
    icon: '💼',
    title: 'Buscar empleo',
    text: 'Explora oportunidades y encuentra dónde encaja tu talento.',
    colors: ['#1067D8', '#3C78FF', '#6F59E8'] as const,
    onPress: () => router.push({ pathname: '/explorar', params: { intencion: 'empleo' } }),
  },
  {
    icon: '🤝',
    title: 'Contratar un servicio',
    text: 'Cuéntale a Nexo qué necesitas y deja que organice opciones, precio y coordinación.',
    colors: ['#7D3BE8', '#B84DE2', '#6B48E8'] as const,
    onPress: () => router.push({ pathname: '/explorar', params: { intencion: 'contratar' } }),
  },
  {
    icon: '🛒',
    title: 'Productos',
    text: 'Ve el Marketplace completo, busca lo que necesitas o publica lo tuyo.',
    colors: ['#C95C55', '#C86D92', '#7D4DD1'] as const,
    onPress: () => router.push('/productos'),
  },
  {
    icon: '🛠️',
    title: 'Ofrecer un servicio',
    text: 'Muestra lo que sabes hacer y consigue nuevos clientes.',
    colors: ['#0D8C8D', '#14A69D', '#3972C9'] as const,
    onPress: () => router.push('/publicar/servicio'),
  },
];

export default function HomeScreen() {
  const [busqueda, setBusqueda] = useState('');
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { profile } = useProfessionalProfile();
  const { user, signOut } = useAuth();
  const greetingName = user?.firstName.trim() ?? '';
  const profileInitial = greetingName ? greetingName.charAt(0).toUpperCase() : 'N';

  function buscar() {
    router.push({ pathname: '/explorar', params: { q: busqueda.trim() } });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={palette.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.glowOne, { backgroundColor: palette.glowOne }]} />
      <View pointerEvents="none" style={[styles.glowTwo, { backgroundColor: palette.glowTwo }]} />

      <ScrollView
        style={[styles.scroll, { backgroundColor: palette.scroll }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image
              accessibilityLabel="Logo Nexo"
              source={{ uri: NEXO_LOGO_DATA_URI }}
              resizeMode="contain"
              style={styles.brandLogo}
            />
            <Text style={[styles.logoSub, { color: palette.muted }]}>
              Negocios · Empleo · × · Oportunidades
            </Text>
          </View>

          <View style={styles.profileBlock}>
            {user ? (
              <Text numberOfLines={1} style={[styles.accountName, { color: palette.title }]}>
                {user.firstName}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
              style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
              onPress={() => router.push(user ? '/perfil' : '/iniciar-sesion')}
            >
              <LinearGradient
                pointerEvents="none"
                colors={['#287EEB', '#8C54F6', '#E25BCE']}
                style={styles.profileGradient}
              />
              {user && profile.photoDataUrl ? (
                <Image source={{ uri: profile.photoDataUrl }} style={styles.profileImage} resizeMode="cover" />
              ) : (
                <Text style={styles.profileText}>{profileInitial}</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.authRow}>
          {user ? (
            <Pressable
              accessibilityRole="button"
              onPress={signOut}
              style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
            >
              <Text style={[styles.loginButtonText, { color: palette.title }]}>
                Cerrar sesión · @{user.username}
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/iniciar-sesion')}
                style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
              >
                <Text style={[styles.loginButtonText, { color: palette.title }]}>Iniciar sesión</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/registrarse')}
                style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['#56ECFF', '#7E8BFF', '#F17BE4']}
                  style={styles.registerGradient}
                />
                <Text style={styles.registerButtonText}>Registrarse</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.welcomeRow}>
          <View style={styles.welcomeCopy}>
            <Text style={[styles.hello, { color: palette.muted }]}>
              {greetingName ? `¡Hola, ${greetingName}! 👋` : '¡Hola! 👋'}
            </Text>
            <Text style={[styles.welcomeTitle, { color: palette.title }]}>¿Qué quieres hacer hoy?</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusDot}>●</Text>
            <Text style={styles.statusText}>Nexo activo</Text>
          </View>
        </View>

        <View style={styles.searchShell}>
          <LinearGradient
            pointerEvents="none"
            colors={palette.input}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.searchGradient}
          />
          <Text style={[styles.searchIcon, { color: '#66E6FF' }]}>⌕</Text>
          <View style={styles.searchInputWrap}>
            {!busqueda ? (
              <Text pointerEvents="none" numberOfLines={1} style={styles.searchPlaceholder}>
                Buscar empleos, servicios, productos...
              </Text>
            ) : null}
            <TextInput
              testID="nexo-home-search"
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder=""
              style={styles.input}
              autoComplete="off"
              returnKeyType="search"
              onSubmitEditing={buscar}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar"
            onPress={buscar}
            style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
          >
            <Text style={styles.searchButtonText}>→</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <LinearGradient
            pointerEvents="none"
            colors={['#0C315D', '#342A79', '#7A2E88', '#136A78']}
            locations={[0, 0.38, 0.70, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />
          <Text style={styles.heroEyebrow}>NEXO · OPORTUNIDADES REALES</Text>
          <Text style={styles.heroTitle}>Tu talento</Text>
          <Text style={[styles.heroTitle, styles.heroAccent]}>sin límites.</Text>
          <Text style={styles.heroText}>
            Empleos, servicios y productos en un solo lugar, con una experiencia clara y profesional.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}
            onPress={() => router.push('/explorar')}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['#56ECFF', '#7E8BFF', '#F17BE4']}
              style={styles.heroButtonGradient}
            />
            <Text style={styles.heroButtonText}>Explorar ahora</Text>
            <Text style={styles.heroButtonArrow}>→</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: palette.title }]}>Elige tu siguiente paso</Text>
        <Text style={[styles.sectionSub, { color: palette.muted }]}>Todo conectado dentro de Nexo.</Text>

        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
              onPress={action.onPress}
            >
              <LinearGradient
                pointerEvents="none"
                colors={action.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              />
              <View pointerEvents="none" style={styles.actionGlowOne} />
              <View pointerEvents="none" style={styles.actionGlowTwo} />
              <View pointerEvents="none" style={styles.actionGloss} />
              <View pointerEvents="none" style={styles.actionWatermark}>
                <Text style={styles.actionWatermarkText}>✦</Text>
              </View>
              <View style={styles.iconOrb}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <View style={styles.actionArrow}>
                <Text style={styles.actionArrowText}>›</Text>
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionText}>{action.text}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.infoBanner}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(26,55,92,0.98)', 'rgba(47,39,91,0.98)', 'rgba(15,84,89,0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.infoGradient}
          />
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>✦</Text>
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Un solo Nexo, muchas posibilidades</Text>
            <Text style={styles.infoText}>Busca, publica y conecta sin perderte entre pantallas complicadas.</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: palette.title }]}>Explora por categoría</Text>
            <Text style={[styles.sectionSub, { color: palette.muted }]}>Encuentra más rápido lo que necesitas.</Text>
          </View>
        </View>

        <View style={styles.categories}>
          {categorias.map((categoria) => (
            <Pressable
              accessibilityRole="button"
              key={categoria}
              style={({ pressed }) => [styles.category, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/explorar', params: { categoria } })}
            >
              <LinearGradient
                pointerEvents="none"
                colors={palette.secondary}
                style={styles.categoryGradient}
              />
              <Text style={[styles.categoryText, { color: palette.secondaryText }]}>{categoria}</Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.category, styles.newCategory, pressed && styles.pressed]}
            onPress={() => router.push('/publicar/categoria')}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(22,106,111,0.96)', 'rgba(90,53,133,0.96)']}
              style={styles.categoryGradient}
            />
            <Text style={styles.newCategoryText}>+ Agregar nueva opción</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerLogo, { color: palette.title }]}>Nexo</Text>
          <Text style={[styles.footerText, { color: palette.muted }]}>Conectando personas, trabajo y oportunidades.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#061225',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#061225',
  },
  glowOne: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    top: -120,
    left: -120,
    backgroundColor: 'rgba(0,210,255,0.12)',
  },
  glowTwo: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 999,
    top: 220,
    right: -240,
    backgroundColor: 'rgba(206,74,255,0.12)',
  },
  container: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 70,
  },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  brand: {
    flex: 1,
  },
  brandLogo: {
    width: 138,
    height: 72,
    marginLeft: -8,
    marginTop: -10,
    marginBottom: -8,
  },
  logoSub: {
    color: '#99A9CA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 9,
    maxWidth: '52%',
  },
  accountName: {
    maxWidth: 118,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  profile: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.84)',
    borderColor: 'rgba(152,195,255,0.58)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(56,45,132,0.92)',
    boxShadow: '0 8px 18px rgba(89,74,255,0.28)',
  },
  profileGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  profileText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  loginButton: {
    minHeight: 39,
    paddingHorizontal: 13,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,39,65,0.54)',
    borderWidth: 1,
    borderColor: 'rgba(136,177,226,0.34)',
  },
  loginButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  registerButton: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 39,
    paddingHorizontal: 14,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,247,255,0.72)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(68,54,139,0.88)',
  },
  registerGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 13,
  },
  registerButtonText: {
    color: '#081522',
    fontSize: 12,
    fontWeight: '900',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 16,
  },
  welcomeCopy: {
    flex: 1,
  },
  hello: {
    color: '#A6B7D8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,52,83,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(124,174,225,0.32)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    color: '#4CF0CE',
    fontSize: 10,
  },
  statusText: {
    color: '#C9D8F2',
    fontSize: 11,
    fontWeight: '800',
  },
  searchShell: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderTopColor: 'rgba(230,242,255,0.62)',
    borderColor: 'rgba(121,166,222,0.38)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(40,44,94,0.96)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
    marginBottom: 18,
  },
  searchGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 20,
  },
  searchIcon: {
    color: '#EAF3FF',
    fontSize: 30,
    marginLeft: 17,
    marginRight: 10,
    marginTop: -3,
  },
  searchInputWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    justifyContent: 'center',
    position: 'relative',
  },
  searchPlaceholder: {
    position: 'absolute',
    left: 0,
    right: 4,
    color: '#171A1F',
    fontSize: 15,
    fontWeight: '900',
    opacity: 1,
  },
  input: {
    width: '100%',
    minHeight: 58,
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    opacity: 1,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
  } as any,
  searchButton: {
    width: 44,
    height: 44,
    marginRight: 8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(180,91,255,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(214,159,255,0.58)',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    minHeight: 285,
    padding: 26,
    marginBottom: 28,
    borderWidth: 1,
    borderTopColor: 'rgba(237,247,255,0.68)',
    borderColor: 'rgba(134,180,226,0.42)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(58,43,123,0.98)',
    boxShadow: '0 16px 34px rgba(0,0,0,0.34)',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 30,
  },
  heroOrbOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -48,
    right: -30,
    backgroundColor: 'rgba(102,231,255,0.18)',
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    bottom: -96,
    right: 38,
    backgroundColor: 'rgba(248,91,214,0.20)',
  },
  heroEyebrow: {
    color: '#B9DFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 37,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroAccent: {
    color: '#8EECFF',
    fontStyle: 'italic',
  },
  heroText: {
    color: '#D4DDF5',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 650,
  },
  heroButton: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 50,
    marginTop: 20,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: '#FFFFFF',
    borderColor: 'rgba(190,220,255,0.88)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(76,46,138,0.95)',
    boxShadow: '0 10px 20px rgba(45,97,255,0.26)',
  },
  heroButtonGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  heroButtonText: {
    color: '#071529',
    fontWeight: '900',
    fontSize: 15,
  },
  heroButtonArrow: {
    color: '#071529',
    fontWeight: '900',
    fontSize: 20,
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#F8FAFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  sectionSub: {
    color: '#92A4C6',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  actionCard: {
    position: 'relative',
    overflow: 'hidden',
    flexGrow: 1,
    flexBasis: 230,
    minHeight: 205,
    borderRadius: 24,
    padding: 19,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.84)',
    borderColor: 'rgba(176,200,255,0.48)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(39,39,92,0.92)',
    boxShadow: '0 12px 25px rgba(0,0,0,0.30)',
  },
  actionGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
  },
  actionGlowOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -72,
    right: -46,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  actionGlowTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    bottom: -74,
    left: -32,
    backgroundColor: 'rgba(9,19,54,0.16)',
  },
  actionGloss: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  actionWatermark: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    opacity: 0.12,
  },
  actionWatermarkText: {
    color: '#FFFFFF',
    fontSize: 72,
    lineHeight: 74,
    fontWeight: '900',
  },
  iconOrb: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    marginBottom: 18,
    boxShadow: '0 8px 14px rgba(0,0,0,0.18)',
  },
  actionEmoji: {
    fontSize: 29,
  },
  actionArrow: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  actionArrowText: {
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 31,
    marginTop: -3,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  actionText: {
    color: '#E1E7F6',
    fontSize: 14,
    lineHeight: 20,
  },
  infoBanner: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 23,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderTopColor: 'rgba(235,246,255,0.58)',
    borderColor: 'rgba(127,161,211,0.38)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(42,42,88,0.95)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
  },
  infoGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 23,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100,116,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(140,222,255,0.46)',
  },
  infoIconText: {
    color: '#99F3FF',
    fontSize: 23,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  infoText: {
    color: '#B8C8E4',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  category: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(225,239,255,0.55)',
    borderColor: 'rgba(119,151,201,0.36)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(33,38,76,0.94)',
  },
  categoryGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
  categoryText: {
    color: '#E5EDFF',
    fontWeight: '800',
    fontSize: 13,
  },
  newCategory: {
    borderColor: 'rgba(111,226,214,0.52)',
  },
  newCategoryText: {
    color: '#D6FFFA',
    fontWeight: '900',
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerLogo: {
    color: '#EAF4FF',
    fontSize: 22,
    fontWeight: '900',
  },
  footerText: {
    color: '#8294B7',
    fontSize: 12,
    marginTop: 4,
  },
  pressed: {
    transform: [{ translateY: 2 }, { scale: 0.988 }],
    opacity: 0.92,
  },
});
