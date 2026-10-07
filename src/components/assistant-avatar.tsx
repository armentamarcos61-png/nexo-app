import { Image, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
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
  const source = {
    uri: isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA,
  };

  const avatar = (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: selected
            ? profile.secondaryAccent
            : isNexa
              ? 'rgba(193,139,255,0.62)'
              : 'rgba(102,199,255,0.62)',
          backgroundColor: isNexa ? '#120D25' : '#061328',
        },
        style,
      ]}
    >
      <Image
        accessibilityLabel={'Avatar oficial de ' + profile.name}
        source={source}
        resizeMode="cover"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: 1.22 }],
        }}
      />
    </View>
  );

  if (!onPress) return avatar;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Abrir asistente ' + profile.name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}
    >
      {avatar}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 2,
  },
  pressable: {
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
});
