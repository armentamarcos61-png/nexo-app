import { router, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AssistantAvatar } from '@/components/assistant-avatar';
import { useAssistant } from '@/state/assistant';

const hiddenRoutes = new Set([
  '/registrarse',
  '/iniciar-sesion',
  '/olvide-contrasena',
  '/restablecer-contrasena',
  '/elegir-asistente',
  '/asistente',
]);

export function AssistantFloatingLayer() {
  const pathname = usePathname();
  const { assistant } = useAssistant();

  if (!assistant || hiddenRoutes.has(pathname)) return null;

  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View style={styles.label}>
        <Text style={styles.labelText}>{assistant.name}</Text>
      </View>
      <AssistantAvatar
        profile={assistant}
        size={62}
        onPress={() => router.push({ pathname: '/asistente', params: { from: pathname } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    right: 18,
    bottom: 22,
    zIndex: 80,
    alignItems: 'center',
    gap: 5,
  },
  label: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(7,16,32,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(137,185,255,0.36)',
  },
  labelText: {
    color: '#EAF2FF',
    fontSize: 10,
    fontWeight: '900',
  },
});
