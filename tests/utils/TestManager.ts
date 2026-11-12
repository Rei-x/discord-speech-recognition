import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  Client,
  ClientOptions,
  Events,
  Guild,
  VoiceChannel,
  GatewayIntentBits,
  ChannelType,
} from "discord.js";
import fs from "fs";
import { setTimeout as sleep } from "timers/promises";

type ClientType = "client" | "testClient";

/**
 * Manages two real bots: `client` is the bot with speech recognition
 * and `testClient` is the bot that talks on the voice channel.
 */
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
      intents: [
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
      ],
    };
  }

  async resetClients() {
    await this.destroyClients();
    this.client = new Client(TestManager.clientOptions);
    this.testClient = new Client(TestManager.clientOptions);
  }

  async destroyClients() {
    await Promise.all([this.client.destroy(), this.testClient.destroy()]);
  }

  async loginClients() {
    const isClientReady = this.waitForClientToBeReady(this.client);
    const isTestClientReady = this.waitForClientToBeReady(this.testClient);
    await Promise.all([
      this.client.login(this.clientToken),
      this.testClient.login(this.testToken),
    ]);
    return Promise.all([isClientReady, isTestClientReady]);
  }

  async setTestVoiceChannel(guildID: string): Promise<void> {
    const guild = this.getGuildFromID(guildID);
    if (!guild) throw new Error(`Test bot isn't in the guild ${guildID}`);
    await this.setOrCreateTestVoiceChannels(guild);
  }

  /**
   * Disconnects both bots and gives Discord a moment, joining right after leaving is unreliable
   */
  async leaveVoiceChannels(guildID: string): Promise<void> {
    this.disconnectFromVoiceChannel(guildID, "client");
    this.disconnectFromVoiceChannel(guildID, "testClient");
    await sleep(1500);
  }

  disconnectFromVoiceChannel(guildID: string, type: ClientType) {
    const connection = getVoiceConnection(guildID, type);
    if (
      connection &&
      connection.state.status !== VoiceConnectionStatus.Destroyed
    ) {
      connection.destroy();
    }
  }

  async connectToVoiceChannel(
    type: ClientType,
    retries = 3,
  ): Promise<VoiceConnection> {
    let channel;
    if (type === "client") channel = this.clientVoiceChannel;
    else if (type === "testClient") channel = this.testVoiceChannel;

    if (!channel) throw new Error("Voice channel doesn't exist");

    let lastError: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      const connection = joinVoiceChannel({
        group: type,
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
        return connection;
      } catch (error) {
        lastError = error;
        try {
          connection.destroy();
        } catch {
          // ignore destroy errors
        }
      }
    }

    throw new Error(
      `Failed to connect to voice channel after ${retries} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  /**
   * Plays audio file on the connection and waits until it ends
   */
  async playAudio(connection: VoiceConnection, path: string): Promise<void> {
    const player = createAudioPlayer();
    const resource = createAudioResource(fs.createReadStream(path), {
      inputType: StreamType.Arbitrary,
    });
    const subscription = connection.subscribe(player);
    player.play(resource);

    try {
      await entersState(player, AudioPlayerStatus.Playing, 10e3);
      await entersState(player, AudioPlayerStatus.Idle, 60e3);
    } finally {
      subscription?.unsubscribe();
      player.stop(true);
    }
  }

  private async waitForClientToBeReady(client: Client) {
    return new Promise<void>((resolve) =>
      client.once(Events.ClientReady, () => resolve()),
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
      this.testVoiceChannel.id,
    )) as VoiceChannel;
  }

  private getTestChannel(guild: Guild): VoiceChannel | undefined {
    return guild.channels.cache.find(
      (channel): channel is VoiceChannel =>
        channel.type === ChannelType.GuildVoice && channel.name === "test",
    );
  }

  private async createTestChannel(guild: Guild): Promise<VoiceChannel> {
    return guild.channels.create({
      name: "test",
      type: ChannelType.GuildVoice,
    });
  }
}
