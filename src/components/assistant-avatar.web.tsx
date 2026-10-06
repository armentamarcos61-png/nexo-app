import React, { useMemo, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';
import { NEXA_IDLE_VIDEO_DATA } from '@/components/assistant-media/nexa-videos';
import { NEXA_TALK_VIDEO_DATA } from '@/components/assistant-media/nexa-talk';
import { NEXO_IDLE_VIDEO_DATA } from '@/components/assistant-media/nexo-idle';
import { NEXO_TALK_VIDEO_DATA } from '@/components/assistant-media/nexo-talk';

type Props = {
  profile: AssistantProfile;
  size?: number;
  speaking?: boolean;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
};

export function AssistantAvatar({
  profile,
  size = 92,
  speaking = false,
  onPress,
  selected = false,
  style,
}: Props) {
  const [videoFailed, setVideoFailed] = useState(false);
  const isNexa = profile.id === 'nexa';

  const imageSource = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const videoSource = useMemo(() => {
    if (isNexa) {
      return speaking ? NEXA_TALK_VIDEO_DATA : NEXA_IDLE_VIDEO_DATA;
    }

    return speaking ? NEXO_TALK_VIDEO_DATA : NEXO_IDLE_VIDEO_DATA;
  }, [isNexa, speaking]);

  const media = videoFailed
    ? React.createElement('img', {
        src: imageSource,
        alt: 'Avatar de ' + profile.name,
        draggable: false,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          userSelect: 'none',
        },
      })
    : React.createElement('video', {
        key: profile.id + (speaking ? '-talking' : '-idle'),
        src: videoSource,
        poster: imageSource,
        autoPlay: true,
        loop: true,
        muted: true,
        playsInline: true,
        preload: 'auto',
        'aria-label': 'Avatar animado de ' + profile.name,
        onError: () => setVideoFailed(true),
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
          backgroundColor: isNexa ? '#120D25' : '#061328',
        },
      });

  const avatar = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: isNexa ? '#120D25' : '#061328',
          borderWidth: selected ? 2 : 1,
          borderColor: selected
            ? profile.secondaryAccent
            : isNexa
              ? 'rgba(193,139,255,0.62)'
              : 'rgba(102,199,255,0.62)',
          boxShadow: isNexa
            ? '0 0 20px rgba(155,92,255,0.45)'
            : '0 0 20px rgba(59,130,246,0.45)',
        } as any,
        style,
      ]}
    >
      {media}
    </View>
  );

  if (!onPress) return avatar;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Abrir asistente ' + profile.name}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        borderRadius: 999,
      })}
    >
      {avatar}
    </Pressable>
  );
}
