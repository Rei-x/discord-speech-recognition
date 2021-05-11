export {default as DiscordSR} from './bot/discordSR';
export {speech, voiceJoin} from './events';
export {VoiceMessage} from './bot/voiceMessage';
export {resolveSpeechWithGoogleSpeechV2, GoogleSpeechV2Options} from './speechRecognition/googleV2';
export {resolveSpeechWithWITAI, WITAIOptions} from './speechRecognition/witAI';
export {wavUrlToBuffer, getDurationFromStereoBuffer as getDurationFromBuffer} from './utils/audio';
