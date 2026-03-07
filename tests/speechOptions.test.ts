import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import {
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  it,
} from "vitest";
import { User } from "discord.js";
import { once } from "events";
import fs from "fs";
import { addSpeechEvent, SpeechEvents } from "../src";
import config from "./config";
import sampleData from "./sampleData";
import { TestManager } from "./utils";

describe("Speech options", () => {
  let tm: TestManager;
  beforeAll(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  }, 20000);

  beforeEach(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  }, 20000);

  it("Ignore bots", { timeout: 7000 }, async () => {
    addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: true,
    });

    const player = createAudioPlayer();
    const resource = createAudioResource(
      fs.createReadStream(sampleData.normal.path),
      { inputType: StreamType.Arbitrary },
    );
    const connection = await tm.connectToVoiceChannel("testClient");
    connection.subscribe(player);

    await tm.connectToVoiceChannel("client");

    player.play(resource);

    return new Promise<void>((resolve, reject) => {
      once(tm.client as any, SpeechEvents.speech).then(() =>
        reject("Bot recognized speech with ignoreBots set to true"),
      );
      setTimeout(() => resolve(), 4000);
    });
  });

  it("shouldProcessSpeech option", { timeout: 7000 }, async () => {
    const shouldProcessSpeech = (user: User) => {
      expect(user.username).toBe(tm.testClient.user?.username);
      return true;
    };
    const spiedShouldProcessSpeech = vi.fn(shouldProcessSpeech);

    const speechOptions = addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: false,
    });

    speechOptions.shouldProcessSpeech = spiedShouldProcessSpeech;

    const player = createAudioPlayer();
    const resource = createAudioResource(
      fs.createReadStream(sampleData.normal.path),
      { inputType: StreamType.Arbitrary },
    );
    const connection = await tm.connectToVoiceChannel("testClient");
    connection.subscribe(player);

    await tm.connectToVoiceChannel("client");

    player.play(resource);

    return new Promise<void>((resolve, reject) => {
      tm.client.once(SpeechEvents.speech, () => {
        try {
          expect(spiedShouldProcessSpeech).toHaveBeenCalled();
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
