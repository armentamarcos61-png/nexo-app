import type { PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function NexoScreen({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <SafeAreaView style={ui.safe}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.container}>
        <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={ui.back}>
          <Text style={ui.link}>← Volver</Text>
        </Pressable>
        <Text accessibilityRole="header" style={ui.title}>{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Action({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, secondary && ui.secondary, (pressed || disabled) && { opacity: 0.6 }]}>
    <Text style={secondary ? ui.link : ui.buttonText}>{label}</Text>
  </Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={ui.field}><Text style={ui.label}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholderTextColor="#6B7280" {...props} style={[ui.input, props.multiline && ui.multiline, props.style]} />
  </View>;
}

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ECEEED' },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 60, gap: 16 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 30, letterSpacing: -0.6, fontWeight: '900', color: '#292344' },
  text: { fontSize: 16, lineHeight: 24, color: '#625A73' },
  label: { fontSize: 16, fontWeight: '700', color: '#292344' },
  link: { color: '#475875', fontWeight: '800', fontSize: 16 },
  field: { gap: 8 },
  input: { borderWidth: 1, borderColor: '#9CA3AF', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 14, minHeight: 50, fontSize: 16, color: '#292344' },
  multiline: { minHeight: 130, textAlignVertical: 'top' },
  button: { minHeight: 50, justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, borderTopColor: '#96A8BD', borderColor: '#3B4860', borderBottomWidth: 3, boxShadow: '0 5px 12px rgba(33,48,68,0.16)', backgroundColor: '#475875' },
  secondary: { backgroundColor: '#DEE5E8', borderWidth: 1, borderColor: '#ABBAC5' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: '#E4E8EA', borderWidth: 1, borderColor: '#BCC7CF', borderTopColor: '#FFFFFF', boxShadow: '0 5px 14px rgba(33,48,68,0.1)', borderRadius: 18, padding: 20, gap: 12 },
  error: { color: '#B91C1C', fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
