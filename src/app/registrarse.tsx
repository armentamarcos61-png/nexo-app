import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { useAuth } from '@/state/auth';
import { useProfessionalProfile } from '@/state/professional-profile';

function validBirthDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && year >= 1900
    && year <= new Date().getFullYear();
}

export default function RegistrarseScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const { register } = useAuth();
  const { updateField } = useProfessionalProfile();

  const [firstName, setFirstName] = useState('');
  const [firstSurname, setFirstSurname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');

    if (!firstName.trim() || !firstSurname.trim()) {
      setError('Escribe tu primer nombre y tu primer apellido.');
      return;
    }

    if (!/^[a-zA-Z0-9._]{3,24}$/.test(username.trim())) {
      setError('El nombre de usuario debe tener entre 3 y 24 caracteres y usar letras, números, punto o guion bajo.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    if (!validBirthDate(birthDate)) {
      setError('Escribe la fecha de nacimiento como DD/MM/AAAA.');
      return;
    }

    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const result = await register({
      username,
      email,
      firstName,
      firstSurname,
      password,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    updateField('firstName', firstName.trim());
    updateField('firstSurname', firstSurname.trim());
    setPassword('');
    setConfirm('');
    router.replace('/');
  }

  return (
    <NexoScreen title="Crear cuenta">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>Cuenta Nexo funcional</Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          Al registrarte quedas conectado de inmediato. Tu nombre, perfil y fotos guardadas en este navegador seguirán disponibles al volver a iniciar sesión.
        </Text>
      </View>

      <Field
        label="Primer nombre *"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Ej. Juan"
        autoCapitalize="words"
        maxLength={40}
      />

      <Field
        label="Primer apellido *"
        value={firstSurname}
        onChangeText={setFirstSurname}
        placeholder="Ej. Arriola"
        autoCapitalize="words"
        maxLength={50}
      />

      <Field
        label="Nombre de usuario *"
        value={username}
        onChangeText={setUsername}
        placeholder="Ej. juan.arriola"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        maxLength={24}
      />

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
        label="Fecha de nacimiento *"
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="DD/MM/AAAA"
        keyboardType="numeric"
        maxLength={10}
      />

      <Field
        label="Contraseña *"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        maxLength={72}
      />

      <Field
        label="Confirmar contraseña *"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repite tu contraseña"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        maxLength={72}
        onSubmitEditing={submit}
      />

      <Text style={[styles.securityNote, { color: palette.muted }]}>
        🔒 Nexo no guarda la contraseña en texto legible. Esta versión conserva la cuenta en este navegador mientras conectamos el backend seguro para sincronizar entre dispositivos.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Action label={loading ? 'Creando cuenta…' : 'Registrarme'} onPress={submit} disabled={loading} />
      <Action label="Ya tengo cuenta · Iniciar sesión" secondary onPress={() => router.push('/iniciar-sesion')} />
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
});
