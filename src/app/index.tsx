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

        <View style={styles.hero}>
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
            style={styles.primaryButton}
            onPress={buscar}
          >
            <Text style={styles.primaryButtonText}>Buscar en Nexo</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Tu próximo paso empieza aquí ✨</Text>

        <View style={styles.actionGrid}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionCard, styles.hireCard, pressed && styles.cardPressed]}
            onPress={() => router.push('/publicar/necesidad')}
          >
            <Text style={styles.actionEmoji}>🔎</Text>
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
            <Text style={styles.actionEmoji}>🛠️</Text>
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
            <Text style={styles.actionEmoji}>📦</Text>
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
            <Text style={styles.actionEmoji}>🤝</Text>
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
  brand: { flex: 1, paddingRight: 12 },
  logoAccent: { color: '#7042CC', fontStyle: 'italic' },
  logoDot: { color: '#C95725' },
  heroAccent: { color: '#FFD47D', fontStyle: 'italic' },
  hireCard: { backgroundColor: '#EEE3FF', borderColor: '#C6A9F2' },
  serviceCard: { backgroundColor: '#D8F5E9', borderColor: '#8CCEB6' },
  productCard: { backgroundColor: '#FFE6D3', borderColor: '#ECB58D' },
  exploreCard: { backgroundColor: '#E0EEFF', borderColor: '#A4C5EF' },
  cardPressed: { opacity: 0.8 },

  safe: {
    flex: 1,
    backgroundColor: '#FFF8F0',
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
    backgroundColor: '#5635B5',
    borderRadius: 28,
    padding: 26,
    marginBottom: 30,
  },

  heroSmall: {
    color: '#FFE6A7',
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
    backgroundColor: '#FFC65C',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#382509',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DACCEA',
  },

  actionEmoji: {
    fontSize: 30,
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292344',
    marginBottom: 6,
  },

  actionText: {
    color: '#625A73',
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
    borderColor: '#34D399',
    backgroundColor: '#D8F5E9',
  },

  newCategoryText: {
    color: '#047857',
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#F0E7FF',
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

