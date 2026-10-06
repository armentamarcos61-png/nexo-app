import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import type { AssistantProfile } from '@/state/assistant';

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
  const headMotion = useRef(new Animated.Value(0)).current;
  const mouthMotion = useRef(new Animated.Value(0.28)).current;
  const isFemale = profile.id === 'nexa';

  useEffect(() => {
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(headMotion, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(headMotion, {
          toValue: -0.75,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(headMotion, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    idle.start();
    return () => idle.stop();
  }, [headMotion]);

  useEffect(() => {
    let talk: Animated.CompositeAnimation | null = null;

    if (speaking) {
      talk = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthMotion, { toValue: 1, duration: 115, useNativeDriver: true }),
          Animated.timing(mouthMotion, { toValue: 0.42, duration: 85, useNativeDriver: true }),
          Animated.timing(mouthMotion, { toValue: 0.78, duration: 130, useNativeDriver: true }),
          Animated.timing(mouthMotion, { toValue: 0.30, duration: 105, useNativeDriver: true }),
          Animated.timing(mouthMotion, { toValue: 0.62, duration: 95, useNativeDriver: true }),
        ])
      );
      talk.start();
    } else {
      Animated.timing(mouthMotion, {
        toValue: 0.28,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }

    return () => talk?.stop();
  }, [mouthMotion, speaking]);

  const animatedHeadStyle = useMemo(
    () => ({
      transform: [
        {
          rotate: headMotion.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: ['-1.8deg', '0deg', '1.6deg'],
          }),
        },
        {
          translateY: headMotion.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [1.2, 0, -1.4],
          }),
        },
      ],
    }),
    [headMotion]
  );

  const avatar = (
    <View style={[styles.shell, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <LinearGradient
        colors={
          isFemale
            ? ['#F4F6FA', '#AEB8C9', '#505B70']
            : ['#BFC7D6', '#596375', '#1B2230']
        }
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View
        style={[
          styles.halo,
          {
            borderColor: profile.accent,
            borderRadius: size / 2,
            opacity: selected ? 0.95 : 0.62,
          },
        ]}
      />

      <Animated.View style={[styles.head, animatedHeadStyle]}>
        <View
          style={[
            isFemale ? styles.cap : styles.helmet,
            {
              backgroundColor: isFemale ? '#E9EDF4' : '#AAB3C2',
              borderColor: profile.secondaryAccent,
            },
          ]}
        >
          <Text style={[styles.badge, { color: profile.accent }]}>N</Text>
        </View>

        <View
          style={[
            styles.face,
            isFemale ? styles.faceFemale : styles.faceMale,
            { borderColor: 'rgba(255,255,255,0.44)' },
          ]}
        >
          <View style={styles.eyesRow}>
            <View style={[styles.eye, isFemale ? styles.eyeFemale : styles.eyeMale]}>
              <View style={[styles.pupil, { backgroundColor: profile.secondaryAccent }]} />
            </View>
            <View style={[styles.eye, isFemale ? styles.eyeFemale : styles.eyeMale]}>
              <View style={[styles.pupil, { backgroundColor: profile.secondaryAccent }]} />
            </View>
          </View>

          <Animated.View
            style={[
              styles.mouth,
              {
                backgroundColor: isFemale ? '#7F5261' : profile.secondaryAccent,
                transform: [
                  { scaleY: mouthMotion },
                  {
                    scaleX: mouthMotion.interpolate({
                      inputRange: [0.28, 1],
                      outputRange: [1.15, 0.88],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );

  if (!onPress) return avatar;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir asistente ${profile.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {avatar}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 999,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  shell: {
    position: 'relative',
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233,244,255,0.58)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.30)',
  },
  halo: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
  },
  head: {
    width: '82%',
    height: '82%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    left: '11%',
    right: '11%',
    top: '24%',
    bottom: '11%',
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faceFemale: {
    backgroundColor: '#E9E8EA',
  },
  faceMale: {
    backgroundColor: '#050914',
  },
  cap: {
    position: 'absolute',
    top: '5%',
    left: '8%',
    right: '8%',
    height: '31%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderWidth: 1,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helmet: {
    position: 'absolute',
    top: '3%',
    left: '6%',
    right: '6%',
    height: '34%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    fontSize: 12,
    fontWeight: '900',
  },
  eyesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  eye: {
    width: 14,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeFemale: {
    borderRadius: 10,
    backgroundColor: '#32384A',
  },
  eyeMale: {
    borderRadius: 10,
    backgroundColor: '#151B2B',
  },
  pupil: {
    width: 7,
    height: 10,
    borderRadius: 6,
    boxShadow: '0 0 7px rgba(88,214,255,0.65)',
  },
  mouth: {
    width: 20,
    height: 7,
    borderRadius: 999,
  },
});
