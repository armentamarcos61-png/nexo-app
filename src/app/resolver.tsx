import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen } from '@/components/nexo-screen';

type Stage = 'brief' | 'matching' | 'quote' | 'paid' | 'done';

const money = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);

export default function ResolverScreen() {
  const params = useLocalSearchParams<{ q?: string; tipo?: string; categoria?: string }>();
  const tipo = params.tipo || 'contratar';
  const initialNeed = params.q?.trim() || 'Necesito resolver esta solicitud';
  const [need, setNeed] = useState(initialNeed);
  const [location, setLocation] = useState('');
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<Stage>('brief');

  const demo = useMemo(() => {
    if (tipo === 'comprar') {
      return {
        title: 'Compra coordinada por Nexo',
        providerLabel: 'Proveedor verificado · Demo',
        providerName: 'Distribuidora Horizonte Demo',
        detail: 'Producto disponible y entrega coordinada.',
        lines: [
          { label: 'Productos solicitados', value: 1450 },
          { label: 'Transporte hasta tu punto', value: 220 },
          { label: 'Carga y entrega', value: 130 },
        ],
      };
    }

    if (tipo === 'trabajadores') {
      return {
        title: 'Trabajador coordinado por Nexo',
        providerLabel: 'Carpintero verificado · Demo',
        providerName: 'Raúl Juan Medina Arriola',
        detail: '6 años de experiencia · disponibilidad confirmada.',
        lines: [
          { label: 'Trabajo acordado', value: 1500 },
          { label: 'Traslado de herramientas', value: 100 },
        ],
      };
    }

    return {
      title: 'Servicio coordinado por Nexo',
      providerLabel: 'Profesional verificado · Demo',
      providerName: 'Raúl Juan Medina Arriola',
      detail: 'Disponibilidad confirmada para esta solicitud.',
      lines: [
        { label: 'Servicio solicitado', value: 1500 },
        { label: 'Transporte de herramientas', value: 100 },
      ],
    };
  }, [tipo]);

  const total = demo.lines.reduce((sum, item) => sum + item.value, 0);

  function startMatching() {
    if (!need.trim()) return;
    setStage('matching');
  }

  function prepareQuote() {
    setStage('quote');
  }

  function confirmPayment() {
    setStage('paid');
  }

  function completeOrder() {
    setStage('done');
  }

  return (
    <NexoScreen title="Nexo resuelve">
      <View style={styles.banner}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20,82,105,0.96)', 'rgba(62,48,121,0.96)', 'rgba(108,47,111,0.92)']}
          style={styles.fill}
        />
        <Text style={styles.eyebrow}>PRUEBA FUNCIONAL · DATOS DEMO</Text>
        <Text style={styles.title}>Una necesidad, una solución completa.</Text>
        <Text style={styles.text}>
          Nexo organiza por detrás proveedores, trabajadores, transporte y entrega. Tú ves una sola solución y un solo total.
        </Text>
      </View>

      <Field
        label="¿Qué necesitas?"
        value={need}
        onChangeText={setNeed}
        placeholder="Describe tu necesidad con palabras normales"
        multiline
      />
      <Field
        label="¿Dónde lo necesitas?"
        value={location}
        onChangeText={setLocation}
        placeholder="Ej. Guadalajara, Zapopan, Santa Anita..."
      />
      <Field
        label="¿Para cuándo?"
        value={when}
        onChangeText={setWhen}
        placeholder="Ej. mañana por la tarde"
      />
      <Field
        label="Detalles importantes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Cantidad, medidas, marca, acceso, presupuesto, etc."
        multiline
      />

      {stage === 'brief' && (
        <Action label="Buscar y organizar opciones" onPress={startMatching} />
      )}

      {(stage === 'matching' || stage === 'quote' || stage === 'paid' || stage === 'done') && (
        <View style={styles.card}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(22,43,75,0.98)', 'rgba(46,39,86,0.98)', 'rgba(14,71,77,0.96)']}
            style={styles.fill}
          />
          <Text style={styles.eyebrow}>COINCIDENCIA NEXO</Text>
          <Text style={styles.cardTitle}>{demo.title}</Text>
          <Text style={styles.providerPreview}>{demo.providerLabel}</Text>
          <Text style={styles.text}>{demo.detail}</Text>

          {stage === 'matching' && (
            <>
              <View style={styles.privateNote}>
                <Text style={styles.privateIcon}>🔒</Text>
                <Text style={styles.privateText}>
                  Antes de confirmar, Nexo no muestra teléfono, domicilio ni datos personales innecesarios del proveedor.
                </Text>
              </View>
              <Action label="Preparar cotización" onPress={prepareQuote} />
            </>
          )}
        </View>
      )}

      {(stage === 'quote' || stage === 'paid' || stage === 'done') && (
        <View style={styles.quote}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(37,61,101,0.98)', 'rgba(62,48,104,0.98)']}
            style={styles.fill}
          />
          <Text style={styles.eyebrow}>TU SOLUCIÓN NEXO</Text>
          <Text style={styles.quoteTitle}>{need.trim() || 'Solicitud'}</Text>

          <View style={styles.lineItems}>
            {demo.lines.map((item) => (
              <View key={item.label} style={styles.line}>
                <Text style={styles.lineLabel}>{item.label}</Text>
                <Text style={styles.lineValue}>{money(item.value)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.line}>
              <Text style={styles.totalLabel}>Total a pagar</Text>
              <Text style={styles.totalValue}>{money(total)}</Text>
            </View>
          </View>

          <Text style={styles.quoteHelp}>
            Incluye lo mostrado arriba. Nexo coordina los pagos y después liquida por separado a quienes participaron en la operación.
          </Text>

          {stage === 'quote' && (
            <>
              <Action label="Confirmar y simular pago" onPress={confirmPayment} />
              <Text style={styles.demoWarning}>
                Esta versión todavía no cobra dinero real. El botón sólo prueba el flujo completo.
              </Text>
            </>
          )}
        </View>
      )}

      {(stage === 'paid' || stage === 'done') && (
        <View style={styles.assignment}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(18,83,82,0.98)', 'rgba(43,52,104,0.98)']}
            style={styles.fill}
          />
          <View style={styles.statusRow}>
            <Text style={styles.statusDot}>●</Text>
            <Text style={styles.statusText}>{stage === 'done' ? 'Trabajo completado' : 'Confirmado y asignado'}</Text>
          </View>

          <Text style={styles.assignmentTitle}>Quién atenderá tu solicitud</Text>
          <Text style={styles.personName}>{demo.providerName}</Text>
          <Text style={styles.text}>
            Nexo muestra la identidad necesaria al cliente una vez confirmada la operación. Teléfono, domicilio particular y otros datos sensibles siguen protegidos.
          </Text>

          <View style={styles.steps}>
            <Step label="Solicitud confirmada" done />
            <Step label="Proveedor o trabajador asignado" done />
            <Step label="Transporte coordinado" done={stage === 'done'} />
            <Step label="Entrega o trabajo terminado" done={stage === 'done'} />
          </View>

          {stage === 'paid' && (
            <Action label="Simular trabajo terminado" onPress={completeOrder} />
          )}
        </View>
      )}

      {stage === 'done' && (
        <View style={styles.success}>
          <Text style={styles.successIcon}>✓</Text>
          <View style={styles.successCopy}>
            <Text style={styles.successTitle}>Operación completada</Text>
            <Text style={styles.successText}>
              En producción, aquí Nexo liberará los pagos pendientes a cada participante y guardará el historial de precio, cumplimiento y resultado.
            </Text>
          </View>
        </View>
      )}

      <Action label="Volver a la búsqueda" secondary onPress={() => router.replace('/explorar')} />
    </NexoScreen>
  );
}

function Step({ label, done }: { label: string; done?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        <Text style={styles.stepDotText}>{done ? '✓' : '·'}</Text>
      </View>
      <Text style={[styles.stepText, done && styles.stepTextDone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 22,
  },
  banner: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(151,201,236,0.38)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(48,43,101,0.95)',
  },
  eyebrow: {
    color: '#8DEBFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  text: {
    color: '#C4D0E7',
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(145,181,222,0.38)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(45,43,96,0.96)',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  providerPreview: {
    color: '#E9F5FF',
    fontSize: 16,
    fontWeight: '900',
  },
  privateNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(7,20,38,0.56)',
    borderRadius: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(119,170,210,0.22)',
  },
  privateIcon: {
    fontSize: 16,
  },
  privateText: {
    flex: 1,
    color: '#AFBED8',
    fontSize: 12,
    lineHeight: 18,
  },
  quote: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(170,196,238,0.40)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(49,44,103,0.96)',
  },
  quoteTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
  },
  lineItems: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(8,20,42,0.45)',
  },
  line: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  lineLabel: {
    flex: 1,
    color: '#D2DDF0',
    fontSize: 14,
  },
  lineValue: {
    color: '#F4F8FF',
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(185,210,242,0.20)',
  },
  totalLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  totalValue: {
    color: '#8FF0FF',
    fontSize: 20,
    fontWeight: '900',
  },
  quoteHelp: {
    color: '#AEBED9',
    fontSize: 12,
    lineHeight: 18,
  },
  demoWarning: {
    color: '#F4D69A',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  assignment: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    padding: 20,
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(125,225,220,0.38)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(33,75,81,0.96)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusDot: {
    color: '#53F0CF',
    fontSize: 12,
  },
  statusText: {
    color: '#A9F5E6',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  assignmentTitle: {
    color: '#CFE6F2',
    fontSize: 13,
    fontWeight: '800',
  },
  personName: {
    color: '#FFFFFF',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '900',
  },
  steps: {
    gap: 9,
    marginTop: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59,73,103,0.80)',
  },
  stepDotDone: {
    backgroundColor: 'rgba(85,230,203,0.92)',
  },
  stepDotText: {
    color: '#09253B',
    fontWeight: '900',
  },
  stepText: {
    color: '#91A3C1',
    fontSize: 13,
  },
  stepTextDone: {
    color: '#E7F5F2',
    fontWeight: '800',
  },
  success: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(28,91,79,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(95,239,201,0.35)',
  },
  successIcon: {
    color: '#7FF1D0',
    fontSize: 24,
    fontWeight: '900',
  },
  successCopy: {
    flex: 1,
    gap: 3,
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  successText: {
    color: '#C7DED8',
    fontSize: 12,
    lineHeight: 18,
  },
});
