/* eslint-disable no-invalid-this */
import chai from "chai";
import chaiAsPRosmied from "chai-as-promised";
import { resolveSpeechWithWitai } from "../src/index";
import config from "./config";
import sampleData from "./sampleData";
import { wavUrlToBuffer } from "./utils";

chai.use(chaiAsPRosmied);
const { expect } = chai;

describe("wit.ai test", function witAiTest() {
  this.timeout(16000);

  it("Speech recognition", async () => {
    const audioBuffer = await wavUrlToBuffer(sampleData.normal.url);
    const response = await resolveSpeechWithWitai(audioBuffer, {
      key: config.WITAI_KEY,
    });
    expect(response.toLowerCase()).to.contain(sampleData.normal.text);
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
    const audioBuffer = await wavUrlToBuffer(sampleData.normal.url);
    return expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "",
      })
    ).to.be.rejectedWith("wit.ai API key wasn't specified.");
  });

  it("Bad token throws error", async () => {
    const audioBuffer = await wavUrlToBuffer(sampleData.normal.url);
    return expect(
      resolveSpeechWithWitai(audioBuffer, {
        key: "d",
      })
    ).to.be.rejectedWith("Api error, code: 400");
  });
});
