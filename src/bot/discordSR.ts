import { Client, User } from "discord.js";
import {
  EndBehaviorType,
  getVoiceConnection,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { resolveSpeechWithGoogleSpeechV2 } from "../speechRecognition/googleV2";
import { convertStereoToMono, getDurationFromMonoBuffer } from "../utils/audio";
import VoiceMessage from "./voiceMessage";

/**
 * Speech recognition function, you can create your own and specify it in [[DiscordSROptions]], when creating [[DiscordSR]] object.
 *
 * All options that you pass to [[DiscordSR]] constructor, will be later passed to this function.
 */
export interface SpeechRecognition {
  (
    audioBuffer: Buffer,
    options?: { lang?: string; key?: string }
  ): Promise<string>;
}

/**
 * Options that will be passed to [[speechRecognition]] function
 */
export interface DiscordSROptions {
  lang?: string;
  speechRecognition?: SpeechRecognition;
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

  speechOptions: DiscordSROptions;

  constructor(
    client: Client,
    options: DiscordSROptions = {
      lang: "en-US",
      speechRecognition: resolveSpeechWithGoogleSpeechV2,
    }
  ) {
    this.client = client;
    this.speechOptions = options;

    this.setupVoiceJoinEvent();
    this.setupSpeechEvent();
  }

  /**
   * Enables `voiceJoin` event on Client
   */
  private setupVoiceJoinEvent(): void {
    this.client.on("voiceStateUpdate", (_old, newVoiceState) => {
      if (newVoiceState.channel)
        this.client.emit(
          "voiceJoin",
          getVoiceConnection(newVoiceState.channel.guild.id)
        );
    });
  }

  /**
   * Enables `speech` event on Client, which is called whenever someone stops speaking
   */
  private setupSpeechEvent(): void {
    this.client.on("voiceJoin", (connection: VoiceConnection) => {
      connection.once(VoiceConnectionStatus.Ready, () => {
        this.handleSpeakingEvent(connection);
      });
    });
  }

  /**
   * Starts listening on connection and emits `speech` event when someone stops speaking
   * @param connection Connection to listen
   */
  private handleSpeakingEvent(connection: VoiceConnection) {
    connection.receiver.speaking.on("start", (userId) => {
      const { receiver } = connection;
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 100,
        },
      });
      const bufferData: Uint8Array[] = [];

      opusStream.on("data", (data: Uint8Array) => {
        bufferData.push(data);
      });

      opusStream.on("end", async () => {
        const user = this.client.users.cache.get(userId);
        if (!user) return;

        const voiceMessage = await this.createVoiceMessage({
          bufferData,
          user,
          connection,
        });
        if (voiceMessage) this.client.emit("speech", voiceMessage);
      });
    });
  }

  private async createVoiceMessage({
    bufferData,
    user,
    connection,
  }: {
    bufferData: Uint8Array[];
    user: User;
    connection: VoiceConnection;
  }): Promise<VoiceMessage | undefined> {
    if (!connection.joinConfig.channelId) return undefined;

    const stereoBuffer = Buffer.concat(bufferData);
    const monoBuffer = convertStereoToMono(stereoBuffer);

    const duration = getDurationFromMonoBuffer(stereoBuffer);

    if (duration < 1 || duration > 19) return undefined;

    let content;
    let error;
    try {
      content = await this.speechOptions.speechRecognition?.(
        monoBuffer,
        this.speechOptions
      );
    } catch (e) {
      error = e;
    }

    const channel = this.client.channels.cache.get(
      connection.joinConfig.channelId
    );
    if (!channel || !channel.isVoice()) return undefined;

    const voiceMessage = new VoiceMessage({
      client: this.client,
      data: {
        author: user,
        duration,
        audioBuffer: stereoBuffer,
        content,
        error,
        connection,
      },
      channel,
    });
    return voiceMessage;
  }
}
