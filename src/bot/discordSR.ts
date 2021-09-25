/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client, User, VoiceConnection } from "discord.js";
import { resolveSpeechWithGoogleSpeechV2 } from "../speechRecognition/googleV2";
import { convertStereoToMono, getDurationFromMonoBuffer } from "../utils/audio";
import VoiceMessage from "./voiceMessage";

export interface SpeechRecognitionOptions {
  lang?: string;
  key?: string;
  profanityFilter?: boolean;
}

/**
 * Speech recognition function, you can create your own and specify it in [[DiscordSROptions]], when creating [[DiscordSR]] object.
 *
 * All options that you pass to [[DiscordSR]] constructor, will be later passed to this function.
 */
export interface SpeechRecognition {
  (audioBuffer: Buffer, options?: SpeechRecognitionOptions): Promise<string>;
}

/**
 * Options that will be passed to [[speechRecognition]] function
 */
export interface DiscordSROptions {
  speechRecognition?: SpeechRecognition;
  speechOptions: SpeechRecognitionOptions;
}

/**
 * Main class, use this to add new events to present [discord.Client](https://discord.js.org/#/docs/main/stable/class/Client)
 *
 * **This class does not emit events, client that you passed does**
 *
 * Defaults uses `en-US` language and google speech v2 api with generic key, that should be used for personal or testing purposes only, as it may be revoked by Google at any time.\
 * You can obtain your own API key here <http://www.chromium.org/developers/how-tos/api-keys>.\
 * See [python speech recognition package](https://github.com/Uberi/speech_recognition/blob/c89856088ad81d81d38be314e3db50905481c5fe/speech_recognition/__init__.py#L850) for more details.
 */
export default class DiscordSR {
  client: Client;

  options: DiscordSROptions;

  constructor(
    client: Client,
    options: DiscordSROptions = {
      speechRecognition: resolveSpeechWithGoogleSpeechV2,
      speechOptions: {
        lang: "en-US",
        profanityFilter: true,
      },
    }
  ) {
    this.client = client;
    this.options = options;

    this.setupVoiceJoinEvent();
    this.setupSpeechEvent();
  }

  /**
   * Enables `voiceJoin` event on Client
   */
  private setupVoiceJoinEvent(): void {
    this.client.on("voiceStateUpdate", (_old, newVoiceState) => {
      if (newVoiceState.connection)
        this.client.emit("voiceJoin", newVoiceState.connection);
    });
  }

  /**
   * Enables `speech` event on Client, which is called whenever someone stops speaking
   */
  private setupSpeechEvent(): void {
    this.client.on("voiceJoin", (connection: VoiceConnection) => {
      connection.once("ready", () => {
        this.handleSpeakingEvent(connection);
      });
    });
  }

  /**
   * Starts listening on connection and emits `speech` event when someone stops speaking
   * @param connection Connection to listen
   */
  private handleSpeakingEvent(connection: VoiceConnection) {
    connection.on("speaking", (user) => {
      const audioStream = connection.receiver.createStream(user, {
        mode: "pcm",
      });
      const bufferData: Uint8Array[] = [];

      audioStream.on("data", (data) => {
        bufferData.push(data);
      });

      audioStream.on("end", async () => {
        const voiceMessage = await this.createVoiceMessage(
          bufferData,
          user,
          connection
        );
        if (voiceMessage) this.client.emit("speech", voiceMessage);
      });
    });
  }

  private async createVoiceMessage(
    bufferData: Uint8Array[],
    user: User,
    connection: VoiceConnection
  ): Promise<VoiceMessage | undefined> {
    const stereoBuffer = Buffer.concat(bufferData);
    const monoBuffer = convertStereoToMono(stereoBuffer);

    const duration = getDurationFromMonoBuffer(stereoBuffer);

    if (duration < 1 || duration > 19) return undefined;

    let content;
    let error;
    try {
      content = await this.options.speechRecognition?.(
        monoBuffer,
        this.options.speechOptions
      );
    } catch (e) {
      error = e;
    }

    const voiceMessage = new VoiceMessage(
      this.client,
      {
        author: user,
        duration,
        audioBuffer: stereoBuffer,
        content,
        error,
      },
      connection.channel
    );
    return voiceMessage;
  }
}
