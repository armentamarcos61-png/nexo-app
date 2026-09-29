import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, NexoScreen, ui } from '@/components/nexo-screen';
import { storageNotice, tipos, useDrafts } from '@/state/drafts';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

export default function BorradoresScreen() {
  const { drafts, ready } = useDrafts();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  return <NexoScreen title="Mis borradores">
    <Text style={[ui.text, { color: palette.text }]}>{storageNotice}</Text>
    {!ready ? <Text style={[ui.text, { color: palette.text }]}>Cargando…</Text> : !drafts.length ? <Text style={[ui.text, { color: palette.text }]}>Aún no tienes borradores. Comienza con lo que necesitas u ofreces.</Text> : drafts.map(draft => <View key={draft.id} style={ui.card}>
      <Text style={[ui.link, { color: palette.title }]}>{tipos[draft.tipo]} · Borrador</Text>
      <Text style={[ui.label, { color: palette.title }]}>{draft.titulo}</Text>
      <Text style={[ui.text, { color: palette.text }]}>{draft.descripcion}</Text>
      {draft.tipo !== 'categoria' && <><Text style={[ui.text, { color: palette.text }]}>{draft.categoria} · {draft.ubicacion}</Text><Text style={[ui.text, { color: palette.text }]}>{draft.importe ? `$${draft.importe} MXN` : 'Importe por acordar'}</Text></>}
    </View>)}
    <Action label="Volver al inicio" onPress={() => router.replace('/')} />
  </NexoScreen>;
}
