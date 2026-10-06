import { useEffect, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
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

const avatarSources = {
  nexa: { uri: 'data:image/webp;base64,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' },
  nexo: { uri: 'data:image/webp;base64,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' },
} as const;

export function AssistantAvatar({
  profile,
  size = 92,
  speaking = false,
  onPress,
  selected = false,
  style,
}: Props) {
  const [idleMotion] = useState(() => new Animated.Value(0));
  const [talkMotion] = useState(() => new Animated.Value(0));
  const [blinkMotion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(idleMotion, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(idleMotion, {
          toValue: -0.8,
          duration: 2300,
          useNativeDriver: true,
        }),
        Animated.timing(idleMotion, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    idle.start();
    return () => idle.stop();
  }, [idleMotion]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const blink = () => {
      if (!active) return;

      Animated.sequence([
        Animated.timing(blinkMotion, {
          toValue: 1,
          duration: 75,
          useNativeDriver: true,
        }),
        Animated.delay(55),
        Animated.timing(blinkMotion, {
          toValue: 0,
          duration: 95,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!active) return;
        const nextDelay = 2400 + Math.floor(Math.random() * 3000);
        timeout = setTimeout(blink, nextDelay);
      });
    };

    timeout = setTimeout(blink, 1800 + Math.floor(Math.random() * 1800));

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      blinkMotion.stopAnimation();
    };
  }, [blinkMotion]);

  useEffect(() => {
    let talk: Animated.CompositeAnimation | null = null;

    if (speaking) {
      talk = Animated.loop(
        Animated.sequence([
          Animated.timing(talkMotion, {
            toValue: 1,
            duration: 115,
            useNativeDriver: true,
          }),
          Animated.timing(talkMotion, {
            toValue: 0.32,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(talkMotion, {
            toValue: 0.78,
            duration: 135,
            useNativeDriver: true,
          }),
          Animated.timing(talkMotion, {
            toValue: 0.18,
            duration: 105,
            useNativeDriver: true,
          }),
          Animated.timing(talkMotion, {
            toValue: 0.62,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );
      talk.start();
    } else {
      Animated.timing(talkMotion, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }

    return () => talk?.stop();
  }, [speaking, talkMotion]);

  const rotate = idleMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-1.35deg', '0deg', '1.2deg'],
  });

  const translateY = idleMotion.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [1.2, 0, -1.5],
  });

  const speakingScale = talkMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.014],
  });

  const speakingGlow = talkMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0.32, 0.82],
  });

  const blinkOpacity = blinkMotion.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0.6, 1],
  });

  const mouthScaleY = talkMotion.interpolate({
    inputRange: [0, 0.18, 0.32, 0.62, 0.78, 1],
    outputRange: [0.45, 0.8, 1.35, 0.72, 1.75, 1.05],
  });

  const mouthScaleX = talkMotion.interpolate({
    inputRange: [0, 0.18, 0.32, 0.62, 0.78, 1],
    outputRange: [1.04, 1.0, 0.9, 1.08, 0.84, 0.96],
  });

  const mouthOpacity = talkMotion.interpolate({
    inputRange: [0, 0.14, 1],
    outputRange: [0.72, 0.9, 1],
  });

  const isNexa = profile.id === 'nexa';
  const eyeTop = size * (isNexa ? 0.345 : 0.365);
  const leftEyeLeft = size * (isNexa ? 0.405 : 0.39);
  const rightEyeLeft = size * (isNexa ? 0.60 : 0.59);
  const eyeWidth = size * (isNexa ? 0.105 : 0.12);
  const eyelidHeight = Math.max(2, size * 0.027);
  const eyelidColor = isNexa ? '#B9AEB2' : '#050817';

  const mouthWidth = size * (isNexa ? 0.105 : 0.13);
  const mouthHeight = Math.max(2.4, size * 0.024);
  const mouthLeft = size * 0.54 - mouthWidth / 2;
  const mouthTop = size * 0.515 - mouthHeight / 2;
  const mouthColor = isNexa ? '#2A1527' : '#040B19';
  const mouthBorder = isNexa
    ? 'rgba(193,139,255,0.72)'
    : 'rgba(102,199,255,0.86)';
  const mouthHighlight = isNexa
    ? 'rgba(241,171,214,0.88)'
    : 'rgba(111,210,255,0.92)';

  const avatar = (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            borderRadius: size / 2,
            borderColor: profile.secondaryAccent,
            boxShadow: isNexa
              ? '0 0 20px rgba(155,92,255,0.50)'
              : '0 0 20px rgba(59,130,246,0.50)',
            opacity: speaking ? speakingGlow : selected ? 0.68 : 0.38,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.imageShell,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: selected
              ? profile.secondaryAccent
              : 'rgba(166,196,255,0.62)',
            transform: [
              { rotate },
              { translateY },
              { scale: speakingScale },
            ],
          },
        ]}
      >
        <Image
          accessibilityLabel={'Avatar de ' + profile.name}
          source={avatarSources[profile.id]}
          resizeMode="cover"
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.eyelid,
            {
              left: leftEyeLeft,
              top: eyeTop,
              width: eyeWidth,
              height: eyelidHeight,
              borderRadius: eyelidHeight,
              backgroundColor: eyelidColor,
              opacity: blinkOpacity,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.eyelid,
            {
              left: rightEyeLeft,
              top: eyeTop + size * (isNexa ? 0.03 : 0.035),
              width: eyeWidth,
              height: eyelidHeight,
              borderRadius: eyelidHeight,
              backgroundColor: eyelidColor,
              opacity: blinkOpacity,
            },
          ]}
        />

        {speaking ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mouth,
              {
                left: mouthLeft,
                top: mouthTop,
                width: mouthWidth,
                height: mouthHeight,
                borderRadius: mouthWidth,
                backgroundColor: mouthColor,
                borderColor: mouthBorder,
                opacity: mouthOpacity,
                transform: [
                  { scaleY: mouthScaleY },
                  { scaleX: mouthScaleX },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.mouthHighlight,
                { backgroundColor: mouthHighlight },
              ]}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );

  if (!onPress) return avatar;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Abrir asistente ' + profile.name}
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
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  outer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderWidth: 3,
    transform: [{ scale: 1.055 }],
  },
  imageShell: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: '#070E21',
    boxShadow: '0 8px 24px rgba(0,0,0,0.34)',
  },
  image: {
    display: 'flex',
    backgroundColor: '#071126',
  },
  eyelid: {
    position: 'absolute',
    zIndex: 3,
  },
  mouth: {
    position: 'absolute',
    zIndex: 4,
    overflow: 'hidden',
    borderWidth: 0.8,
    boxShadow: '0 0 5px rgba(92,139,255,0.24)',
  },
  mouthHighlight: {
    position: 'absolute',
    left: '24%',
    right: '24%',
    bottom: 1,
    height: 1.2,
    borderRadius: 999,
    opacity: 0.78,
  },
});
