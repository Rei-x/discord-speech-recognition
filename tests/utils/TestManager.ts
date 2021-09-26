import {
  entersState,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client, ClientOptions, Guild, VoiceChannel } from "discord.js";
import { EventEmitter } from "events";
import { addSpeechEvent } from "../../src";
import Waiter from "./WaitForBots";

export default class TestManager extends EventEmitter {
  testClient: Client;

  client: Client;

  testVoiceChannel: VoiceChannel | undefined;

  clientVoiceChannel: VoiceChannel | undefined;

  constructor(mainToken: string, testToken: string) {
    super();
    const clientOptions: ClientOptions = {
      intents: ["GUILD_VOICE_STATES", "GUILD_MESSAGES", "GUILDS"],
    };
    this.testClient = new Client(clientOptions);
    this.client = new Client(clientOptions);
    addSpeechEvent(this.client, { group: "client" });

    this.client.login(mainToken);
    this.testClient.login(testToken);

    const waiter = new Waiter([this.client, this.testClient]);
    waiter.waitForBots(this.emitReadyEvent.bind(this));
  }

  emitReadyEvent(): void {
    this.emit("ready");
  }

  async setTestVoiceChannel(guildID: string): Promise<void> {
    const guild = this.getGuildFromID(guildID);
    if (!guild) return;
    await this.setOrCreateTestVoiceChannels(guild);
  }

  async connectToVoiceChannel(
    type: "client" | "testClient"
  ): Promise<VoiceConnection> {
    let channel;
    if (type === "client") channel = this.clientVoiceChannel;
    else if (type === "testClient") channel = this.testVoiceChannel;

    if (!channel) throw new Error("Voice channel doesn't exist");

    const connection = joinVoiceChannel({
      group: type,
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }

  private getGuildFromID(guildID: string) {
    return this.testClient.guilds.cache.get(guildID);
  }

  private async setOrCreateTestVoiceChannels(guild: Guild): Promise<void> {
    const voiceChannel = this.getTestChannel(guild);
    if (voiceChannel) {
      this.testVoiceChannel = voiceChannel;
    } else {
      this.testVoiceChannel = await this.createTestChannel(guild);
    }
    this.clientVoiceChannel = (await this.client.channels.fetch(
      this.testVoiceChannel.id
    )) as VoiceChannel;
  }

  private getTestChannel(guild: Guild): VoiceChannel | undefined {
    return guild.channels.cache.find(
      (channel) => channel.type === "GUILD_VOICE" && channel.name === "test"
    ) as VoiceChannel;
  }

  private async createTestChannel(guild: Guild): Promise<VoiceChannel> {
    return guild.channels.create("test", {
      type: "GUILD_VOICE",
    });
  }
}
