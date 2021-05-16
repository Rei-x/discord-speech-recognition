export {default as DiscordSR, speechRecognition, DiscordSROptions} from './bot/discordSR';
export {speech, voiceJoin} from './events';
export {VoiceMessage} from './bot/voiceMessage';
export {resolveSpeechWithGoogleSpeechV2, GoogleSpeechV2Options} from './speechRecognition/googleV2';
export {resolveSpeechWithWITAI, WITAIOptions} from './speechRecognition/witAI';
export {wavUrlToBuffer, getDurationFromMonoBuffer} from './utils/audio';
