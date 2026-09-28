import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categorias } from '@/constants/categories';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';

export default function HomeScreen() {
  const [busqueda, setBusqueda] = useState('');
  function buscar() {
    router.push({ pathname: '/explorar', params: { q: busqueda.trim() } });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.logo}>Ne<Text style={styles.logoAccent}>xo</Text><Text style={styles.logoDot}>.</Text></Text>
            <Text style={styles.logoSub}>
              Talento, servicios y productos en un solo lugar
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.profile}
            onPress={() => router.push('/perfil')}
          >
            <Text style={styles.profileText}>N</Text>
          </Pressable>
        </View>

        <LinearGradient colors={['#254B57', '#424569', '#594969']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroSmall}>👋 QUÉ BUENO VERTE POR AQUÍ</Text>

          <Text style={styles.heroTitle}>
            Conecta con talento.{'\n'}
            <Text style={styles.heroAccent}>Haz que suceda.</Text>
          </Text>

          <Text style={styles.heroText}>
            Contrata profesionales, descubre negocios, encuentra productos
            y ofrece lo que sabes hacer.
          </Text>

          <View style={styles.search}>
            <Text style={styles.searchIcon}>🔎</Text>

            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="¿Qué necesitas?"
              placeholderTextColor="#777"
              style={styles.input}
              onSubmitEditing={buscar}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.cardPressed]}
            onPress={buscar}
          >
            <LinearGradient pointerEvents="none" colors={['#B5D2CC', '#B4BDCF', '#CABED1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonSheen} />
            <Text style={styles.primaryButtonText}>Buscar en Nexo</Text>
          </Pressable>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Tu próximo paso empieza aquí ✨</Text>

        <View style={styles.actionGrid}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, styles.hireCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/publicar/necesidad')}
          >
            <LinearGradient pointerEvents="none" colors={["#40576C","#55516E","#3B5460"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
            <View style={styles.emojiBadge}><Text style={styles.actionEmoji}>🔎</Text></View>
            <Text style={styles.actionTitle}>Necesito contratar</Text>
            <Text style={styles.actionText}>
              Publica lo que necesitas y recibe propuestas.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, styles.serviceCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/publicar/servicio')}
          >
            <LinearGradient pointerEvents="none" colors={["#285E61","#465A70","#4E5368"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
            <View style={styles.emojiBadge}><Text style={styles.actionEmoji}>🛠️</Text></View>
            <Text style={styles.actionTitle}>Ofrezco un servicio</Text>
            <Text style={styles.actionText}>
              Muestra tus habilidades y consigue clientes.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, styles.productCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/publicar/producto')}
          >
            <LinearGradient pointerEvents="none" colors={["#675052","#60566E","#47566D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
            <View style={styles.emojiBadge}><Text style={styles.actionEmoji}>📦</Text></View>
            <Text style={styles.actionTitle}>Vendo un producto</Text>
            <Text style={styles.actionText}>
              Publica productos físicos y llega a nuevos compradores.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, styles.exploreCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/explorar')}
          >
            <LinearGradient pointerEvents="none" colors={["#3D5474","#535777","#3F6269"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardSheen} />
            <View style={styles.emojiBadge}><Text style={styles.actionEmoji}>🤝</Text></View>
            <Text style={styles.actionTitle}>Explorar Nexo</Text>
            <Text style={styles.actionText}>
              Descubre profesionales, negocios, servicios y productos.
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Encuentra lo tuyo 🧭</Text>

        <View style={styles.categories}>
          {categorias.map((categoria) => (
            <Pressable
              accessibilityRole="button"
              key={categoria}
              style={styles.category}
              onPress={() => router.push({ pathname: '/explorar', params: { categoria } })}
            >
              <Text style={styles.categoryText}>{categoria}</Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            style={[styles.category, styles.newCategory]}
            onPress={() => router.push('/publicar/categoria')}
          >
            <Text style={styles.newCategoryText}>+ Agregar nueva opción</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            💡 ¿Falta lo que tú haces?
          </Text>

          <Text style={styles.infoText}>
            En Nexo el catálogo puede crecer. Podrás proponer nuevas
            profesiones, oficios, servicios, productos y tipos de vendedor
            para revisión.
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() => router.push('/publicar/categoria')}
          >
            <Text style={styles.secondaryButtonText}>
              Proponer nueva categoría
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>Nexo</Text>
          <Text style={styles.footerText}>
            Conectando personas, trabajo y oportunidades.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardSheen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 },
  buttonSheen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 15 },
  emojiBadge: { alignSelf: 'flex-start', padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.16)', marginBottom: 16, boxShadow: '0 4px 8px rgba(10,22,38,0.18)' },

  brand: { flex: 1, paddingRight: 12 },
  logoAccent: { color: '#536181', fontStyle: 'italic' },
  logoDot: { color: '#507B77' },
  heroAccent: { color: '#D4E4E1', fontStyle: 'italic' },
  hireCard: { backgroundColor: '#40576C', borderColor: '#8A9CAB' },
  serviceCard: { backgroundColor: '#285E61', borderColor: '#7DABA8' },
  productCard: { backgroundColor: '#675052', borderColor: '#AB929A' },
  exploreCard: { backgroundColor: '#3D5474', borderColor: '#8B9FB9' },
  cardPressed: { transform: [{ translateY: 2 }, { scale: 0.985 }], opacity: 0.94 },

  safe: {
    flex: 1,
    backgroundColor: '#ECEEED',
  },

  container: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 60,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  logo: {
    fontSize: 38,
    letterSpacing: -1.8,
    fontWeight: '900',
    color: '#292344',
  },

  logoSub: {
    color: '#625A73',
    fontSize: 13,
    marginTop: 2,
  },

  profile: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#292344',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },

  hero: {
    backgroundColor: '#424569',
    borderWidth: 1,
    borderColor: '#7E8D9C',
    borderTopColor: '#ADBAC3',
    boxShadow: '0 12px 26px rgba(32,44,65,0.2)',
    borderRadius: 28,
    padding: 26,
    marginBottom: 30,
  },

  heroSmall: {
    color: '#DAE6E3',
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 12,
    marginBottom: 12,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    maxWidth: 720,
  },

  heroText: {
    color: '#EFE7FF',
    fontSize: 17,
    lineHeight: 25,
    marginTop: 14,
    maxWidth: 720,
  },

  search: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  searchIcon: {
    fontSize: 28,
    marginRight: 10,
    color: '#292344',
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#292344',
    outlineStyle: 'none',
  } as any,

  primaryButton: {
    marginTop: 12,
    backgroundColor: '#B5C7CB',
    borderWidth: 1,
    borderTopColor: '#EDF5F3',
    borderColor: '#8899AD',
    borderBottomWidth: 3,
    boxShadow: '0 5px 10px rgba(15,25,42,0.22)',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#202D3C',
    fontWeight: '900',
    fontSize: 16,
  },

  sectionTitle: {
    fontSize: 25,
    letterSpacing: -0.6,
    fontWeight: '900',
    color: '#292344',
    marginBottom: 15,
    marginTop: 4,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },

  actionCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#40576C',
    boxShadow: '0 8px 16px rgba(29,43,62,0.18)',
    borderBottomWidth: 3,
    borderTopColor: '#BDC8D4',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DACCEA',
  },

  actionEmoji: {
    fontSize: 30,
  },

  actionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },

  actionText: {
    color: '#E5E8F0',
    lineHeight: 21,
  },

  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },

  category: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD0C3',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },

  categoryText: {
    color: '#374151',
    fontWeight: '700',
  },

  newCategory: {
    borderColor: '#8BAEA5',
    backgroundColor: '#DFE8E4',
  },

  newCategoryText: {
    color: '#047857',
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#DFE4E6',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoTitle: {
    color: '#292344',
    fontSize: 21,
    fontWeight: '900',
  },

  infoText: {
    color: '#625A73',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 8,
  },

  secondaryButton: {
    marginTop: 18,
    alignSelf: 'flex-start',
    backgroundColor: '#292344',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 38,
  },

  footerLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#292344',
  },

  footerText: {
    color: '#625A73',
    fontSize: 12,
    marginTop: 4,
  },
});

