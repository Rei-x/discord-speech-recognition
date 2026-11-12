import { VoiceConnection, VoiceConnectionStatus } from "@discordjs/voice";
import { expect, beforeAll, afterAll, afterEach, describe, it } from "vitest";
import { Guild } from "discord.js";
import { once } from "events";
import { setTimeout as sleep } from "timers/promises";
import {
  addSpeechEvent,
  resolveSpeechWithGoogleSpeechV2,
  resolveSpeechWithWitai,
  SpeechEvents,
  SpeechOptions,
  VoiceMessage,
} from "../../src";
import config, { hasDiscordConfig, hasWitaiConfig } from "../config";
import sampleData from "../sampleData";
import { TestManager } from "../utils";

/** Audio received from Discord has a bit of silence around the speech */
const expectedDuration = { min: 1.8, max: 3.2 };

describe.skipIf(!hasDiscordConfig)("Test bot", () => {
  let tm: TestManager;
  beforeAll(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  }, 20000);

  afterAll(async () => {
    await tm.destroyClients();
  });

  it("Check if test bot and main bot are in the same guild", () => {
    const testClientGuild = tm.testClient.guilds.cache.get(config.GUILD_ID);
    const clientGuild = tm.client.guilds.cache.get(config.GUILD_ID);

    expect(testClientGuild).toBeInstanceOf(Guild);
    expect(clientGuild).toBeInstanceOf(Guild);
    expect(testClientGuild?.id).toBe(clientGuild?.id);
  });

  const speechOptions: Array<{ skip: boolean; options: SpeechOptions }> = [
    {
      skip: false,
      options: { speechRecognition: resolveSpeechWithGoogleSpeechV2 },
    },
    {
      skip: !hasWitaiConfig,
      options: {
        speechRecognition: resolveSpeechWithWitai,
        key: config.WITAI_KEY,
      },
    },
  ];
  speechOptions.forEach(({ skip, options }) => {
    describe.skipIf(skip)(
      `Events with ${options.speechRecognition?.name || "default"}`,
      () => {
        const messages: VoiceMessage[] = [];

        beforeAll(async () => {
          await tm.resetClients();
          await tm.loginClients();

          addSpeechEvent(tm.client, {
            group: "client",
            ignoreBots: false,
            ...options,
          });
          tm.client.on(SpeechEvents.speech, (message) => {
            messages.push(message);
          });

          return tm.setTestVoiceChannel(config.GUILD_ID);
        }, 16000);

        afterEach(async () => {
          messages.length = 0;
          await tm.leaveVoiceChannels(config.GUILD_ID);
        });

        it("Voice join event", async () => {
          const voiceJoin = once(tm.client, SpeechEvents.voiceJoin);
          const voiceConnection = await tm.connectToVoiceChannel("client");
          const [connection] = (await voiceJoin) as [VoiceConnection];

          expect(connection).toBe(voiceConnection);
        });

        it("Speech recognition", { timeout: 30000 }, async () => {
          const testConnection = await tm.connectToVoiceChannel("testClient");
          await tm.connectToVoiceChannel("client");

          const speech = once(tm.client, SpeechEvents.speech);
          await tm.playAudio(testConnection, sampleData.normal.path);
          const [message] = (await speech) as [VoiceMessage];

          expect(message.error).toBeUndefined();
          expect(message.content?.toLowerCase()).toContain(
            sampleData.normal.text,
          );
          expect(message.author.id).toBe(tm.testClient.user?.id);
          expect(message.channel.id).toBe(tm.clientVoiceChannel?.id);
          expect(message.member?.id).toBe(tm.testClient.user?.id);
          expect(message.duration).toBeGreaterThan(expectedDuration.min);
          expect(message.duration).toBeLessThan(expectedDuration.max);

          // Audio is mono, so saved file has the same duration as the message
          const wavFile = message.toWav();
          const channels = wavFile.readUInt16LE(22);
          const byteRate = wavFile.readUInt32LE(28);
          expect(channels).toBe(1);
          expect((wavFile.length - 44) / byteRate).toBeCloseTo(
            message.duration,
            5,
          );

          // Saved audio is still understandable for speech recognition
          const contentFromAudio = await resolveSpeechWithGoogleSpeechV2(
            message.audioBuffer,
          );
          expect(contentFromAudio.toLowerCase()).toContain(
            sampleData.normal.text,
          );

          // The same speech isn't emitted twice
          await sleep(2000);
          expect(messages).toHaveLength(1);
        });

        it("Recognizes speech multiple times", { timeout: 40000 }, async () => {
          const testConnection = await tm.connectToVoiceChannel("testClient");
          await tm.connectToVoiceChannel("client");

          for (let attempt = 1; attempt <= 3; attempt += 1) {
            const speech = once(tm.client, SpeechEvents.speech);
            await tm.playAudio(testConnection, sampleData.normal.path);
            await speech;
            await sleep(1000);
            expect(messages).toHaveLength(attempt);
          }

          messages.forEach((message) => {
            expect(message.content?.toLowerCase()).toContain(
              sampleData.normal.text,
            );
          });
        });

        it(
          "Works after rejoining the channel",
          { timeout: 40000 },
          async () => {
            const testConnection = await tm.connectToVoiceChannel("testClient");
            const firstConnection = await tm.connectToVoiceChannel("client");
            firstConnection.destroy();
            await sleep(1000);
            await tm.connectToVoiceChannel("client");

            const speech = once(tm.client, SpeechEvents.speech);
            await tm.playAudio(testConnection, sampleData.normal.path);
            const [message] = (await speech) as [VoiceMessage];

            expect(message.content?.toLowerCase()).toContain(
              sampleData.normal.text,
            );
            await sleep(2000);
            expect(messages).toHaveLength(1);
          },
        );
      },
    );
  });

  describe("Voice connection", () => {
    beforeAll(async () => {
      await tm.resetClients();
      await tm.loginClients();
      addSpeechEvent(tm.client, { group: "client", ignoreBots: false });
      return tm.setTestVoiceChannel(config.GUILD_ID);
    }, 16000);

    afterEach(async () => {
      await tm.leaveVoiceChannels(config.GUILD_ID);
    });

    it("Stays disconnected after disconnect()", async () => {
      const connection = await tm.connectToVoiceChannel("client");
      await sleep(1000);

      connection.disconnect();
      await sleep(4000);

      expect(connection.state.status).toBe(VoiceConnectionStatus.Disconnected);
      expect(connection.rejoinAttempts).toBe(0);
    });
  });
});
