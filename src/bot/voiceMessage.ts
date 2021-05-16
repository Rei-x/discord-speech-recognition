import {Client, Guild, GuildMember, User, VoiceChannel} from 'discord.js';
import wav from 'wav';
interface VoiceMessageData {
  duration: number;
  audioBuffer: Buffer;
  content?: string,
  error?: string,
  author: User,
}

export class VoiceMessage {
  channel: VoiceChannel;
  /**
   * Speech to text translation
   */
  content?: string;
  author: User;
  /**
   * Duration in seconds
   */
  duration: number;
  /**
   * PCM mono 48k audio data
   */
  audioBuffer: Buffer;
  client: Client;
  /**
   * If there was any error during handling speech event, this will be set
   */
  error?: string;
  /**
   * Voice message, it is emited `speech` event
   * @param client
   * @param data
   * @param channel
   * @private
   */
  constructor(client: Client, data: VoiceMessageData, channel: VoiceChannel) {
    this.client = client;
    this.channel = channel;
    this.author = data.author;
    this.audioBuffer = data.audioBuffer;
    this.duration = data.duration;
    this.content = data?.content;
    this.error = data?.error;
  }
  /**
   * Saves audio to .wav file
   * @param filename File directory, for example: `./test.wav`
   */
  saveToFile(filename: string): void {
    const outputFile = new wav.FileWriter(filename, {
      sampleRate: 48000,
      channels: 1,
    });
    outputFile.write(this.audioBuffer);
    outputFile.end();
  }
  get member(): GuildMember | null {
    return this.guild.member(this.author);
  }
  get guild(): Guild {
    return this.channel.guild;
  }
}
