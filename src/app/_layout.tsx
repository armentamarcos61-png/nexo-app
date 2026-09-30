import '../global.css';
import { Stack } from 'expo-router';
import { DraftProvider } from '@/state/drafts';
import { AppearanceProvider } from '@/state/appearance';
import { ProfessionalProfileProvider } from '@/state/professional-profile';
import { MarketplaceProvider } from '@/state/marketplace';
import { PortfolioProvider } from '@/state/portfolios';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <ProfessionalProfileProvider>
        <MarketplaceProvider>
          <PortfolioProvider>
            <DraftProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </DraftProvider>
          </PortfolioProvider>
        </MarketplaceProvider>
      </ProfessionalProfileProvider>
    </AppearanceProvider>
  );
}
