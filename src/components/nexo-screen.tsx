import { LinearGradient } from 'expo-linear-gradient';
import { useState, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAppearancePalette, useAppearance } from '@/state/appearance';
import { NEXO_LOGO_DATA_URI } from '@/constants/brand-logo';

export function NexoScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  return (
    <SafeAreaView style={[ui.safe, { backgroundColor: palette.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={palette.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[ui.glowCyan, { backgroundColor: palette.glowOne }]} />
      <View pointerEvents="none" style={[ui.glowViolet, { backgroundColor: palette.glowTwo }]} />

      <ScrollView
        style={[ui.scroll, { backgroundColor: palette.scroll }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={ui.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={({ pressed }) => [ui.back, pressed && ui.pressed]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(105,181,255,0.30)', 'rgba(142,91,255,0.22)']}
              style={ui.backGradient}
            />
            <Text style={[ui.backText, { color: palette.title }]}>‹</Text>
          </Pressable>

          <View style={ui.brandWrap}>
            <Image
              accessibilityLabel="Logo Nexo"
              source={{ uri: NEXO_LOGO_DATA_URI }}
              resizeMode="contain"
              style={ui.brandLogo}
            />
            <Text style={[ui.brandSub, { color: palette.muted }]}>
              Negocios · Empleo · × · Oportunidades
            </Text>
          </View>

          <View style={ui.spark}>
            <Text style={ui.sparkText}>✦</Text>
          </View>
        </View>

        <View style={ui.headingCard}>
          <LinearGradient
            pointerEvents="none"
            colors={palette.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ui.cardGradient}
          />
          <Text accessibilityRole="header" style={[ui.title, { color: palette.title }]}>{title}</Text>
          <Text style={[ui.headingText, { color: palette.text }]}>Todo lo que necesitas, con el mismo estilo Nexo.</Text>
        </View>

        <View style={ui.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Action({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        (pressed || disabled) && ui.pressed,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={
          secondary
            ? palette.secondary
            : ['#27D8FF', '#617BFF', '#D05CFF']
        }
        start={{ x: 0, y: 0.25 }}
        end={{ x: 1, y: 0.75 }}
        style={ui.buttonGradient}
      />
      <View pointerEvents="none" style={ui.buttonHighlight} />
      <Text style={secondary ? [ui.link, { color: palette.secondaryText }] : ui.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { mode } = useAppearance();
  const palette = getAppearancePalette(mode);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(props.secureTextEntry);
  const visiblePlaceholder =
    typeof props.placeholder === 'string' &&
    !String(props.value ?? '').length;

  return (
    <View style={ui.field}>
      <Text style={[ui.label, { color: palette.title }]}>{label}</Text>
      <View style={ui.inputShell}>
        <LinearGradient
          pointerEvents="none"
          colors={palette.input}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ui.inputGradient}
        />
        {visiblePlaceholder ? (
          <Text
            pointerEvents="none"
            numberOfLines={props.multiline ? undefined : 1}
            style={[ui.inputPlaceholder, props.multiline && ui.inputPlaceholderMultiline]}
          >
            {props.placeholder}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          {...props}
          secureTextEntry={isPassword && !passwordVisible}
          testID={props.testID ?? 'nexo-field-input'}
          placeholder=""
          selectionColor="#000000"
          style={[
            ui.input,
            isPassword && ui.passwordInput,
            props.multiline && ui.multiline,
            props.style,
          ]}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ expanded: passwordVisible }}
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [ui.passwordToggle, pressed && ui.passwordTogglePressed]}
          >
            <View style={ui.eyeOutline}>
              <View style={ui.eyePupil} />
            </View>
            {!passwordVisible ? <View pointerEvents="none" style={ui.eyeSlash} /> : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const ui = StyleSheet.create({
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#071426',
  },
  scroll: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#071426',
  },
  glowCyan: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 999,
    top: -80,
    left: -110,
    backgroundColor: 'rgba(0, 213, 255, 0.13)',
  },
  glowViolet: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 999,
    top: 120,
    right: -190,
    backgroundColor: 'rgba(190, 72, 255, 0.13)',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 70,
  },
  topBar: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  back: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(163,207,255,0.45)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(47,75,135,0.75)',
    boxShadow: '0 7px 16px rgba(0,0,0,0.28)',
  },
  backGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 23,
  },
  backText: {
    color: '#F7FBFF',
    fontSize: 36,
    lineHeight: 38,
    marginTop: -4,
    fontWeight: '500',
  },
  brandWrap: {
    flex: 1,
  },
  brandLogo: {
    width: 108,
    height: 58,
    marginLeft: -5,
    marginTop: -8,
    marginBottom: -5,
  },
  brandSub: {
    color: '#9EADD0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  spark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(55,43,103,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(213,158,255,0.55)',
    boxShadow: '0 6px 16px rgba(132,74,255,0.24)',
  },
  sparkText: {
    color: '#F0B9FF',
    fontSize: 19,
  },
  headingCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(151,196,255,0.34)',
    borderTopColor: 'rgba(232,245,255,0.62)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(72,60,135,0.86)',
    boxShadow: '0 14px 34px rgba(2,9,25,0.34)',
    marginBottom: 18,
  },
  cardGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    fontWeight: '900',
  },
  headingText: {
    color: '#C5D5F5',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  content: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    gap: 16,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#C5D0EA',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F1F6FF',
  },
  link: {
    color: '#EAF1FF',
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  field: {
    width: '100%',
    maxWidth: '100%',
    gap: 8,
  },
  inputShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(143,179,224,0.42)',
    borderTopColor: 'rgba(225,239,255,0.62)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(38,50,94,0.95)',
    boxShadow: '0 7px 18px rgba(1,8,24,0.24)',
  },
  inputGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    zIndex: 0,
  },
  inputPlaceholder: {
    position: 'absolute',
    left: 15,
    right: 15,
    top: 16,
    color: '#171A1F',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    opacity: 1,
    zIndex: 1,
  },
  inputPlaceholderMultiline: {
    top: 14,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    opacity: 1,
    backgroundColor: 'transparent',
    outlineStyle: 'none',
    position: 'relative',
    zIndex: 3,
  } as any,
  passwordInput: {
    paddingRight: 58,
  },
  passwordToggle: {
    position: 'absolute',
    right: 7,
    top: 5,
    width: 46,
    height: 44,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  passwordTogglePressed: {
    opacity: 0.62,
    transform: [{ scale: 0.94 }],
  },
  eyeOutline: {
    width: 24,
    height: 15,
    borderWidth: 2,
    borderColor: '#202938',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  eyePupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#202938',
  },
  eyeSlash: {
    position: 'absolute',
    width: 27,
    height: 2,
    borderRadius: 99,
    backgroundColor: '#202938',
    transform: [{ rotate: '-38deg' }],
  },
  multiline: {
    minHeight: 132,
    textAlignVertical: 'top',
  },
  button: {
    position: 'relative',
    maxWidth: '100%',
    flexShrink: 1,
    overflow: 'hidden',
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: 'rgba(239,250,255,0.92)',
    borderColor: 'rgba(157,190,255,0.70)',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(63,53,133,0.95)',
    boxShadow: '0 9px 20px rgba(44,96,255,0.24)',
  },
  secondary: {
    borderTopColor: 'rgba(193,216,255,0.54)',
    borderColor: 'rgba(109,130,190,0.48)',
    borderBottomColor: 'rgba(31,41,78,0.96)',
    boxShadow: '0 7px 17px rgba(0,0,0,0.22)',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
  },
  buttonHighlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  buttonText: {
    color: '#061426',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
    flexShrink: 1,
  },
  pressed: {
    transform: [{ translateY: 2 }, { scale: 0.988 }],
    opacity: 0.90,
  },
  card: {
    position: 'relative',
    backgroundColor: 'rgba(20,34,61,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(120,154,207,0.38)',
    borderTopColor: 'rgba(216,232,255,0.58)',
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(43,44,92,0.96)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  error: {
    color: '#FF9EAF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    backgroundColor: 'rgba(122,27,52,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255,120,151,0.36)',
    borderRadius: 14,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
