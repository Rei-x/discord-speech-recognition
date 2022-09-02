import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiSpies from "chai-spies";
import { User } from "discord.js";
import { once } from "events";
import { addSpeechEvent } from "../src";
import config from "./config";
import sampleData from "./sampleData";
import { TestManager } from "./utils";

chai.use(chaiAsPromised);
chai.use(chaiSpies);

describe("Speech options", () => {
  let tm: TestManager;

  beforeEach(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  });

  it("Ignore bots", async function ignoreBots() {
    this.timeout(7000);

    addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: true,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(sampleData.normal.url, {
      inputType: StreamType.Arbitrary,
    });
    const connection = await tm.connectToVoiceChannel("testClient");
    connection.subscribe(player);

    await tm.connectToVoiceChannel("client");

    player.play(resource);

    return new Promise<void>((resolve, reject) => {
      once(tm.client, "speech").then(() =>
        reject("Bot recognized speech with ignoreBots set to true")
      );
      setTimeout(() => resolve(), 4000);
    });
  });

  it("shouldProcessSpeech option", async function processSpeech() {
    this.timeout(7000);

    const shouldProcessSpeech = (user: User) => {
      expect(user.username).to.equal(tm.testClient.user?.username);
      return true;
    };
    const spiedShouldProcessSpeech = chai.spy(shouldProcessSpeech);

    addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: false,
      shouldProcessSpeech: spiedShouldProcessSpeech,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(sampleData.normal.url, {
      inputType: StreamType.Arbitrary,
    });
    const connection = await tm.connectToVoiceChannel("testClient");
    connection.subscribe(player);

    await tm.connectToVoiceChannel("client");

    player.play(resource);

    return new Promise<void>((resolve, reject) => {
      tm.client.once("speech", () => {
        try {
          chai.expect(spiedShouldProcessSpeech).to.have.been.called();
        } catch (e) {
          reject(e);
        }
        resolve();
      });
    });
  });

  afterEach(() => {
    tm.disconnectFromVoiceChannel(config.GUILD_ID, "client");
    tm.disconnectFromVoiceChannel(config.GUILD_ID, "testClient");
    tm.resetClients();
  });
});
