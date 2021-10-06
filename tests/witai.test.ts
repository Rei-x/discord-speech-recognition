/* eslint-disable no-invalid-this */
import chai from "chai";
import chaiAsPRosmied from "chai-as-promised";
import { resolveSpeechWithWitai } from "../src/index";
import config from "./env";
import { wavUrlToBuffer } from "./utils";

chai.use(chaiAsPRosmied);
const { expect } = chai;
const speechRecognitionSamples = [
  [
    "https://cdn.discordapp.com/attachments/838767598778843149/841360475631779861/Hello_my_name_is_John.wav",
    "hello my name is john",
  ],
];

describe("wit.ai test", function witAiTest() {
  this.timeout(16000);
  const [url, text] = speechRecognitionSamples[0];
  it("Speech recognition", async () => {
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithWitai(audioBuffer, {
      key: config.WITAI_KEY,
    });
    expect(response.toLowerCase()).to.equal(text);
  });
  it("Empty request body throws error", () => {
    const emptyBuffer = Buffer.from("");
    return expect(
      resolveSpeechWithWitai(emptyBuffer, {
        key: config.WITAI_KEY,
      })
    ).to.be.rejectedWith("Api error, code: 400");
  });
  it("Empty token throws error", async () => {
    const audioBuffer = await wavUrlToBuffer(url);
    return expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "",
      })
    ).to.be.rejectedWith("wit.ai API key wasn't specified.");
  });
  it("Bad token throws error", async () => {
    const audioBuffer = await wavUrlToBuffer(url);
    return expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "d",
      })
    ).to.be.rejectedWith("Api error, code: 400");
  });
});
