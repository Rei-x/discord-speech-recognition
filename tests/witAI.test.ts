/* eslint-disable no-invalid-this */
import chai from 'chai';
import chaiAsPRosmied from 'chai-as-promised';
import {resolveSpeechWithWITAI, wavUrlToBuffer} from '../src/index';
import {WITAI_KEY} from './config.json';

chai.use(chaiAsPRosmied);
const expect = chai.expect;
const speechRecognitionSamples = [['https://cdn.discordapp.com/attachments/838767598778843149/841360475631779861/Hello_my_name_is_John.wav', 'hello my name is john']];

describe('witAI test', function() {
  this.timeout(4000);
  const [url, text] = speechRecognitionSamples[0];
  it('Speech recognition', async function() {
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithWITAI(audioBuffer, {
      key: WITAI_KEY,
    });
    expect(response.toLowerCase()).to.equal(text);
  });
  it('Bad request data throws error', function() {
    const badAudioBuffer = Buffer.from('test');
    return expect(resolveSpeechWithWITAI(badAudioBuffer, {
      key: WITAI_KEY,
    })).to.be.rejected;
  });
});
