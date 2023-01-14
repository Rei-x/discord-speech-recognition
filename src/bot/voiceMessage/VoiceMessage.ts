import { VoiceConnection } from "@discordjs/voice";
import {
  Client,
  Guild,
  GuildMember,
  StageChannel,
  User,
  VoiceChannel,
} from "discord.js";
import wav from "wav";

export interface VoiceMessageData {
  duration: number;
  audioBuffer: Buffer;
  content?: string;
  error?: Error;
  connection: VoiceConnection;
  author: User;
}

export default class VoiceMessage {
  channel: VoiceChannel | StageChannel;

  /**
   * Speech to text translation
   */
  content?: string;

  author: User;

  /**
   * Duration in seconds
   */
  duration: number;

  private static audioBufferFormat = {
    sampleRate: 48000,
    channels: 1,
  };

  /**
   * PCM mono 48k audio data
   */
  audioBuffer: Buffer;

  client: Client;

  /**
   * If there was any error during handling speech event, this will be set
   */
  error?: Error;

  connection: VoiceConnection;

  /**
   * Voice message, it is emited `speech` event
   * @param client
   * @param data
   * @param channel
   * @private
   */
  constructor({
    client,
    data,
    channel,
  }: {
    client: Client;
    data: VoiceMessageData;
    channel: VoiceChannel | StageChannel;
  }) {
    this.client = client;
    this.channel = channel;
    this.author = data.author;
    this.audioBuffer = data.audioBuffer;
    this.connection = data.connection;
    this.duration = data.duration;
    this.content = data?.content;
    this.error = data?.error;
  }

  /**
   * Saves audio to .wav file
   * @param filename File directory, for example: `./test.wav`
   */
  saveToFile(filename: string): void {
    const outputFile = new wav.FileWriter(
      filename,
      VoiceMessage.audioBufferFormat
    );
    outputFile.write(this.audioBuffer);
    outputFile.end();
  }

  /**
   * Useful if you want to send audio to some API or play it in browser
   * @returns Wav audio encoded to base64
   */
  getWavEncodedToBase64Audio() {
    const writer = new wav.Writer(VoiceMessage.audioBufferFormat);

    writer.write(this.audioBuffer);
    writer.end();

    return writer.read(writer.readableLength).toString("base64");
  }

  get member(): GuildMember | undefined {
    return this.guild.members.cache.get(this.author.id);
  }

  get guild(): Guild {
    return this.channel.guild;
  }
}
