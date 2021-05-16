/* eslint-disable no-invalid-this */
import {expect} from 'chai';
import {getDurationFromMonoBuffer, VoiceMessage, wavUrlToBuffer} from '../src';
import {data} from './sampleData.json';
import fs from 'fs';
import wav from 'wav';
import {Writable} from 'stream';

describe('Voice message', function() {
  let filename: string; let audioBuffer: Buffer; let voiceMessage: VoiceMessage;
  before(async function() {
    this.timeout(6000);
    filename = './test.wav';
    audioBuffer = await wavUrlToBuffer(data[0].url);
    voiceMessage = new VoiceMessage(undefined, {
      audioBuffer,
      author: undefined,
      duration: undefined,
    }, undefined);
  });
  it('Save to .wav file', async function() {
    voiceMessage.saveToFile(filename);
    expect(fs.existsSync(filename));
    const readAudioBuffer = await readFileToAudioBuffer(filename);
    expect(audioBuffer.toString()).to.be.equal(readAudioBuffer.toString());
  });
  it('Duration', function() {
    const duration = getDurationFromMonoBuffer(voiceMessage.audioBuffer);
    expect(duration.toPrecision(3)).to.be.equal('2.09');
  });
  after(function() {
    fs.unlinkSync(filename);
  });
});

async function readFileToAudioBuffer(filename: fs.PathLike): Promise<Buffer> {
  const file = fs.createReadStream(filename);

  const buffs: Uint8Array[] = [];
  const pcmDataStream = createWritable();

  writeAudioDataToFile();

  return new Promise<Buffer>((resolve) => {
    pcmDataStream.on('close', () => {
      const audioBuffer = Buffer.concat(buffs);
      resolve(audioBuffer);
    });
  },
  );

  function createWritable() {
    return new Writable({
      write(chunk, _encoding, callback) {
        buffs.push(chunk);
        callback();
      },
    });
  }

  function writeAudioDataToFile() {
    const reader = new wav.Reader();
    reader.on('format', () => {
      reader.pipe(pcmDataStream);
    });
    file.pipe(reader);
  }
}

