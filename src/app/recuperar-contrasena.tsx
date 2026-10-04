import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

const REQUEST_CODE_ENDPOINT =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/request-recovery-code';
const VERIFY_CODE_ENDPOINT =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/verify-recovery-code';
const RESET_ENDPOINT =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/reset-password';

const ACCOUNTS_KEY = 'nexo.local-accounts.v1';
const LAST_RECOVERY_EMAIL_KEY = 'nexo.last-recovery-email';

type RecoveryStep = 'email' | 'code' | 'choice' | 'password' | 'done';

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

async function updateLegacyLocalPassword(email: string, password: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

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
    // Si no existe una cuenta local antigua, el cambio del backend sigue siendo válido.
  }
}

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Escribir código de seis dígitos"
      onPress={() => inputRef.current?.focus()}
      style={styles.codePressable}
    >
      <View style={styles.codeRow}>
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.codeBox,
              index === value.length && value.length < 6 && styles.codeBoxActive,
            ]}
          >
            <Text style={styles.codeDigit}>{digit === ' ' ? '' : digit}</Text>
          </View>
        ))}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) =>
          onChange(text.replace(/\D/g, '').slice(0, 6))
        }
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        editable={!disabled}
        caretHidden
        style={styles.hiddenCodeInput}
      />
    </Pressable>
  );
}

export default function RecuperarContrasenaScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    if (loading || cooldown > 0) return;

    setError('');
    setMessage('');

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Escribe el correo con el que registraste tu cuenta.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(REQUEST_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo enviar el código.'
        );
      }

      const seconds =
        typeof data?.cooldownSeconds === 'number'
          ? Math.max(0, Math.ceil(data.cooldownSeconds))
          : 60;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem(
          LAST_RECOVERY_EMAIL_KEY,
          normalizedEmail
        );
      }

      setCode('');
      setCooldown(seconds);
      setStep('code');
      setMessage(
        'Te enviamos un código de 6 dígitos. Revisa también Spam o Correo no deseado.'
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo conectar con el servicio de recuperación.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (loading) return;

    setError('');
    setMessage('');

    if (!/^\d{6}$/.test(code)) {
      setError('Escribe los 6 números del código.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(VERIFY_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          code,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data?.accessToken !== 'string') {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo verificar el código.'
        );
      }

      setAccessToken(data.accessToken);
      setStep('choice');
      setMessage('');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No se pudo verificar el código.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveNewPassword() {
    if (loading) return;

    setError('');
    setMessage('');

    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError(
        'La contraseña debe tener entre 8 y 72 caracteres e incluir letras y números.'
      );
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!accessToken) {
      setError('La verificación venció. Solicita un código nuevo.');
      setStep('email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(RESET_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo actualizar la contraseña.'
        );
      }

      await updateLegacyLocalPassword(normalizedEmail, password);

      setPassword('');
      setConfirm('');
      setCode('');
      setAccessToken('');
      setStep('done');
      setMessage('Tu contraseña se actualizó correctamente.');
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

  function keepCurrentPassword() {
    setAccessToken('');
    setCode('');
    setPassword('');
    setConfirm('');
    router.replace('/iniciar-sesion');
  }

  return (
    <NexoScreen title="Recuperar contraseña">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>
          Recupera tu cuenta de forma segura
        </Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          {step === 'email' &&
            'Escribe el correo que registraste. Nexo te enviará un código de 6 dígitos.'}
          {step === 'code' &&
            'Escribe el código que llegó a tu correo. No necesitas abrir ningún enlace.'}
          {step === 'choice' &&
            'Correo verificado. Elige si quieres cambiar tu contraseña o conservar la actual.'}
          {step === 'password' &&
            'Crea una contraseña nueva. Tu contraseña anterior nunca será mostrada.'}
          {step === 'done' &&
            'La recuperación terminó. Ya puedes volver a iniciar sesión.'}
        </Text>
      </View>

      {step === 'email' && (
        <>
          <Field
            label="Correo registrado *"
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            maxLength={160}
            onSubmitEditing={sendCode}
          />

          <Text style={[styles.securityNote, { color: palette.muted }]}>
            🔒 Nexo nunca mostrará ni enviará tu contraseña actual.
          </Text>

          <Action
            label={loading ? 'Enviando código…' : 'Enviar código de 6 dígitos'}
            onPress={sendCode}
            disabled={loading}
          />
        </>
      )}

      {step === 'code' && (
        <>
          <Text style={[styles.codeLabel, { color: palette.title }]}>
            Código de verificación
          </Text>

          <OtpBoxes value={code} onChange={setCode} disabled={loading} />

          <Text style={[styles.securityNote, { color: palette.muted }]}>
            El código es temporal y solo puede utilizarse una vez.
          </Text>

          <Action
            label={loading ? 'Verificando…' : 'Verificar código'}
            onPress={verifyCode}
            disabled={loading || code.length !== 6}
          />

          <Action
            label={
              cooldown > 0
                ? `Reenviar código en ${cooldown}s`
                : 'Reenviar código'
            }
            secondary
            onPress={sendCode}
            disabled={loading || cooldown > 0}
          />

          <Action
            label="Cambiar correo"
            secondary
            onPress={() => {
              setCode('');
              setError('');
              setMessage('');
              setStep('email');
            }}
          />
        </>
      )}

      {step === 'choice' && (
        <>
          <View style={styles.verifiedBox}>
            <Text style={styles.verifiedTitle}>✓ Correo verificado</Text>
            <Text style={styles.verifiedText}>
              Tu contraseña actual permanece oculta. Nexo no puede mostrarla ni enviarla por correo.
            </Text>
          </View>

          <Action
            label="Restablecer contraseña"
            onPress={() => setStep('password')}
          />

          <Action
            label="Conservar mi contraseña actual"
            secondary
            onPress={keepCurrentPassword}
          />
        </>
      )}

      {step === 'password' && (
        <>
          <Field
            label="Nueva contraseña *"
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
            onSubmitEditing={saveNewPassword}
          />

          <Action
            label={loading ? 'Guardando…' : 'Guardar nueva contraseña'}
            onPress={saveNewPassword}
            disabled={loading}
          />

          <Action
            label="Volver"
            secondary
            onPress={() => {
              setPassword('');
              setConfirm('');
              setError('');
              setStep('choice');
            }}
          />
        </>
      )}

      {step === 'done' && (
        <Action
          label="Volver a iniciar sesión"
          onPress={() => router.replace('/iniciar-sesion')}
        />
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!!message && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{message}</Text>
        </View>
      )}

      {step !== 'choice' && step !== 'password' && step !== 'done' && (
        <Action
          label="Volver a iniciar sesión"
          secondary
          onPress={() => router.replace('/iniciar-sesion')}
        />
      )}
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
  codeLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  codePressable: {
    position: 'relative',
    minHeight: 62,
    justifyContent: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  codeBox: {
    flex: 1,
    minWidth: 38,
    maxWidth: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(150,190,255,0.42)',
    backgroundColor: 'rgba(232,239,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  codeBoxActive: {
    borderWidth: 2,
    borderColor: '#74DFFF',
  },
  codeDigit: {
    color: '#071322',
    fontSize: 23,
    fontWeight: '900',
  },
  hiddenCodeInput: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  verifiedBox: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(112,255,190,0.42)',
    backgroundColor: 'rgba(54,180,120,0.13)',
  },
  verifiedTitle: {
    color: '#A9FFD2',
    fontSize: 15,
    fontWeight: '900',
  },
  verifiedText: {
    color: '#DCE7F7',
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
