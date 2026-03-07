export { addSpeechEvent } from "./bot/addSpeechEvent";
export {
  type SpeechOptions,
  type SpeechRecognition as speechRecognition,
  type CommonSpeechOptions,
} from "./bot/speechOptions";
export { default as VoiceMessage } from "./bot/voiceMessage";
export { SpeechEvents } from "./events";
export {
  type GoogleSpeechV2Options,
  resolveSpeechWithGoogleSpeechV2,
} from "./speechRecognition/googleV2";
export {
  resolveSpeechWithWitai,
  type WitaiOptions,
} from "./speechRecognition/witai";
