import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, NexoScreen, ui } from '@/components/nexo-screen';
import { storageNotice, tipos, useDrafts } from '@/state/drafts';

export default function BorradoresScreen() {
  const { drafts, ready } = useDrafts();
  return <NexoScreen title="Mis borradores">
    <Text style={ui.text}>{storageNotice}</Text>
    {!ready ? <Text style={ui.text}>Cargando…</Text> : !drafts.length ? <Text style={ui.text}>Aún no tienes borradores. Comienza con lo que necesitas u ofreces.</Text> : drafts.map(draft => <View key={draft.id} style={ui.card}>
      <Text style={ui.link}>{tipos[draft.tipo]} · Borrador</Text>
      <Text style={ui.label}>{draft.titulo}</Text>
      <Text style={ui.text}>{draft.descripcion}</Text>
      {draft.tipo !== 'categoria' && <><Text style={ui.text}>{draft.categoria} · {draft.ubicacion}</Text><Text style={ui.text}>{draft.importe ? `$${draft.importe} MXN` : 'Importe por acordar'}</Text></>}
    </View>)}
    <Action label="Volver al inicio" onPress={() => router.replace('/')} />
  </NexoScreen>;
}
