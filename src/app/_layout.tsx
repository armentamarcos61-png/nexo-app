import '../global.css';
import { Stack } from 'expo-router';
import { DraftProvider } from '@/state/drafts';
import { AppearanceProvider } from '@/state/appearance';
import { AuthProvider } from '@/state/auth';
import { AssistantProvider } from '@/state/assistant';
import { AssistantFloatingLayer } from '@/components/assistant-floating-layer';
import { ProfessionalProfileProvider } from '@/state/professional-profile';
import { MarketplaceProvider } from '@/state/marketplace';
import { PortfolioProvider } from '@/state/portfolios';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <AssistantProvider>
          <ProfessionalProfileProvider>
            <MarketplaceProvider>
              <PortfolioProvider>
                <DraftProvider>
                  <Stack screenOptions={{ headerShown: false }} />
                  <AssistantFloatingLayer />
                </DraftProvider>
              </PortfolioProvider>
            </MarketplaceProvider>
          </ProfessionalProfileProvider>
        </AssistantProvider>
      </AuthProvider>
    </AppearanceProvider>
  );
}
