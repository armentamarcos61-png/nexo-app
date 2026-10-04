import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

const RESET_ENDPOINT =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/reset-password';

const ACCOUNTS_KEY = 'nexo.local-accounts.v1';
const LAST_RECOVERY_EMAIL_KEY = 'nexo.last-recovery-email';

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function derivePassword(password: string, saltBase64: string) {
  const binary = atob(saltBase64);
  const salt = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function updateLegacyLocalPassword(password: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const email = window.localStorage
    .getItem(LAST_RECOVERY_EMAIL_KEY)
    ?.trim()
    .toLowerCase();

  if (!email) return;

  try {
    const rawAccounts = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!rawAccounts) return;

    const accounts = JSON.parse(rawAccounts);
    if (!Array.isArray(accounts)) return;

    const index = accounts.findIndex(
      (account) =>
        typeof account?.email === 'string' &&
        account.email.trim().toLowerCase() === email
    );

    if (index < 0) return;

    const saltBytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(saltBytes);
    const passwordSalt = bytesToBase64(saltBytes);
    const passwordHash = await derivePassword(password, passwordSalt);

    accounts[index] = {
      ...accounts[index],
      passwordSalt,
      passwordHash,
    };

    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // El backend ya habrá cambiado la contraseña aunque la copia local antigua no exista.
  }
}

function readRecoveryParams() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { token: '', requestId: '' };
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);

  return {
    token: hash.get('access_token') || '',
    requestId: query.get('request') || '',
  };
}

export default function RestablecerContrasenaScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [recoveryParams] = useState(readRecoveryParams);
  const [token, setToken] = useState(recoveryParams.token);
  const [requestId, setRequestId] = useState(recoveryParams.requestId);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setMessage('');

    if (!token || !requestId) {
      setError(
        'Este enlace no es válido, ya venció o fue reemplazado. Solicita uno nuevo.'
      );
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError(
        'La contraseña debe tener al menos 8 caracteres e incluir letras y números.'
      );
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(RESET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password,
          requestId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo actualizar la contraseña.'
        );
      }

      await updateLegacyLocalPassword(password);

      setPassword('');
      setConfirm('');
      setToken('');
      setRequestId('');
      setMessage(
        'Contraseña actualizada correctamente. Este enlace ya quedó inutilizado.'
      );

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(
          {},
          '',
          '/nexo-app/restablecer-contrasena'
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo actualizar la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <NexoScreen title="Nueva contraseña">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>
          Crea tu nueva contraseña
        </Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          El enlace es temporal. Cuando guardes la nueva contraseña, ese enlace deja de funcionar.
        </Text>
      </View>

      <Field
        label="Nueva contraseña *"
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
        onSubmitEditing={submit}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!!message && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{message}</Text>
        </View>
      )}

      <Action
        label={loading ? 'Guardando…' : 'Guardar nueva contraseña'}
        onPress={submit}
        disabled={loading}
      />

      <Action
        label="Volver a iniciar sesión"
        secondary
        onPress={() => router.replace('/iniciar-sesion')}
      />
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
  error: {
    color: '#FF9CAF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  statusBox: {
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(113,230,255,0.48)',
    backgroundColor: 'rgba(40,149,184,0.16)',
  },
  statusText: {
    color: '#D9F8FF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
});
