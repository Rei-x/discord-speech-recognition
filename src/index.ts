export { addSpeechEvent } from "./bot/addSpeechEvent";
export {
  SpeechOptions,
  SpeechRecognition as speechRecognition,
} from "./bot/speechOptions";
export { default as VoiceMessage } from "./bot/voiceMessage";
export { speech, voiceJoin } from "./events";
export {
  GoogleSpeechV2Options,
  resolveSpeechWithGoogleSpeechV2,
} from "./speechRecognition/googleV2";
export {
  resolveSpeechWithWITAI,
  WitaiOptions as WITAIOptions,
} from "./speechRecognition/witAI";
