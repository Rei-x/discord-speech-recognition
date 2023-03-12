import { User } from "discord.js";
import { resolveSpeechWithGoogleSpeechV2 } from "../speechRecognition/googleV2";

/**
 * Speech recognition function, you can create your own and specify it in addSpeechEvent
 *
 * All options that you pass to addSpeechEvent function, will be later passed to this function.
 */
export interface SpeechRecognition {
  (audioBuffer: Buffer, options?: Record<string, any>): Promise<string>;
}

export interface CommonSpeechOptions {
  /**
   * Group identifier
   * https://discordjs.github.io/voice/interfaces/joinvoicechanneloptions.html#group
   */
  group?: string;
  /**
   * Custom handler to decide whether to recognize speech
   * @param user The user who spoke
   * @returns
   */
  shouldProcessSpeech?: (user: User) => boolean;
  /**
   * Defaults to true
   */
  ignoreBots?: boolean;
  /**
   * Minimal length of voice message that will be processed
   */
  minimalVoiceMessageDuration?: number;
}

/**
 * Options that will be passed to SpeechRecognition function
 *
 * Usage: `SpeechOptions<typeof *your speech recognition function here*>`
 */
export type SpeechOptions<
  T extends SpeechRecognition = typeof resolveSpeechWithGoogleSpeechV2
> = CommonSpeechOptions & {
  speechRecognition?: T;
} & Parameters<T>[1];
