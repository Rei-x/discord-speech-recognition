export {
  default as DiscordSR,
  SpeechRecognition as speechRecognition,
  DiscordSROptions,
} from "./bot/discordSR";
export { speech, voiceJoin } from "./events";
export { default as VoiceMessage } from "./bot/voiceMessage";
export {
  resolveSpeechWithGoogleSpeechV2,
  GoogleSpeechV2Options,
} from "./speechRecognition/googleV2";
export {
  resolveSpeechWithWITAI,
  WitaiOptions as WITAIOptions,
} from "./speechRecognition/witAI";
export { wavUrlToBuffer, getDurationFromMonoBuffer } from "./utils/audio";
