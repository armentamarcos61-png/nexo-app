import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendEmploymentInterest, type EmploymentPost } from '@/lib/nexo-employment-api';
import { useAuth } from '@/state/auth';

type Props = {
  posts: EmploymentPost[];
  loading: boolean;
  error: string;
  searched: boolean;
  onRetry: () => void;
};

function summary(post: EmploymentPost): string {
  const amount = post.payment_min != null || post.payment_max != null
    ? [post.payment_min == null ? '' : '$'+post.payment_min.toLocaleString('es-MX'),
        post.payment_max == null ? '' : '$'+post.payment_max.toLocaleString('es-MX')].filter(Boolean).join(' – ')
    : '';
  return [post.location, post.experience, post.availability, amount ? amount+' MXN' : '', post.payment_unit]
    .filter(Boolean).join(' · ');
}

export function EmploymentResults({ posts, loading, error, searched, onRetry }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  if (!searched) return null;

  function expand(post: EmploymentPost) {
    if (selected === post.id) { setSelected(null); return; }
    setSelected(post.id);
    setLocalError('');
    setMessage(post.kind === 'seeking_job'
      ? 'Hola, vi tu perfil en Nexo y me interesa conocer tu disponibilidad para una oportunidad de trabajo.'
      : 'Hola, me interesa la vacante que publicaste en Nexo. ¿Podemos conversar sobre los requisitos?');
  }
  async function send(post: EmploymentPost) {
    if (!user) { setLocalError('Inicia sesión en Nexo para enviar tu interés.'); return; }
    if (sending) return;
    setSending(true);
    setLocalError('');
    try {
      await sendEmploymentInterest(post, user.username, message);
      setSent((existing) => [...existing, post.id]);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'No se pudo enviar tu mensaje.');
    } finally { setSending(false); }
  }

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>BOLSA DE EMPLEO NEXO</Text>
        <Text style={styles.heading}>Propuestas reales</Text>
        <Text style={styles.description}>
          Toca una tarjeta para consultar los detalles y avisar que te interesa.
        </Text>
      </View>
      {loading && <Text style={styles.notice}>Buscando publicaciones en Nexo Central…</Text>}
      {!!error && (
        <View style={styles.messagePanel}>
          <Text style={styles.error}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Reintentar búsqueda</Text></Pressable>
        </View>
      )}
      {!loading && !error && posts.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Todavía no encontramos propuestas coincidentes</Text>
          <Text style={styles.description}>Puedes cambiar el oficio o la categoría. Si buscas empleo, publica tu solicitud para que las empresas la encuentren.</Text>
        </View>
      )}
      {!loading && posts.map((post) => {
        const open = selected === post.id;
        const done = sent.includes(post.id);
        const owned = !!user && post.owner_id === user.id;
        return (
          <View key={post.id} style={[styles.card,open && styles.cardOpen]}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => expand(post)} style={styles.cardButton}>
              <View style={styles.cardTop}>
                <Text style={styles.kind}>{post.kind === 'vacancy' ? '💼 VACANTE PUBLICADA' : '👤 PERSONA QUE BUSCA EMPLEO'}</Text>
                <Text style={styles.chevron}>{open ? '⌃' : '›'}</Text>
              </View>
              <Text style={styles.title}>{post.title}</Text>
              <Text style={styles.meta}>{post.category || 'Empleo'} · {post.author_name}</Text>
              {!!summary(post) && <Text style={styles.meta}>{summary(post)}</Text>}
              <Text numberOfLines={open ? undefined : 2} style={styles.preview}>{post.description}</Text>
              <Text style={styles.more}>{open ? 'Ocultar detalles' : 'Ver propuesta y contactar'}</Text>
            </Pressable>
            {open && (
              <View style={styles.expanded}>
                {owned ? (
                  <Text style={styles.notice}>Esta es tu publicación. Las personas interesadas aparecerán en «Mis solicitudes».</Text>
                ) : done ? (
                  <Text accessibilityRole="alert" style={styles.success}>✓ Tu interés fue enviado. La persona que publicó la propuesta podrá verlo en Nexo.</Text>
                ) : (
                  <>
                    <Text style={styles.label}>Mensaje para quien publicó la propuesta</Text>
                    <TextInput
                      accessibilityLabel="Mensaje de interés"
                      multiline
                      maxLength={1200}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Preséntate brevemente…"
                      placeholderTextColor="#728CA9"
                      style={styles.input}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={sending || message.trim().length < 10}
                      onPress={() => void send(post)}
                      style={[styles.action, (sending || message.trim().length < 10) && styles.disabled]}
                    >
                      <Text style={styles.actionText}>{sending ? 'Enviando…' :
                        post.kind === 'seeking_job' ? 'Me interesa tu perfil' : 'Me interesa esta vacante'}</Text>
                    </Pressable>
                    {!!localError && <Text accessibilityRole="alert" style={styles.error}>{localError}</Text>}
                    <Text style={styles.footnote}>Tu correo y teléfono no se publican. La persona recibirá tu mensaje dentro de Nexo.</Text>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 12, marginVertical: 13 },
  head: { gap: 3 },
  eyebrow: { color: '#86E6FD', letterSpacing: 1.1, fontSize: 10, fontWeight: '900' },
  heading: { color: '#F5FAFF', fontSize: 22, fontWeight: '900' },
  description: { color: '#B8CAE5', fontSize: 12, lineHeight: 19 },
  notice: { color: '#C0DBF8', fontSize: 12, lineHeight: 20 },
  messagePanel: { gap: 10, padding: 13, borderRadius: 16, backgroundColor: '#162841' },
  retry: { padding: 12, backgroundColor: '#2B547D', borderRadius: 12, alignSelf: 'flex-start' },
  retryText: { color: '#E7F8FF', fontWeight: '900', fontSize: 13 },
  error: { color: '#FFB6C5', fontSize: 12, lineHeight: 18 },
  empty: { borderRadius: 18, padding: 16, gap: 6, borderWidth: 1, borderColor: '#50637F', backgroundColor: '#122340' },
  emptyTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  card: { backgroundColor: '#142743', borderRadius: 18, borderWidth: 1, borderColor: '#486890', overflow: 'hidden' },
  cardOpen: { borderColor: '#72E1F6' },
  cardButton: { padding: 16, gap: 7 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kind: { color: '#86F1E5', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  chevron: { color: '#D7E9FB', fontSize: 24 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  meta: { color: '#AFC5E1', fontSize: 12, lineHeight: 18 },
  preview: { color: '#E6F1FD', fontSize: 13, lineHeight: 19 },
  more: { color: '#83E6FF', fontSize: 12, fontWeight: '900', marginTop: 2 },
  expanded: { padding: 15, paddingTop: 5, gap: 10, borderTopWidth: 1, borderColor: '#45607D' },
  success: { color: '#80F1CF', fontSize: 13, lineHeight: 19, fontWeight: '800' },
  label: { color: '#F0F6FF', fontSize: 13, fontWeight: '800' },
  input: { borderRadius: 12, padding: 13, minHeight: 90, textAlignVertical: 'top',
    backgroundColor: '#EBF4FF', color: '#0E1C33', fontSize: 14 },
  action: { padding: 14, borderRadius: 13, backgroundColor: '#64D8F5', alignItems: 'center' },
  actionText: { color: '#081F37', fontWeight: '900', fontSize: 14 },
  disabled: { opacity: 0.5 },
  footnote: { color: '#AFC0D9', fontSize: 11, lineHeight: 17 },
});
