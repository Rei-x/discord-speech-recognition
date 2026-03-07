import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from "@discordjs/voice";
import { expect, beforeAll, afterAll, describe, it } from "vitest";
import { Guild } from "discord.js";
import { once } from "events";
import fs from "fs";
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
  beforeAll(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  }, 20000);

  it("Test config", () => {
    expect(config.TESTBOT_TOKEN).toBeTypeOf("string");
    expect(config.BOT_TOKEN).toBeTypeOf("string");
    expect(config.GUILD_ID).toBeTypeOf("string");
  });

  it("Check if test bot and main bot are in the same guild", async () => {
    const testClientGuild = tm.testClient.guilds.cache.get(config.GUILD_ID);
    const clientGuild = tm.client.guilds.cache.get(config.GUILD_ID);

    expect(testClientGuild).toBeInstanceOf(Guild);
    expect(clientGuild).toBeInstanceOf(Guild);
    expect(testClientGuild?.id).toBe(clientGuild?.id);
  });

  const speechOptions: Array<SpeechOptions> = [
    { speechRecognition: resolveSpeechWithGoogleSpeechV2 },
    { speechRecognition: resolveSpeechWithWitai, key: config.WITAI_KEY },
  ];
  speechOptions.forEach((speechOption) => {
    describe(`Events with ${
      speechOption.speechRecognition?.name || "default"
    }`, () => {
      beforeAll(async () => {
        tm.resetClients();
        await tm.loginClients();

        addSpeechEvent(tm.client, {
          group: "client",
          ignoreBots: false,
          ...speechOptions,
        });

        return tm.setTestVoiceChannel(config.GUILD_ID);
      }, 16000);

      it("Voice join event", async () => {
        const voiceConnection = tm.connectToVoiceChannel("client");
        await once(tm.client as any, SpeechEvents.voiceJoin);
        (await voiceConnection).destroy();
      });

      it("Default speech recognition", { timeout: 12000 }, async () => {
        const player = createAudioPlayer();
        const resource = createAudioResource(
          fs.createReadStream(sampleData.normal.path),
          { inputType: StreamType.Arbitrary },
        );

        const testConnection = await tm.connectToVoiceChannel("testClient");
        await tm.connectToVoiceChannel("client");

        player.play(resource);
        testConnection.subscribe(player);

        return new Promise<void>((resolve, reject) => {
          tm.client.on(SpeechEvents.speech, (msg: VoiceMessage) => {
            try {
              expect(msg.content?.toLowerCase()).toContain(
                sampleData.normal.text,
              );
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        });
      });

      afterAll(() => {
        tm.disconnectFromVoiceChannel(config.GUILD_ID, "client");
        tm.disconnectFromVoiceChannel(config.GUILD_ID, "testClient");
      });
    });
  });
});
