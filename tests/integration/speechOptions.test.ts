import { expect, vi, beforeEach, afterEach, describe, it } from "vitest";
import { User } from "discord.js";
import { once } from "events";
import { setTimeout as sleep } from "timers/promises";
import { addSpeechEvent, SpeechEvents, VoiceMessage } from "../../src";
import config, { hasDiscordConfig } from "../config";
import sampleData from "../sampleData";
import { readFileToAudioBuffer, TestManager } from "../utils";
import { encodeWav } from "../../src/utils/audio";
import fs from "fs";
import os from "os";
import path from "path";

describe.skipIf(!hasDiscordConfig)("Speech options", () => {
  let tm: TestManager;

  beforeEach(async () => {
    tm = new TestManager(config.BOT_TOKEN, config.TESTBOT_TOKEN);
    await tm.loginClients();
    await tm.setTestVoiceChannel(config.GUILD_ID);
  }, 20000);

  afterEach(async () => {
    await tm.leaveVoiceChannels(config.GUILD_ID);
    await tm.destroyClients();
  });

  it("Ignore bots", { timeout: 30000 }, async () => {
    addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: true,
    });
    const messages: VoiceMessage[] = [];
    tm.client.on(SpeechEvents.speech, (message) => {
      messages.push(message);
    });

    const connection = await tm.connectToVoiceChannel("testClient");
    await tm.connectToVoiceChannel("client");

    await tm.playAudio(connection, sampleData.normal.path);
    await sleep(3000);

    expect(messages).toHaveLength(0);
  });

  it("shouldProcessSpeech option", { timeout: 30000 }, async () => {
    const shouldProcessSpeech = vi.fn((_user: User) => true);

    const speechOptions = addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: false,
    });

    // Options can be changed after adding the event
    speechOptions.shouldProcessSpeech = shouldProcessSpeech;

    const connection = await tm.connectToVoiceChannel("testClient");
    await tm.connectToVoiceChannel("client");

    const speech = once(tm.client, SpeechEvents.speech);
    await tm.playAudio(connection, sampleData.normal.path);
    await speech;

    expect(shouldProcessSpeech).toHaveBeenCalled();
    expect(shouldProcessSpeech.mock.calls[0][0].id).toBe(
      tm.testClient.user?.id,
    );
  });

  it("Custom speech recognition function", { timeout: 30000 }, async () => {
    const speechRecognition = vi.fn(
      async (_audioBuffer: Buffer, options?: { prefix: string }) =>
        `${options?.prefix} custom`,
    );
    addSpeechEvent(tm.client, {
      group: "client",
      ignoreBots: false,
      speechRecognition,
      prefix: "very",
    });

    const connection = await tm.connectToVoiceChannel("testClient");
    await tm.connectToVoiceChannel("client");

    const speech = once(tm.client, SpeechEvents.speech);
    await tm.playAudio(connection, sampleData.normal.path);
    const [message] = (await speech) as [VoiceMessage];

    expect(message.content).toBe("very custom");
    expect(speechRecognition.mock.calls[0][0]).toBe(message.audioBuffer);
  });

  it(
    "Splits long speech into multiple messages",
    { timeout: 40000 },
    async () => {
      addSpeechEvent(tm.client, {
        group: "client",
        ignoreBots: false,
        maximalVoiceMessageDuration: 4,
        speechRecognition: async () => "long",
      });
      const messages: VoiceMessage[] = [];
      tm.client.on(SpeechEvents.speech, (message) => {
        messages.push(message);
      });

      // The same sentence three times in a row without any pause, around 6.6 seconds
      const sentence = await readFileToAudioBuffer(sampleData.normal.path);
      const longAudioPath = path.join(
        os.tmpdir(),
        `dsr-long-${process.pid}.wav`,
      );
      fs.writeFileSync(
        longAudioPath,
        encodeWav(Buffer.concat([sentence, sentence, sentence]), {
          sampleRate: 48000,
          channels: 1,
        }),
      );

      const connection = await tm.connectToVoiceChannel("testClient");
      await tm.connectToVoiceChannel("client");

      try {
        await tm.playAudio(connection, longAudioPath);
      } finally {
        fs.unlinkSync(longAudioPath);
      }
      await sleep(3000);

      expect(messages).toHaveLength(2);
      expect(messages[0].duration).toBeCloseTo(4, 1);
      expect(messages[1].duration).toBeGreaterThan(2);
      expect(messages[1].duration).toBeLessThan(4);
    },
  );

  it("Doesn't listen when bot is deafened", { timeout: 30000 }, async () => {
    addSpeechEvent(tm.client, { group: "client", ignoreBots: false });
    const messages: VoiceMessage[] = [];
    tm.client.on(SpeechEvents.speech, (message) => {
      messages.push(message);
    });

    const connection = await tm.connectToVoiceChannel("testClient");
    const clientConnection = await tm.connectToVoiceChannel("client");
    clientConnection.rejoin({
      ...clientConnection.joinConfig,
      selfDeaf: true,
    });
    await sleep(2000);

    await tm.playAudio(connection, sampleData.normal.path);
    await sleep(3000);

    expect(messages).toHaveLength(0);
  });
});
