import axios from 'axios';
import {Writable} from 'stream';
import wav from 'wav';
/**
 * Convert stereo audio buffer to mono
 * @param input Buffer of stereo audio
 * @returns
 */
export function convertStereoToMono(input: Buffer): Buffer {
  const stereoData = new Int16Array(input);
  const monoData = new Int16Array(stereoData.length / 2);
  for (let i = 0, j = 0; i < stereoData.length; i += 4) {
    monoData[j++] = stereoData[i];
    monoData[j++] = stereoData[i + 1];
  }
  return Buffer.from(monoData);
}

export async function wavUrlToBuffer(url: string): Promise<Buffer> {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const buffs: Uint8Array[] = [];
  const pcmDataStream = new Writable({
    write(chunk, _encoding, callback) {
      buffs.push(chunk);
      callback();
    },
  });

  const reader = new wav.Reader();
  reader.on('format', () => {
    reader.pipe(pcmDataStream);
  });
  response.data.pipe(reader);

  return new Promise((resolve) => {
    pcmDataStream.on('close', () => {
      const audioBuffer = Buffer.concat(buffs);
      resolve(audioBuffer);
    });
  });
}

export function getDurationFromMonoBuffer(buffer: Buffer): number {
  const duration = buffer.length / 48000 / 2;
  return duration;
}
