import { expect, beforeAll, describe, it } from "vitest";
import fs from "fs";
import { VoiceMessage } from "../src";
import { getDurationFromMonoBuffer } from "../src/utils/audio";
import sampleData from "./sampleData";
import wav from "wav";
import { readFileToAudioBuffer } from "./utils";

describe("Voice message", () => {
  const mockData = undefined as never;

  const filename = "./test.wav";

  let audioBuffer: Buffer;
  let voiceMessage: VoiceMessage;

  beforeAll(async () => {
    audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    voiceMessage = new VoiceMessage({
      client: mockData,
      data: {
        audioBuffer,
        author: mockData,
        duration: getDurationFromMonoBuffer(audioBuffer),
        connection: mockData,
      },
      channel: mockData,
    });
  }, 6000);

  it("Save to .wav file", { timeout: 4000 }, async () => {
    voiceMessage.saveToFile(filename);
    expect(fs.existsSync(filename));
    const audioBufferFromFile = await readFileToAudioBuffer(filename);
    expect(audioBuffer.toString()).toBe(audioBufferFromFile.toString());
    fs.unlinkSync(filename);
  });

  it("Duration", () => {
    expect(voiceMessage.duration.toPrecision(3)).toBe("2.21");
  });

  it("Get base64 audio", async () => {
    const base64Audio = voiceMessage.getWavEncodedToBase64Audio();

    const decodedWavAudio = Buffer.from(base64Audio, "base64");

    const reader = new wav.Reader();

    const checkFormat = new Promise<void>((resolve) => {
      reader.on("format", (format) => {
        expect(format.sampleRate).toBe(48000);
        expect(format.channels).toBe(1);
        resolve();
      });
    });
    reader.write(decodedWavAudio);

    await checkFormat;

    const pcmAudio = reader.read(reader.readableLength);

    const duration = getDurationFromMonoBuffer(pcmAudio);
    expect(voiceMessage.duration).toBe(duration);

    expect(pcmAudio.toString()).toBe(audioBuffer.toString());
  });
});
