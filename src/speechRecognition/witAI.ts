import witClient from 'node-witai-speech';
import {Readable} from 'stream';
import util from 'util';


export interface WITAIOptions {
  key: string
}

export async function resolveSpeechWithWITAI(audioBuffer: Buffer, options: WITAIOptions): Promise<string> {
  const key = options.key;
  if (!key) throw new Error('WitAI API key wasn\'t specified.');

  const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
  const stream = Readable.from(audioBuffer);
  const contenttype = 'audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little';
  const output = await extractSpeechIntent(key, stream, contenttype);
  stream.destroy();
  if (output && 'text' in output || '_text' in output && output.text.length) {
    return output.text;
  }
  return output;
}
