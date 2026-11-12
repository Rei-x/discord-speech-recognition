import { VoiceConnection } from "@discordjs/voice";
import {
  Client,
  Guild,
  GuildMember,
  StageChannel,
  User,
  VoiceChannel,
} from "discord.js";
import { writeFileSync } from "fs";
import { encodeWav } from "../../utils/audio";

export interface VoiceMessageData {
  duration: number;
  audioBuffer: Buffer;
  content?: string;
  error?: Error;
  connection: VoiceConnection;
  author: User;
  startTimestamp?: number;
}

export default class VoiceMessage {
  channel: VoiceChannel | StageChannel;

  /**
   * Speech to text translation, empty if nothing was recognized
   */
  content?: string;

  author: User;

  /**
   * Duration in seconds
   */
  duration: number;

  /**
   * When the user started speaking, in milliseconds since the Unix epoch
   */
  startTimestamp: number;

  private static audioBufferFormat = {
    sampleRate: 48000,
    channels: 1,
  };

  /**
   * PCM mono 16-bit audio data with 48kHz sample rate
   */
  audioBuffer: Buffer;

  client: Client;

  /**
   * If speech recognition function threw an error, it will be set here
   */
  error?: Error;

  connection: VoiceConnection;

  /**
   * Voice message, it is emitted with `speech` event
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
    this.startTimestamp =
      data.startTimestamp ?? Date.now() - Math.round(data.duration * 1000);
    this.content = data?.content;
    this.error = data?.error;
  }

  /**
   * @returns Audio in .wav format
   */
  toWav(): Buffer {
    return encodeWav(this.audioBuffer, VoiceMessage.audioBufferFormat);
  }

  /**
   * Saves audio to .wav file
   * @param filename File directory, for example: `./test.wav`
   */
  saveToFile(filename: string): void {
    writeFileSync(filename, this.toWav());
  }

  /**
   * Useful if you want to send audio to some API or play it in browser
   * @returns Wav audio encoded to base64
   */
  getWavEncodedToBase64Audio(): string {
    return this.toWav().toString("base64");
  }

  get member(): GuildMember | undefined {
    return this.guild.members.cache.get(this.author.id);
  }

  get guild(): Guild {
    return this.channel.guild;
  }
}
