import React from 'react';
import { View } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import AssistantStageDom from '@/components/assistant-stage-dom';

export function AssistantStage({
  profile,
  speaking = false,
  speechText = '',
}: {
  profile: AssistantProfile;
  speaking?: boolean;
  speechText?: string;
}) {
  // Expo 57 DOM components use the bundled WebView for the same 3D stage
  // on Android and iOS; no extra native rendering dependency is required.
  return (
    <View style={{ width: '100%', height: 605, overflow: 'hidden', borderRadius: 27 }}>
      <AssistantStageDom
        profile={profile}
        speaking={speaking}
        speechText={speechText}
        dom={{ scrollEnabled: false }}
      />
    </View>
  );
}
