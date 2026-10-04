import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { useAuth } from '@/state/auth';

export default function IniciarSesionScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');

    if (!identifier.trim()) {
      setError('Escribe tu nombre de usuario o correo.');
      return;
    }

    if (!password) {
      setError('Escribe tu contraseña.');
      return;
    }

    setLoading(true);
    const result = await signIn(identifier, password);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setPassword('');
    router.replace('/');
  }

  return (
    <NexoScreen title="Iniciar sesión">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>Tu cuenta Nexo</Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          Entra con tu usuario o correo y tu contraseña. Al acceder vuelves a tu perfil, fotos y contenido guardados en este navegador.
        </Text>
      </View>

      <Field
        label="Usuario o correo *"
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="Ej. marcos61 o correo@ejemplo.com"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        maxLength={160}
        onSubmitEditing={submit}
      />

      <Field
        label="Contraseña *"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        maxLength={128}
        onSubmitEditing={submit}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recuperar contraseña"
        onPress={() => router.push('/recuperar-contrasena')}
        style={({ pressed }) => [styles.forgotButton, pressed && styles.forgotPressed]}
      >
        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
      </Pressable>

      <Text style={[styles.securityNote, { color: palette.muted }]}>
        🔒 La contraseña no se guarda en texto legible. Esta etapa funciona en este dispositivo; la sincronización entre dispositivos llegará con el backend seguro.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Action label={loading ? 'Entrando…' : 'Iniciar sesión'} onPress={submit} disabled={loading} />
      <Action label="Crear una cuenta" secondary onPress={() => router.push('/registrarse')} />
    </NexoScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: 6,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(20,35,60,0.48)',
  },
  noticeTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotPressed: {
    opacity: 0.65,
  },
  forgotText: {
    color: '#8FEAFF',
    fontSize: 12,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  securityNote: {
    fontSize: 11,
    lineHeight: 17,
  },
  error: {
    color: '#FF9CAF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
});
