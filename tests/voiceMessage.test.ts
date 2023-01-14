/* eslint-disable no-invalid-this */
import { expect } from "chai";
import fs from "fs";
import { VoiceMessage } from "../src";
import { getDurationFromMonoBuffer } from "../src/utils/audio";
import sampleData from "./sampleData";
import wav from "wav";
import { readFileToAudioBuffer, wavUrlToBuffer } from "./utils";

describe("Voice message", () => {
  const mockData = undefined as never;

  const filename = "./test.wav";

  let audioBuffer: Buffer;
  let voiceMessage: VoiceMessage;

  before(async function before() {
    this.timeout(6000);

    audioBuffer = await wavUrlToBuffer(sampleData.normal.url);
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
  });

  it("Save to .wav file", async function saveToWav() {
    this.timeout(4000);

    voiceMessage.saveToFile(filename);
    expect(fs.existsSync(filename));
    const audioBufferFromFile = await readFileToAudioBuffer(filename);
    expect(audioBuffer.toString()).to.be.equal(audioBufferFromFile.toString());
    fs.unlinkSync(filename);
  });

  it("Duration", () => {
    expect(voiceMessage.duration.toPrecision(3)).to.be.equal("2.09");
  });

  it("Get base64 audio", async () => {
    const base64Audio = voiceMessage.getWavEncodedToBase64Audio();

    const decodedWavAudio = Buffer.from(base64Audio, "base64");

    const reader = new wav.Reader();

    const checkFormat = new Promise<void>((resolve) => {
      reader.on("format", (format) => {
        expect(format.sampleRate).to.be.equal(48000);
        expect(format.channels).to.be.equal(1);
        resolve();
      });
    });
    reader.write(decodedWavAudio);

    await checkFormat;

    const pcmAudio = reader.read(reader.readableLength);

    const duration = getDurationFromMonoBuffer(pcmAudio);
    expect(voiceMessage.duration).to.be.equal(duration);

    expect(pcmAudio.toString()).to.be.equal(audioBuffer.toString());
  });
});
