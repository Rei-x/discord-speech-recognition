/* eslint-disable no-invalid-this */
import chai from "chai";
import chaiAsPRomised from "chai-as-promised";
import { resolveSpeechWithGoogleSpeechV2 } from "../src/index";
import { wavUrlToBuffer } from "./utils";

chai.use(chaiAsPRomised);
const { expect } = chai;

const speechRecognitionSamples = [
  [
    "https://cdn.discordapp.com/attachments/838767598778843149/841360475631779861/Hello_my_name_is_John.wav",
    "my name is",
  ],
  [
    "https://cdn.discordapp.com/attachments/838767598778843149/891340727878029342/What_the_fuck_are_you_doing_right_now.wav",
    "what the fuck are you doing right now",
  ],
];

describe("Google Speech V2 test", () => {
  it("Speech recognition", async function speechRecognition() {
    this.timeout(16000);
    const [url, text] = speechRecognitionSamples[0];
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer);
    expect(response.toLowerCase()).to.contain(text);
  });

  it("Censor bad words", async function () {
    this.timeout(16000);
    const [url, text] = speechRecognitionSamples[1];
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: true,
    });
    const censoredText = text.replace("fuck", "f***");
    expect(response.toLowerCase()).to.equal(censoredText);
  });

  it("Disabling profanity filter ", async function () {
    this.timeout(16000);
    const [url, text] = speechRecognitionSamples[1];
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      profanityFilter: false,
    });
    expect(response.toLowerCase()).to.equal(text);
  });

  it("Bad request data throws error", () => {
    const badAudioBuffer = Buffer.from("test");
    return expect(resolveSpeechWithGoogleSpeechV2(badAudioBuffer)).to.be
      .rejected;
  });
});
