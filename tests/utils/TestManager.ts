import {
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client, ClientOptions, Guild, VoiceChannel } from "discord.js";

export default class TestManager {
  testClient: Client;

  client: Client;

  testVoiceChannel: VoiceChannel | undefined;

  clientVoiceChannel: VoiceChannel | undefined;

  clientToken: string;

  testToken: string;

  constructor(mainToken: string, testToken: string) {
    this.clientToken = mainToken;
    this.testToken = testToken;

    this.testClient = new Client(TestManager.clientOptions);
    this.client = new Client(TestManager.clientOptions);
  }

  static get clientOptions(): ClientOptions {
    return {
      intents: ["GUILD_VOICE_STATES", "GUILD_MESSAGES", "GUILDS"],
    };
  }

  resetClients() {
    this.client = new Client(TestManager.clientOptions);
    this.testClient = new Client(TestManager.clientOptions);
  }

  async loginClients() {
    this.client.login(this.clientToken);
    this.testClient.login(this.testToken);
    const isClientReady = this.waitForClientToBeReady(this.client);
    const isTestClientReady = this.waitForClientToBeReady(this.testClient);
    return Promise.all([isClientReady, isTestClientReady]);
  }

  async setTestVoiceChannel(guildID: string): Promise<void> {
    const guild = this.getGuildFromID(guildID);
    if (!guild) return;
    await this.setOrCreateTestVoiceChannels(guild);
  }

  async disconnectFromVoiceChannel(
    guildID: string,
    type: "client" | "testClient"
  ) {
    getVoiceConnection(guildID, type)?.destroy();
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

  private async waitForClientToBeReady(client: Client) {
    return new Promise<void>((resolve) =>
      client.once("ready", () => resolve())
    );
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
