import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, Field, NexoScreen, ui } from '@/components/nexo-screen';
import { categorias } from '@/constants/categories';
import { storageNotice, tipos, useDrafts, type Tipo } from '@/state/drafts';

export function generateStaticParams() {
  return Object.keys(tipos).map(tipo => ({ tipo }));
}

export default function PublicarScreen() {
  const { tipo } = useLocalSearchParams<{ tipo: string }>();
  if (!tipo || !Object.hasOwn(tipos, tipo)) return <NexoScreen title="Opción no encontrada"><Action label="Ir al inicio" onPress={() => router.replace('/')} /></NexoScreen>;
  return <Formulario key={tipo} tipo={tipo as Tipo} />;
}

function Formulario({ tipo }: { tipo: Tipo }) {
  const { ready, save } = useDrafts();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [importe, setImporte] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const id = useRef<string | null>(null);
  const proposal = tipo === 'categoria';

  function revisar() {
    if (!titulo.trim() || !descripcion.trim() || (!proposal && (!categoria || !ubicacion.trim()))) {
      setError('Completa los campos obligatorios marcados con *.'); return;
    }
    if (importe.trim() && (!/^\d+(?:[.,]\d{1,2})?$/.test(importe.trim()) || Number(importe.replace(',', '.')) <= 0)) {
      setError('Escribe un importe mayor que cero, con hasta dos decimales, o déjalo vacío.'); return;
    }
    setError(''); setPreview(true);
  }

  function guardar() {
    try {
      id.current ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      save({ id: id.current, tipo, titulo: titulo.trim(), descripcion: descripcion.trim(), categoria, ubicacion: ubicacion.trim(), importe: importe.trim().replace(',', '.') });
      router.replace('/borradores');
    } catch { setError('No se pudo guardar. Revisa que tu navegador permita el almacenamiento y vuelve a intentarlo. Tus datos siguen en el formulario.'); }
  }

  return <NexoScreen title={preview ? 'Vista previa' : tipos[tipo]}>
    <Text style={ui.text}>{storageNotice}</Text>
    {preview ? <>
      <View style={ui.card}>
        <Text style={ui.link}>{tipos[tipo]} · Borrador</Text>
        <Text style={ui.title}>{titulo.trim()}</Text>
        <Text style={ui.text}>{descripcion.trim()}</Text>
        {!proposal && <><Text style={ui.text}>{categoria} · {ubicacion.trim()}</Text><Text style={ui.label}>{importe.trim() ? `$${importe.trim()} MXN` : 'Importe por acordar'}</Text></>}
      </View>
      <Action label="Guardar borrador" disabled={!ready} onPress={guardar} />
      <Action label="Seguir editando" secondary onPress={() => { setPreview(false); setError(''); }} />
    </> : <>
      <Field label={proposal ? 'Nombre de la nueva categoría *' : 'Título *'} value={titulo} onChangeText={setTitulo} maxLength={100} placeholder={tipo === 'necesidad' ? 'Ej. Necesito reparar un sillón' : tipo === 'servicio' ? 'Ej. Fabricación de muebles a medida' : tipo === 'producto' ? 'Ej. Mesa de comedor de madera' : 'Ej. Edición de video'} />
      <Field label={proposal ? '¿Qué significa o qué actividad realiza? *' : 'Descripción *'} value={descripcion} onChangeText={setDescripcion} multiline maxLength={3000} placeholder="Describe los detalles" />
      {!proposal && <>
        <Text style={ui.label}>Categoría *</Text>
        <View style={ui.row}>{[...categorias, 'Otra'].map(item => <Action key={item} label={`${categoria === item ? '✓ ' : ''}${item}`} secondary={categoria !== item} onPress={() => setCategoria(item)} />)}</View>
        <Field label="Ciudad o zona de atención *" value={ubicacion} onChangeText={setUbicacion} maxLength={150} placeholder="Ej. Guadalajara, Jalisco / En línea" />
        <Field label={tipo === 'necesidad' ? 'Presupuesto en MXN (opcional)' : 'Precio en MXN (opcional)'} value={importe} onChangeText={setImporte} keyboardType="decimal-pad" maxLength={12} placeholder="Por acordar" />
      </>}
      <Action label="Revisar borrador" onPress={revisar} />
    </>}
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
  </NexoScreen>;
}
