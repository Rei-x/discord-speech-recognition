import { expect, describe, it } from "vitest";
import { resolveSpeechWithWitai } from "../src/index";
import config from "./config";
import sampleData from "./sampleData";
import { readFileToAudioBuffer } from "./utils";

describe("wit.ai test", { timeout: 16000 }, () => {
  it("Speech recognition", async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    const response = await resolveSpeechWithWitai(audioBuffer, {
      key: config.WITAI_KEY,
    });
    expect(response.toLowerCase()).toContain(sampleData.normal.text);
  });

  it("Empty request body throws error", async () => {
    const emptyBuffer = Buffer.from("");
    await expect(
      resolveSpeechWithWitai(emptyBuffer, {
        key: config.WITAI_KEY,
      }),
    ).rejects.toThrow("Api error, code: 400");
  });

  it("Empty token throws error", async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    await expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "",
      }),
    ).rejects.toThrow("wit.ai API key wasn't specified.");
  });

  it("Bad token throws error", async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    await expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "d",
      }),
    ).rejects.toThrow("Api error, code: 400");
  });
});
