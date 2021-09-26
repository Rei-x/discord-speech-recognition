import { Writable } from "stream";
import fs from "fs";
import wav from "wav";
import axios from "axios";

const createWritable = (buffs: Uint8Array[]): Writable =>
  new Writable({
    write(chunk, _encoding, callback) {
      buffs.push(chunk);
      callback();
    },
  });

const writeAudioDataToWavStream = (
  stream: fs.ReadStream,
  streamReader: Writable
): void => {
  const reader = new wav.Reader();
  reader.on("format", () => {
    reader.pipe(streamReader);
  });
  stream.pipe(reader);
};

export const readFileToAudioBuffer = async (filename: fs.PathLike): Promise<Buffer> => {
  const file = fs.createReadStream(filename);

  const buffs: Uint8Array[] = [];
  const pcmDataStream = createWritable(buffs);

  writeAudioDataToWavStream(file, pcmDataStream);

  return new Promise<Buffer>((resolve) => {
    pcmDataStream.on("finish", () => {
      const audioBuffer = Buffer.concat(buffs);
      resolve(audioBuffer);
    });
  });
};

export async function wavUrlToBuffer(url: string): Promise<Buffer> {
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  const buffs: Uint8Array[] = [];
  const pcmDataStream = new Writable({
    write(chunk, _encoding, callback) {
      buffs.push(chunk);
      callback();
    },
    emitClose: true,
  });

  const reader = new wav.Reader();
  reader.on("format", () => {
    reader.pipe(pcmDataStream);
  });
  response.data.pipe(reader);

  return new Promise((resolve) => {
    pcmDataStream.on("finish", () => {
      const audioBuffer = Buffer.concat(buffs);
      resolve(audioBuffer);
    });
  });
}