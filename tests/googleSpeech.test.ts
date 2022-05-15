/* eslint-disable no-invalid-this */
import chai, { expect } from "chai";
import chaiAsPRomised from "chai-as-promised";
import { resolveSpeechWithGoogleSpeechV2 } from "../src/index";
import sampleData from "./sampleData";
import { wavUrlToBuffer } from "./utils";

chai.use(chaiAsPRomised);

describe("Google Speech V2 test", () => {
  it("Speech recognition", async function speechRecognition() {
    this.timeout(16000);

    const audioBuffer = await wavUrlToBuffer(sampleData.normal.url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer);
    expect(response.toLowerCase()).to.contain(sampleData.normal.text);
  });

  it("Censor bad words", async function () {
    this.timeout(16000);

    const audioBuffer = await wavUrlToBuffer(sampleData.vulgarism.url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: true,
    });
    const censoredText = sampleData.vulgarism.text.replace("fuck", "f***");
    expect(response.toLowerCase()).to.contain(censoredText);
  });

  it("Disabling profanity filter ", async function () {
    this.timeout(16000);

    const audioBuffer = await wavUrlToBuffer(sampleData.vulgarism.url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: false,
    });
    expect(response.toLowerCase()).to.contain(sampleData.vulgarism.text);
  });

  it("Bad request data throws error", () => {
    const badAudioBuffer = Buffer.from("test");
    return expect(resolveSpeechWithGoogleSpeechV2(badAudioBuffer)).to.be
      .rejected;
  });
});
