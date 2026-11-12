export { addSpeechEvent } from "./bot/addSpeechEvent";
export {
  type SpeechOptions,
  type SpeechRecognition,
  /** @deprecated Use `SpeechRecognition` */
  type SpeechRecognition as speechRecognition,
  type CommonSpeechOptions,
  type SpeechRecognitionOptions,
  type SpeechRecognitionContext,
} from "./bot/speechOptions";
export { default as VoiceMessage } from "./bot/voiceMessage";
export { type VoiceMessageData } from "./bot/voiceMessage/VoiceMessage";
export { SpeechEvents } from "./events";
export { pcmToWav } from "./utils/audio";
export {
  type GoogleSpeechV2Options,
  resolveSpeechWithGoogleSpeechV2,
} from "./speechRecognition/googleV2";
export {
  resolveSpeechWithWitai,
  type WitaiOptions,
} from "./speechRecognition/witai";
