import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Action, Field, NexoScreen, ui } from '@/components/nexo-screen';
import { categorias } from '@/constants/categories';
import { storageNotice, tipos, useDrafts, type Tipo } from '@/state/drafts';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { MultiImagePicker } from '@/components/multi-image-picker';
import { VideoPicker } from '@/components/video-picker';
import { StoredVideo } from '@/components/stored-video';
import { useMarketplace } from '@/state/marketplace';
import type { StoredVideoRef } from '@/state/media-store';

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
  const { publish } = useMarketplace();
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [importe, setImporte] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<StoredVideoRef[]>([]);
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

  function publicarProducto() {
    if (tipo !== 'producto') return;
    if (!images.length && !videos.length) {
      setError('Agrega al menos una foto o video antes de publicar el producto en el Marketplace.');
      setPreview(false);
      return;
    }
    try {
      id.current ??= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      publish({
        id: id.current,
        title: titulo.trim(),
        description: descripcion.trim(),
        category: categoria,
        location: ubicacion.trim(),
        price: importe.trim().replace(',', '.'),
        images,
        videos,
        createdAt: new Date().toISOString(),
      });
      router.replace('/productos');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo publicar el producto.');
    }
  }

  return <NexoScreen title={preview ? 'Vista previa' : tipos[tipo]}>
    <Text style={[ui.text, { color: palette.text }]}>{storageNotice}</Text>
    {preview ? <>
      <View style={ui.card}>
        <Text style={ui.link}>{tipos[tipo]} · Borrador</Text>
        <Text style={[ui.title, { color: palette.title }]}>{titulo.trim()}</Text>
        <Text style={[ui.text, { color: palette.text }]}>{descripcion.trim()}</Text>
        {!proposal && <><Text style={[ui.text, { color: palette.text }]}>{categoria} · {ubicacion.trim()}</Text><Text style={[ui.label, { color: palette.title }]}>{importe.trim() ? `${importe.trim()} MXN` : 'Importe por acordar'}</Text></>}
        {tipo === 'producto' && (!!images.length || !!videos.length) && (
          <View style={styles.previewMedia}>
            {!!images.length && (
              <View style={styles.previewImages}>
                {images.slice(0, 4).map((uri, index) => (
                  <Image key={`${index}-${uri.length}`} source={{ uri }} style={styles.previewImage} resizeMode="cover" />
                ))}
              </View>
            )}
            {!!videos.length && (
              <View style={styles.previewVideos}>
                {videos.slice(0, 2).map((video) => (
                  <View key={video.id} style={styles.previewVideo}>
                    <StoredVideo video={video} controls />
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.mediaSummary, { color: palette.text }]}>
              {images.length} {images.length === 1 ? 'foto' : 'fotos'} · {videos.length} {videos.length === 1 ? 'video' : 'videos'}
            </Text>
          </View>
        )}
      </View>
      {tipo === 'producto' && <Action label="Publicar en Marketplace" onPress={publicarProducto} />}
      <Action label="Guardar borrador" disabled={!ready} onPress={guardar} />
      <Action label="Seguir editando" secondary onPress={() => { setPreview(false); setError(''); }} />
    </> : <>
      <Field label={proposal ? 'Nombre de la nueva categoría *' : 'Título *'} value={titulo} onChangeText={setTitulo} maxLength={100} placeholder={tipo === 'necesidad' ? 'Ej. Necesito reparar un sillón' : tipo === 'servicio' ? 'Ej. Fabricación de muebles a medida' : tipo === 'producto' ? 'Ej. Mesa de comedor de madera' : 'Ej. Edición de video'} />
      <Field label={proposal ? '¿Qué significa o qué actividad realiza? *' : 'Descripción *'} value={descripcion} onChangeText={setDescripcion} multiline maxLength={3000} placeholder="Describe los detalles" />
      {!proposal && <>
        <Text style={[ui.label, { color: palette.title }]}>Categoría *</Text>
        <View style={ui.row}>{[...categorias, 'Otra'].map(item => <Action key={item} label={`${categoria === item ? '✓ ' : ''}${item}`} secondary={categoria !== item} onPress={() => setCategoria(item)} />)}</View>
        <Field label="Ciudad o zona de atención *" value={ubicacion} onChangeText={setUbicacion} maxLength={150} placeholder="Ej. Guadalajara, Jalisco / En línea" />
        <Field label={tipo === 'necesidad' ? 'Presupuesto en MXN (opcional)' : 'Precio en MXN (opcional)'} value={importe} onChangeText={setImporte} keyboardType="decimal-pad" maxLength={12} placeholder="Por acordar" />
        {tipo === 'producto' && (
          <View style={styles.mediaGroup}>
            <Text style={[styles.mediaGroupTitle, { color: palette.title }]}>Fotos y videos del producto</Text>
            <Text style={[styles.mediaGroupText, { color: palette.text }]}>
              Puedes combinar imágenes y videos. Los videos deben durar máximo 5 minutos.
            </Text>
            <MultiImagePicker
              images={images}
              onChange={setImages}
              maxImages={8}
              title="Fotos"
              hint="Sube varias vistas claras del mismo producto. La primera foto será la portada cuando exista."
            />
            <VideoPicker
              videos={videos}
              onChange={setVideos}
              maxVideos={4}
              title="Videos"
              hint="Muestra funcionamiento, tamaño, detalles o una demostración. Máximo 5 minutos por video."
            />
          </View>
        )}
        {tipo === 'servicio' && (
          <View style={[styles.portfolioHint, { borderColor: palette.cardBorder }]}>
            <Text style={[styles.portfolioTitle, { color: palette.title }]}>Portafolios de trabajos</Text>
            <Text style={[styles.portfolioText, { color: palette.text }]}>
              Las fotos y videos de trabajos se organizan en galerías separadas: Cocinas, Clósets, Sillones, etc. No mezcles todo en una sola galería.
            </Text>
            <Action label="Crear o administrar portafolios" secondary onPress={() => router.push('/portafolios')} />
          </View>
        )}
      </>}
      <Action label="Revisar borrador" onPress={revisar} />
    </>}
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
  </NexoScreen>;
}


const styles = StyleSheet.create({
  previewMedia: {
    gap: 10,
  },
  previewImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  previewImage: {
    width: 76,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#172944',
  },
  previewVideos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewVideo: {
    width: 140,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#172944',
  },
  mediaSummary: {
    fontSize: 11,
    fontWeight: '800',
  },
  mediaGroup: {
    gap: 12,
  },
  mediaGroupTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  mediaGroupText: {
    fontSize: 12,
    lineHeight: 18,
  },
  portfolioHint: {
    gap: 9,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: 'rgba(18,35,60,0.45)',
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  portfolioText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
