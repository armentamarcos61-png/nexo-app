'use dom';

import React from 'react';
import { AssistantStage } from '@/components/assistant-stage.web';
import type { AssistantProfile } from '@/state/assistant';

export default function AssistantStageDom({
  profile,
  speaking = false,
}: {
  profile: AssistantProfile;
  speaking?: boolean;
  dom?: import('expo/dom').DOMProps;
}) {
  return (
    <main style={{
      height: '100%', width: '100%', overflow: 'hidden',
      margin: 0, padding: 0, background: '#09111e',
    }}>
      <AssistantStage profile={profile} speaking={speaking} />
    </main>
  );
}
