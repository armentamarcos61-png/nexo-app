import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getVideoBlob, type StoredVideoRef } from '@/state/media-store';

type Props = {
  video: StoredVideoRef;
  controls?: boolean;
  contain?: boolean;
  muted?: boolean;
};

export function StoredVideo({ video, controls = true, contain = false, muted = false }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let alive = true;
    let objectUrl = '';

    getVideoBlob(video.id)
      .then((blob) => {
        if (!alive || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (alive) setUrl('');
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [video.id]);

  if (!url) {
    return (
      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14233D' }}>
        <Text style={{ color: '#DCE8F8', fontSize: 12, fontWeight: '800' }}>Video no disponible</Text>
      </View>
    );
  }

  return (
    <video
      src={url}
      controls={controls}
      muted={muted}
      preload="metadata"
      playsInline
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        objectFit: contain ? 'contain' : 'cover',
        background: '#07111E',
      }}
    />
  );
}
