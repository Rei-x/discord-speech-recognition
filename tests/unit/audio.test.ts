import { describe, expect, it } from "vitest";
import wav from "wav";
import {
  convertStereoToMono,
  encodeWav,
  getDurationFromMonoBuffer,
} from "../../src/utils/audio";

const stereo = (frames: Array<[number, number]>): Buffer => {
  const buffer = Buffer.alloc(frames.length * 4);
  frames.forEach(([left, right], index) => {
    buffer.writeInt16LE(left, index * 4);
    buffer.writeInt16LE(right, index * 4 + 2);
  });
  return buffer;
};

const samples = (buffer: Buffer): number[] =>
  Array.from({ length: buffer.length / 2 }, (_, index) =>
    buffer.readInt16LE(index * 2),
  );

describe("convertStereoToMono", () => {
  it("averages both channels", () => {
    const mono = convertStereoToMono(
      stereo([
        [100, 300],
        [-200, -400],
        [1000, 0],
        [32767, 32767],
        [-32768, -32768],
      ]),
    );

    expect(samples(mono)).toEqual([200, -300, 500, 32767, -32768]);
  });

  it("returns half of the bytes", () => {
    expect(convertStereoToMono(Buffer.alloc(3840)).length).toBe(1920);
  });

  it("ignores incomplete trailing frame", () => {
    expect(convertStereoToMono(Buffer.alloc(10)).length).toBe(4);
    expect(convertStereoToMono(Buffer.alloc(0)).length).toBe(0);
  });
});

describe("getDurationFromMonoBuffer", () => {
  it("returns duration in seconds", () => {
    expect(getDurationFromMonoBuffer(Buffer.alloc(48000 * 2))).toBe(1);
    expect(getDurationFromMonoBuffer(Buffer.alloc(48000 * 2 * 2.5))).toBe(2.5);
  });
});

describe("encodeWav", () => {
  it("creates wav file that can be read back", async () => {
    const pcm = Buffer.from(Int16Array.from([1, -2, 3, -4, 5]).buffer);
    const wavFile = encodeWav(pcm, { sampleRate: 48000, channels: 1 });

    expect(wavFile.length).toBe(44 + pcm.length);

    const reader = new wav.Reader();
    const format = new Promise<wav.Format>((resolve) => {
      reader.once("format", resolve);
    });
    reader.end(wavFile);

    expect(await format).toMatchObject({
      audioFormat: 1,
      channels: 1,
      sampleRate: 48000,
      byteRate: 96000,
      blockAlign: 2,
      bitDepth: 16,
    });
    expect((reader.read() as Buffer).equals(pcm)).toBe(true);
  });
});
