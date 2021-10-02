/* eslint-disable no-invalid-this */
import chaiAsPRomised from "chai-as-promised";
import chai from "chai";
import { resolveSpeechWithGoogleSpeechV2 } from "../src/index";
import { wavUrlToBuffer } from "./utils";

chai.use(chaiAsPRomised);
const { expect } = chai;

const speechRecognitionSamples = [
  [
    "https://cdn.discordapp.com/attachments/838767598778843149/841360475631779861/Hello_my_name_is_John.wav",
    "my name is",
  ],
];

describe("Google Speech V2 test", () => {
  const [url, text] = speechRecognitionSamples[0];
  it("Speech recognition", async function speechRecognition() {
    this.timeout(16000);
    const [url, text] = speechRecognitionSamples[0];
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer);
    expect(response.toLowerCase()).to.contain(text);
  });
  it("Bad request data throws error", () => {
    const badAudioBuffer = Buffer.from("test");
    return expect(resolveSpeechWithGoogleSpeechV2(badAudioBuffer)).to.be
      .rejected;
  });
});
