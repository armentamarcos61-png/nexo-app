import * as Speech from 'expo-speech';
import type { AssistantId } from '@/state/assistant';

type SpeechCallbacks = {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

let cachedVoices: Speech.Voice[] | null = null;

const femaleVoiceHints = [
  'dalia',
  'paulina',
  'sabina',
  'sofia',
  'mónica',
  'monica',
  'lucia',
  'lucía',
  'female',
  'mujer',
];

const maleVoiceHints = [
  'jorge',
  'juan',
  'raul',
  'raúl',
  'diego',
  'carlos',
  'male',
  'hombre',
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scoreVoice(voice: Speech.Voice, assistantId: AssistantId) {
  const language = normalize(voice.language ?? '');
  const name = normalize(voice.name ?? '');
  const identifier = normalize(voice.identifier ?? '');
  const hints = assistantId === 'nexa' ? femaleVoiceHints : maleVoiceHints;

  let score = 0;

  if (language === 'es-mx') score += 90;
  else if (language.startsWith('es-mx')) score += 80;
  else if (language.startsWith('es-')) score += 45;
  else if (language.startsWith('es')) score += 30;

  if (hints.some((hint) => name.includes(normalize(hint)))) score += 55;
  if (hints.some((hint) => identifier.includes(normalize(hint)))) score += 30;

  if (String(voice.quality).toLowerCase().includes('enhanced')) score += 8;

  return score;
}

async function getPreferredVoice(assistantId: AssistantId) {
  try {
    if (!cachedVoices) {
      cachedVoices = await Speech.getAvailableVoicesAsync();
    }

    return [...cachedVoices]
      .filter((voice) => normalize(voice.language ?? '').startsWith('es'))
      .sort((a, b) => scoreVoice(b, assistantId) - scoreVoice(a, assistantId))[0];
  } catch {
    return undefined;
  }
}

export async function speakAsAssistant(
  text: string,
  assistantId: AssistantId,
  callbacks: SpeechCallbacks = {}
) {
  await Speech.stop();

  const voice = await getPreferredVoice(assistantId);
  const isNexa = assistantId === 'nexa';

  Speech.speak(text, {
    language: voice?.language || 'es-MX',
    voice: voice?.identifier,
    rate: isNexa ? 0.96 : 0.93,
    pitch: isNexa ? 1.06 : 0.88,
    volume: 1,
    onStart: () => callbacks.onStart?.(),
    onDone: () => callbacks.onDone?.(),
    onStopped: () => callbacks.onStopped?.(),
    onError: () => callbacks.onError?.(),
  });
}

export async function stopAssistantSpeech() {
  await Speech.stop();
}

export async function isAssistantSpeaking() {
  return Speech.isSpeakingAsync();
}
