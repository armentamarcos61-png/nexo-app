import { Stack } from 'expo-router';
import { DraftProvider } from '@/state/drafts';
import { AppearanceProvider } from '@/state/appearance';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <DraftProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </DraftProvider>
    </AppearanceProvider>
  );
}
