import { VoiceConnection } from "@discordjs/voice";
import { User } from "discord.js";
import { resolveSpeechWithGoogleSpeechV2 } from "../speechRecognition/googleV2";

/**
 * Speech recognition function, you can create your own and specify it in addSpeechEvent
 *
 * It receives PCM mono 16-bit audio with 48kHz sample rate.
 * All options that you pass to addSpeechEvent function, will be later passed to this function.
 * The third parameter tells who spoke and on which voice connection, so the function can behave differently for each guild.
 */
export interface SpeechRecognition {
  (
    audioBuffer: Buffer,
    options?: any,
    context?: SpeechRecognitionContext,
  ): Promise<string>;
}

export interface SpeechRecognitionContext {
  /**
   * The user who spoke
   */
  user: User;
  /**
   * Voice connection the user spoke on, `connection.joinConfig` has ids of the guild and the channel
   */
  connection: VoiceConnection;
}

export interface CommonSpeechOptions {
  /**
   * Group identifier, use it if you pass `group` to `joinVoiceChannel`
   * https://discord.js.org/docs/packages/voice/main/JoinVoiceChannelOptions:Interface#group
   */
  group?: string;

  /**
   * Custom handler to decide whether to recognize speech.
   * It is called when the user starts speaking: if it returns false, the audio isn't recorded or sent anywhere.
   * @param user The user who spoke
   * @param connection Voice connection the user spoke on, `connection.joinConfig` has ids of the guild and the channel
   * @returns
   */
  shouldProcessSpeech?: (user: User, connection: VoiceConnection) => boolean;

  /**
   * Don't listen to other bots. Defaults to true
   */
  ignoreBots?: boolean;

  /**
   * Minimal length of voice message that will be processed, in seconds. Defaults to 1
   */
  minimalVoiceMessageDuration?: number;

  /**
   * Maximal length of a single voice message, in seconds. Longer speech is split into multiple voice messages.
   *
   * Defaults to 19, because Google Speech and wit.ai reject longer audio. Raise it if your speech recognition function can handle more.
   */
  maximalVoiceMessageDuration?: number;

  /**
   * How long the user has to be silent before the voice message ends, in milliseconds. Defaults to 300
   */
  silenceDuration?: number;
}

/**
 * Options that will be passed to SpeechRecognition function
 *
 * Usage: `SpeechOptions<typeof *your speech recognition function here*>`
 */
export type SpeechOptions<
  T extends SpeechRecognition = typeof resolveSpeechWithGoogleSpeechV2,
> = CommonSpeechOptions & {
  speechRecognition?: T;
} & SpeechRecognitionOptions<T>;

/**
 * Type of the second parameter of speech recognition function
 */
export type SpeechRecognitionOptions<T extends SpeechRecognition> =
  // Options typed as `any`
  0 extends 1 & Parameters<T>[1]
    ? Record<string, any>
    : // Function that doesn't take any options
      [NonNullable<Parameters<T>[1]>] extends [never]
      ? unknown
      : NonNullable<Parameters<T>[1]>;
