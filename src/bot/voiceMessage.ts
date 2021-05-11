import {Client, Guild, GuildMember, User, VoiceChannel} from 'discord.js';

interface VoiceMessageData {
    duration: number;
    audioBuffer: Buffer;
    content: string,
    author: User,
}

export class VoiceMessage {
    channel: VoiceChannel;
    content: string;
    author: User;
    duration: number;
    audioBuffer: Buffer;
    client: Client;
    /**
     * Voice message, it is emited `speech` event
     * @param client
     * @param data
     * @param channel
     */
    constructor(client: Client, data: VoiceMessageData, channel: VoiceChannel) {
      this.client = client;
      this.channel = channel;
      this.author = data.author;
      this.audioBuffer = data.audioBuffer;
      this.duration = data.duration;
      this.content = data.content;
    }
    get member(): GuildMember|null {
      return this.guild ? this.guild.member(this.author) || null : null;
    }
    get guild(): Guild|null {
      return this.channel.guild || null;
    }
}
