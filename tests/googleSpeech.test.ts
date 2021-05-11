import {resolveSpeechWithGoogleSpeechV2, wavUrlToBuffer} from '../src/index';
import chaiAsPRomised from 'chai-as-promised';
import chai from 'chai';
chai.use(chaiAsPRomised);
const expect = chai.expect;


const speechRecognitionSamples = [['https://cdn.discordapp.com/attachments/838767598778843149/841360475631779861/Hello_my_name_is_John.wav', 'my name is john']];

describe('Google Speech V2 test', function() {
  const [url, text] = speechRecognitionSamples[0];
  it('Speech recognition', async function() {
    const audioBuffer = await wavUrlToBuffer(url);
    const response = await resolveSpeechWithGoogleSpeechV2(audioBuffer);
    expect(response.toLowerCase()).to.equal(text);
  });
  it('Bad request data throws error', function() {
    const badAudioBuffer = Buffer.from('test');
    return expect(resolveSpeechWithGoogleSpeechV2(badAudioBuffer)).to.be.rejected;
  });
});
