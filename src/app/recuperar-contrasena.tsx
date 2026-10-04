import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';
import { getAppearancePalette, useAppearance } from '@/state/appearance';

const RECOVERY_ENDPOINT =
  'https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/request-password-reset';

const LAST_RECOVERY_EMAIL_KEY = 'nexo.last-recovery-email';

export default function RecuperarContrasenaScreen() {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function submit() {
    if (loading || cooldown > 0) return;

    setError('');
    setMessage('');

    const normalized = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setError('Escribe el correo con el que registraste tu cuenta.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(RECOVERY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : 'No se pudo enviar el enlace. Inténtalo otra vez.'
        );
      }

      const seconds =
        typeof data?.cooldownSeconds === 'number'
          ? Math.max(0, Math.ceil(data.cooldownSeconds))
          : 60;

      setSentOnce(true);
      setCooldown(seconds);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_RECOVERY_EMAIL_KEY, normalized);
      }

      if (data?.sent === false) {
        setMessage(
          `Ya se solicitó un enlace hace poco. Podrás volver a enviarlo en ${seconds} segundos.`
        );
      } else {
        setMessage(
          'Enlace solicitado. Normalmente debe llegar en menos de 3 minutos. Revisa también Spam o Correo no deseado. El enlace vence a los 15 minutos y, si solicitas otro, el anterior dejará de servir.'
        );
      }
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

  const buttonLabel = loading
    ? 'Enviando enlace…'
    : sentOnce
      ? cooldown > 0
        ? `Volver a enviar en ${cooldown}s`
        : 'Volver a enviar enlace de recuperación'
      : 'Enviar enlace de recuperación';

  return (
    <NexoScreen title="Recuperar contraseña">
      <View style={[styles.notice, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.noticeTitle, { color: palette.title }]}>
          Recupera tu cuenta de forma segura
        </Text>
        <Text style={[styles.noticeText, { color: palette.text }]}>
          Escribe el correo que registraste. Nexo enviará un enlace de recuperación para que puedas crear una contraseña nueva.
        </Text>
      </View>

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
        onSubmitEditing={submit}
      />

      <Text style={[styles.securityNote, { color: palette.muted }]}>
        🔒 Nexo nunca mostrará tu contraseña anterior. Cada solicitud genera un solo enlace temporal y evita envíos repetidos.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!!message && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{message}</Text>
        </View>
      )}

      <Action
        label={buttonLabel}
        onPress={submit}
        disabled={loading || cooldown > 0}
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
