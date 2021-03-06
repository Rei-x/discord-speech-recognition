import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { once } from "events";
import { addSpeechEvent } from "../src";
import config from "./config";
import sampleData from "./sampleData";
import { TestManager } from "./utils";

chai.use(chaiAsPromised);

describe("Speech options", () => {
  let tm: TestManager;

  before(async () => {
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

  after(() => {
    tm.disconnectFromVoiceChannel(config.GUILD_ID, "client");
    tm.disconnectFromVoiceChannel(config.GUILD_ID, "testClient");
  });
});
