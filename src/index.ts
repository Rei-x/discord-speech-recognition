export {
  default as DiscordSR,
  DiscordSROptions,
  SpeechRecognition as speechRecognition,
  SpeechRecognitionOptions,
} from "./bot/discordSR";
export { default as VoiceMessage } from "./bot/voiceMessage";
export { audioStreamError, speech, voiceJoin } from "./events";
export {
  GoogleSpeechV2Options,
  resolveSpeechWithGoogleSpeechV2,
} from "./speechRecognition/googleV2";
export {
  resolveSpeechWithWITAI,
  WitaiOptions as WITAIOptions,
} from "./speechRecognition/witAI";
export { getDurationFromMonoBuffer, wavUrlToBuffer } from "./utils/audio";
