import React from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';

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
  onPress,
  selected = false,
  style,
}: Props) {
  const isNexa = profile.id === 'nexa';
  const imageSource = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;

  const visual = (
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
            ? '0 0 22px rgba(155,92,255,0.50)'
            : '0 0 22px rgba(59,130,246,0.50)',
        } as any,
        style,
      ]}
    >
      {React.createElement('img', {
        src: imageSource,
        alt: 'Avatar oficial de ' + profile.name,
        draggable: false,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
        },
      })}
    </View>
  );

  if (!onPress) return visual;

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
      {visual}
    </Pressable>
  );
}
