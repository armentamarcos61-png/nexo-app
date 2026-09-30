import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
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
  const { updateField } = useProfessionalProfile();

  const [firstName, setFirstName] = useState('');
  const [firstSurname, setFirstSurname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [readyMessage, setReadyMessage] = useState('');

  function submit() {
    setReadyMessage('');

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

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres e incluir letras y números.');
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    updateField('firstName', firstName.trim());
    updateField('firstSurname', firstSurname.trim());
    setPassword('');
    setConfirm('');
    setError('');
    setReadyMessage(
      'Interfaz de registro lista. Guardé sólo tu nombre visible en Mi espacio. El correo, fecha de nacimiento y contraseña NO se almacenaron; se conectarán cuando activemos la autenticación segura.'
    );
  }

  return (
    <NexoScreen title="Crear cuenta">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>Cuenta Nexo</Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          Completa estos datos para probar el registro. Las credenciales todavía no se guardan hasta conectar la base segura.
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
        maxLength={128}
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
        maxLength={128}
      />

      <Text style={[styles.securityNote, { color: palette.muted }]}>
        🔒 Nexo nunca mostrará ni guardará contraseñas en Excel. Cuando conectemos cuentas reales, la contraseña será gestionada por un sistema de autenticación seguro.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!readyMessage && (
        <View style={styles.success}>
          <Text style={styles.successText}>{readyMessage}</Text>
        </View>
      )}

      <Action label="Registrarme" onPress={submit} />
      <Action label="Ya tengo cuenta · Iniciar sesión" secondary onPress={() => router.push('/iniciar-sesion')} />
      {!!readyMessage && <Action label="Ir a Mi espacio" secondary onPress={() => router.replace('/perfil')} />}
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
