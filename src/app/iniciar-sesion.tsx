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

    const normalizedIdentifier = identifier.trim();
    if (
      normalizedIdentifier.includes('@') &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)
    ) {
      setError('El correo no es válido. Revisa que esté escrito correctamente.');
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
          En este dispositivo puedes entrar con tu usuario o correo. Para acceder desde otro teléfono, utiliza el correo y la contraseña de tu cuenta de Nexo Central después de verificar el correo.
        </Text>
      </View>

      <Field
        label="Usuario o correo *"
        hint="Escribe el usuario que registraste o tu correo completo (ejemplo: nombre@correo.com)."
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
        hint="Escribe tu contraseña tal como la creaste. Puedes tocar el ojo para mostrarla u ocultarla."
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
        🔒 La contraseña no se almacena en texto legible. Los perfiles profesionales solo se sincronizan con el servidor cuando lo autorizas expresamente.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Action label={loading ? 'Entrando…' : 'Iniciar sesión'} onPress={submit} disabled={loading} />
      <Action label="Crear una cuenta" secondary onPress={() => router.push('/registrarse')} />
      <Pressable accessibilityRole="button"
        onPress={() => router.push('/bienvenida')}
        style={{minHeight:44,justifyContent:'center',alignItems:'center'}}>
        <Text style={{color:palette.title,fontSize:12,fontWeight:'800'}}>
          ✦ Ver cómo funciona Nexo antes de entrar
        </Text>
      </Pressable>
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
