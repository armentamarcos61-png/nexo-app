import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

export default function IniciarSesionScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [readyMessage, setReadyMessage] = useState('');

  function submit() {
    setReadyMessage('');

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    if (!password) {
      setError('Escribe tu contraseña.');
      return;
    }

    setPassword('');
    setError('');
    setReadyMessage(
      'La interfaz de inicio de sesión ya está lista. El acceso real se activará cuando conectemos Nexo al sistema seguro de cuentas; esta contraseña no se almacenó.'
    );
  }

  return (
    <NexoScreen title="Iniciar sesión">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>Bienvenido a Nexo</Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          Esta pantalla ya queda preparada para conectar la autenticación segura más adelante.
        </Text>
      </View>

      <Field
        label="Correo electrónico *"
        value={email}
        onChangeText={setEmail}
        placeholder="correo@ejemplo.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        maxLength={160}
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
      />

      <Text style={[styles.securityNote, { color: palette.muted }]}>
        🔒 Mientras no conectemos el backend seguro, Nexo no almacena el correo ni la contraseña de este formulario.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!readyMessage && (
        <View style={styles.success}>
          <Text style={styles.successText}>{readyMessage}</Text>
        </View>
      )}

      <Action label="Iniciar sesión" onPress={submit} />
      <Action label="Crear una cuenta" secondary onPress={() => router.push('/registrarse')} />
      {!!readyMessage && <Action label="Volver al inicio" secondary onPress={() => router.replace('/')} />}
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
  success: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(31,116,89,0.26)',
    borderWidth: 1,
    borderColor: 'rgba(81,225,175,0.34)',
  },
  successText: {
    color: '#DFFFF2',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
});
