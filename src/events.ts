export const SpeechEvents = {
  speech: "speech",
  audioStreamError: "audioStreamError",
  voiceJoin: "voiceJoin",
} as const;

export type SpeechEvents = (typeof SpeechEvents)[keyof typeof SpeechEvents];
