import fetch from 'node-fetch';

export interface WITAIOptions {
  key: string
}

interface witaiGoodResponse {
  text: string
}
interface witaiBadResponse {
  _text: string
}

type witaiResponse = witaiGoodResponse | witaiBadResponse;

export async function resolveSpeechWithWITAI(audioBuffer: Buffer, options: WITAIOptions): Promise<string> {
  const key = options.key;
  if (!key) throw new Error('wit.ai API key wasn\'t specified.');

  const contenttype = 'audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little';
  const output = await extractSpeechIntent(key, audioBuffer, contenttype);

  if ('_text' in output) throw new Error('Wrong request data');
  if ('text' in output) return output.text;
  throw new Error('Something went very wrong');
}
async function extractSpeechIntent(key: string, audioBuffer: Buffer, contenttype: string): Promise<witaiResponse> {
  const response = await fetch('https://api.wit.ai/speech', {
    method: 'post',
    body: audioBuffer,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-type': contenttype,
    },
  });
  if (response.status != 200) throw new Error(`Api error, code: ${response.status}`);

  const data = response.json();
  return data;
}

