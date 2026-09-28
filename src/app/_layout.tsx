import { Stack } from 'expo-router';
import { DraftProvider } from '@/state/drafts';

export default function RootLayout() {
  return (
    <DraftProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DraftProvider>
  );
}
