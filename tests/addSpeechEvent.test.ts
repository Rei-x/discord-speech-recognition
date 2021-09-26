/* eslint-disable no-invalid-this */
import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import { expect } from "chai";
import { Guild, VoiceChannel } from "discord.js";
import { once } from "events";
import { addSpeechEvent, VoiceMessage } from "../src/index";
import config from "./env";
import { TestManager } from "./utils";

const speechRecognitionSamples = [
  [
    "https://cdn.discordapp.com/attachments/838767598778843149/841292361291923487/ttsMP3.com_VoiceText_2021-5-10_14_35_18.mp3",
    "alexa play despacito",
  ],
];

describe("Test bot", () => {
  let tm: TestManager;
  before(function before() {
    this.timeout(4000);
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    return new Promise<void>((resolve) => {
      tm.once("ready", () => {
        resolve();
      });
    });
  });
  it("Test config", () => {
    expect(config.TESTBOT_TOKEN, "Test bot token not specified").to.be.string;
    expect(config.BOT_TOKEN, "Main bot token not specified").to.be.string;
    expect(config.GUILD_ID, "Guild ID not specified").to.be.string;
  });

  it("Check if test bot and main bot are in the same guild", async () =>
    new Promise((resolve, reject) => {
      const testClientGuild = tm.testClient.guilds.cache.get(config.GUILD_ID);
      const clientGuild = tm.client.guilds.cache.get(config.GUILD_ID);
      try {
        expect(testClientGuild, "Test bot not in guild").to.be.an.instanceOf(
          Guild
        );
        expect(clientGuild, "Main bot not in guild").to.be.an.instanceOf(Guild);
        expect(testClientGuild?.id).to.be.equal(clientGuild?.id);
        resolve();
      } catch (error) {
        reject(error);
      }
    }));
  describe("Events", () => {
    before(async function before() {
      this.timeout(6000);
      addSpeechEvent(tm.client);
      return tm.setTestVoiceChannel(config.GUILD_ID);
    });

    it("Test voice channel", () => {
      expect(tm.clientVoiceChannel).to.be.an.instanceOf(VoiceChannel);
      expect(tm.testVoiceChannel).to.be.an.instanceOf(VoiceChannel);
    });

    it("Voice join event", async () => {
      const voiceConnection = tm.connectToVoiceChannel("client");
      await once(tm.client, "voiceJoin");
      (await voiceConnection).destroy();
    });

    it("Default speech recognition", async function testSpeechRecognition() {
      this.timeout(7000);

      const [url, text] = speechRecognitionSamples[0];

      const player = createAudioPlayer();
      const resource = createAudioResource(url, {
        inputType: StreamType.Arbitrary,
      });

      const testConnection = await tm.connectToVoiceChannel("testClient");
      testConnection.subscribe(player);
      await tm.connectToVoiceChannel("client");

      player.play(resource);

      return new Promise((resolve, reject) => {
        tm.client.on("speech", (msg: VoiceMessage) => {
          try {
            expect(msg.content?.toLowerCase()).to.be.equal(text);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    after(async () => tm.testVoiceChannel?.delete());
  });
});
