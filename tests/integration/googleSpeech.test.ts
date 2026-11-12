import { expect, describe, it } from "vitest";
import { resolveSpeechWithGoogleSpeechV2 } from "../../src";
import sampleData from "../sampleData";
import { readFileToAudioBuffer } from "../utils";

describe("Google Speech V2 test", () => {
  it("Speech recognition", { timeout: 16000 }, async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer);
    expect(response.toLowerCase()).toContain(sampleData.normal.text);
  });

  it("Censor bad words", { timeout: 16000 }, async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.vulgarism.path);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: true,
    });
    const censoredText = sampleData.vulgarism.text.replace("fuck", "f***");
    expect(response.toLowerCase()).toContain(censoredText);
  });

  it("Disabling profanity filter", { timeout: 16000 }, async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.vulgarism.path);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: false,
    });
    expect(response.toLowerCase()).toContain(sampleData.vulgarism.text);
  });

  it("Returns empty string when there is no speech", async () => {
    const silence = Buffer.alloc(48000 * 2);
    await expect(resolveSpeechWithGoogleSpeechV2(silence)).resolves.toBe("");
  });

  it("Other languages", { timeout: 16000 }, async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      lang: "en-GB",
    });
    expect(response.toLowerCase()).toContain(sampleData.normal.text);
  });

  it("Invalid key throws error", async () => {
    const audioBuffer = await readFileToAudioBuffer(sampleData.normal.path);
    await expect(
      resolveSpeechWithGoogleSpeechV2(audioBuffer, { key: "invalid" }),
    ).rejects.toThrow("Google speech api error: 403");
  });
});
