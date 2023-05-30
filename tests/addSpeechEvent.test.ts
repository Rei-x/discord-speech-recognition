import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import { expect } from "chai";
import { Guild } from "discord.js";
import { once } from "events";
import {
  addSpeechEvent,
  resolveSpeechWithGoogleSpeechV2,
  resolveSpeechWithWitai,
  SpeechEvents,
  SpeechOptions,
  VoiceMessage,
} from "../src/index";
import config from "./config";
import sampleData from "./sampleData";
import { TestManager } from "./utils";

describe("Test bot", () => {
  let tm: TestManager;

  before(async function before() {
    this.timeout(4000);
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
  });

  it("Test config", () => {
    expect(config.TESTBOT_TOKEN, "Test bot token not specified").to.be.string;
    expect(config.BOT_TOKEN, "Main bot token not specified").to.be.string;
    expect(config.GUILD_ID, "Guild ID not specified").to.be.string;
  });

  it("Check if test bot and main bot are in the same guild", async () => {
    const testClientGuild = tm.testClient.guilds.cache.get(config.GUILD_ID);
    const clientGuild = tm.client.guilds.cache.get(config.GUILD_ID);

    expect(testClientGuild, "Test bot not in guild").to.be.an.instanceOf(Guild);
    expect(clientGuild, "Main bot not in guild").to.be.an.instanceOf(Guild);
    expect(testClientGuild?.id).to.be.equal(clientGuild?.id);
  });

  const speechOptions: Array<SpeechOptions> = [
    { speechRecognition: resolveSpeechWithGoogleSpeechV2 },
    { speechRecognition: resolveSpeechWithWitai, key: config.WITAI_KEY },
  ];
  speechOptions.forEach((speechOption) => {
    describe(`Events with ${
      speechOption.speechRecognition?.name || "default"
    }`, () => {
      before(async function before() {
        this.timeout(16000);

        tm.resetClients();
        await tm.loginClients();

        addSpeechEvent(tm.client, {
          group: "client",
          ignoreBots: false,
          ...speechOptions,
        });

        return tm.setTestVoiceChannel(config.GUILD_ID);
      });

      it("Voice join event", async () => {
        const voiceConnection = tm.connectToVoiceChannel("client");
        await once(tm.client, SpeechEvents.voiceJoin);
        (await voiceConnection).destroy();
      });

      it("Default speech recognition", async function testSpeechRecognition() {
        this.timeout(12000);

        const player = createAudioPlayer();
        const resource = createAudioResource(sampleData.normal.url, {
          inputType: StreamType.Arbitrary,
        });

        const testConnection = await tm.connectToVoiceChannel("testClient");
        await tm.connectToVoiceChannel("client");

        player.play(resource);
        testConnection.subscribe(player);

        return new Promise((resolve, reject) => {
          tm.client.on(SpeechEvents.speech, (msg: VoiceMessage) => {
            try {
              expect(msg.content?.toLowerCase()).to.contain(
                sampleData.normal.text
              );
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

      after(() => {
        tm.disconnectFromVoiceChannel(config.GUILD_ID, "client");
        tm.disconnectFromVoiceChannel(config.GUILD_ID, "testClient");
      });
    });
  });
});
