import { Stack } from 'expo-router';
import { DraftProvider } from '@/state/drafts';
import { AppearanceProvider } from '@/state/appearance';
import { ProfessionalProfileProvider } from '@/state/professional-profile';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <ProfessionalProfileProvider>
        <DraftProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </DraftProvider>
      </ProfessionalProfileProvider>
    </AppearanceProvider>
  );
}
