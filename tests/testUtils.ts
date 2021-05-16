/* eslint semi: ["error", "always"]*/
import {Client, Guild, VoiceChannel} from 'discord.js';
import {EventEmitter} from 'events';
import {DiscordSR} from '../src';

class WaitForBots extends EventEmitter {
    bots: Client[];
    readyBots: Set<string>;
    callback: CallableFunction;
    constructor(botsArray: Client[], callback) {
      super();
      this.bots = botsArray;
      this.readyBots = new Set();
      this.bots.forEach((client) => {
        client.on('ready', () => {
          this.setReady(client);
        });
      });
      this.callback = callback;
    }
    /**
     * @private
     * @param client
     */
    setReady(client: Client) {
      const numberOfReadyClients = this.readyBots.add(client.user.username).size;

      if (numberOfReadyClients == this.bots.length) {
        this.callback();
      }
    }
}

export class TestManager extends EventEmitter {
    testClient: Client;
    client: Client;
    discordSR: DiscordSR;
    testVoiceChannel: VoiceChannel;
    clientVoiceChannel: VoiceChannel;
    constructor(mainToken: string, testToken: string) {
      super();
      this.testClient = new Client();
      this.client = new Client();
      this.discordSR = new DiscordSR(this.client);

      this.client.login(mainToken);
      this.testClient.login(testToken);

      new WaitForBots([this.client, this.testClient], this.emitReadyEvent.bind(this));
    }

    emitReadyEvent(): void {
      this.emit('ready');
    }

    async setTestVoiceChannel(guildID: string): Promise<void> {
      const guild = this.getGuildFromID(guildID);
      return this.setOrCreateTestVoiceChannels(guild);
    }

    async destroyTestVoiceChannel(): Promise<void> {
      await this.testVoiceChannel.delete();
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
      this.clientVoiceChannel = (await this.client.channels.fetch(this.testVoiceChannel.id) as VoiceChannel);
    }

    private getTestChannel(guild: Guild): VoiceChannel | undefined {
      const testChannel = guild.channels.cache.find(
          (channel) => channel.type == 'voice' && channel.name == 'test') as VoiceChannel;
      return testChannel;
    }

    private async createTestChannel(guild: Guild): Promise<VoiceChannel> {
      const testChannel = await guild.channels.create('test', {type: 'voice'});
      return testChannel;
    }
}
