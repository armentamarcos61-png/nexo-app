import { Text, View } from 'react-native';
import type { StoredVideoRef } from '@/state/media-store';

type Props = {
  video: StoredVideoRef;
  controls?: boolean;
  contain?: boolean;
  muted?: boolean;
};

export function StoredVideo({ video }: Props) {
  return (
    <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14233D' }}>
      <Text style={{ color: '#DCE8F8', fontSize: 12, fontWeight: '800' }}>🎬 {video.name}</Text>
    </View>
  );
}
