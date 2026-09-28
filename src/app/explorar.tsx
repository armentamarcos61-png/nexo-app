import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, Field, NexoScreen, ui } from '@/components/nexo-screen';
import { categorias } from '@/constants/categories';

export default function ExplorarScreen() {
  const params = useLocalSearchParams<{ q?: string; categoria?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  function buscar() { router.setParams({ q: query.trim() }); }
  return <NexoScreen title="Explorar Nexo">
    <Field label="Buscar servicios y productos" value={query} onChangeText={setQuery} placeholder="¿Qué necesitas?" returnKeyType="search" onSubmitEditing={buscar} />
    <Action label="Buscar" onPress={buscar} />
    <View style={ui.row}>{['Todas', ...categorias].map(item => <Action key={item} label={item} secondary={(params.categoria || 'Todas') !== item} onPress={() => router.setParams({ categoria: item === 'Todas' ? '' : item })} />)}</View>
    <View style={ui.card}>
      <Text style={ui.label}>{params.q ? `Búsqueda: ${params.q}` : 'Servicios y productos'}{params.categoria ? ` · ${params.categoria}` : ''}</Text>
      <Text style={ui.text}>Todavía no hay un catálogo público conectado. Aquí aparecerán las publicaciones cuando esté disponible.</Text>
      <Action label="Preparar una necesidad" onPress={() => router.push('/publicar/necesidad')} />
    </View>
  </NexoScreen>;
}
