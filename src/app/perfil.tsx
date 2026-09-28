import { router } from 'expo-router';
import { Text } from 'react-native';
import { Action, NexoScreen, ui } from '@/components/nexo-screen';

export default function PerfilScreen() {
  return <NexoScreen title="Mi espacio">
    <Text style={ui.text}>Prepara tus necesidades, servicios y productos. El registro de cuentas todavía no está disponible.</Text>
    <Action label="Mis borradores" onPress={() => router.push('/borradores')} />
    <Action label="Ofrezco un servicio" secondary onPress={() => router.push('/publicar/servicio')} />
    <Action label="Vendo un producto" secondary onPress={() => router.push('/publicar/producto')} />
  </NexoScreen>;
}
