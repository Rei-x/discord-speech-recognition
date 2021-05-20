/* eslint-disable no-invalid-this */
import {expect} from 'chai';
import {Client, Guild, VoiceChannel} from 'discord.js';
import {TestManager} from './testUtils';
import {DiscordSR, resolveSpeechWithWITAI, VoiceMessage} from '../src/index';
import {BOT_TOKEN, TESTBOT_TOKEN, GUILD_ID} from './env';
import {once} from 'events';


const speechRecognitionSamples = [
  ['https://cdn.discordapp.com/attachments/838767598778843149/841292361291923487/ttsMP3.com_VoiceText_2021-5-10_14_35_18.mp3', 'alexa play despacito'],
];


describe('DiscordSR tests', function() {
  describe('Options', function() {
    const client = new Client();
    it('Default options', function() {
      const discordSR = new DiscordSR(client);
      expect(discordSR.speechOptions.speechRecognition).to.be.not.undefined;
      expect(discordSR.speechOptions.lang).to.be.not.undefined;
    });
    it('Custom options', function() {
      const discordSR = new DiscordSR(client, {
        lang: 'pl',
        speechRecognition: resolveSpeechWithWITAI,
      });
      expect(discordSR.speechOptions.speechRecognition).to.be.equal(resolveSpeechWithWITAI);
      expect(discordSR.speechOptions.lang).to.be.equal('pl');
    });
  });
  describe('Test bot', function() {
    let tm: TestManager;
    before(function() {
      this.timeout(4000);
      tm = new TestManager(BOT_TOKEN, TESTBOT_TOKEN);
      return new Promise<void>((resolve) => {
        tm.once('ready', () => {
          resolve();
        });
      });
    });

    it('Test config', function() {
      expect(TESTBOT_TOKEN, 'Test bot token not specified').to.be.string;
      expect(BOT_TOKEN, 'Main bot token not specified').to.be.string;
      expect(GUILD_ID, 'Guild ID not specified').to.be.string;
    });

    it('Check if test bot and main bot are in the same guild', async function() {
      return new Promise((resolve, reject) => {
        const testClientGuild: Guild = tm.testClient.guilds.cache.get(GUILD_ID);
        const clientGuild = tm.client.guilds.cache.get(GUILD_ID);
        try {
          expect(testClientGuild, 'Test bot not in guild').to.be.an.instanceOf(Guild);
          expect(clientGuild, 'Main bot not in guild').to.be.an.instanceOf(Guild);
          expect(testClientGuild.id).to.be.equal(clientGuild.id);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    },
    );
    describe('Events', function() {
      before(function() {
        this.timeout(6000);
        return tm.setTestVoiceChannel(GUILD_ID);
      });

      it('Test voice channel', function() {
        expect(tm.clientVoiceChannel).to.be.an.instanceOf(VoiceChannel);
        expect(tm.testVoiceChannel).to.be.an.instanceOf(VoiceChannel);
      });

      it('Voice join event', async function() {
        tm.clientVoiceChannel.join();
        await once(tm.client, 'voiceJoin');
      });

      it('Default speech recognition', async function() {
        this.timeout(7000);

        await tm.clientVoiceChannel.join();
        const testConnection = await tm.testVoiceChannel.join();
        const [url, text] = speechRecognitionSamples[0];

        testConnection.play(url);

        return new Promise((resolve, reject) => {
          tm.client.on('speech', (msg: VoiceMessage) => {
            try {
              expect(msg.content.toLowerCase()).to.be.equal(text);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

      after(function() {
        return tm.destroyTestVoiceChannel();
      });
    });
  });
});


