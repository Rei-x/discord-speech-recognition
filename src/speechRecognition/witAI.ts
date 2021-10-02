import fetch from "node-fetch";

export interface WitaiOptions {
  key?: string;
}

interface WitaiGoodResponse {
  text: string;
}
interface WitaiBadResponse {
  _text: string;
}

type WitaiResponse = WitaiGoodResponse | WitaiBadResponse;

async function extractSpeechIntent(
  key: string,
  audioBuffer: Buffer,
  contenttype: string
): Promise<WitaiResponse> {
  const response = await fetch("https://api.wit.ai/speech", {
    method: "post",
    body: audioBuffer,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-type": contenttype,
    },
  });
  if (response.status !== 200)
    throw new Error(`Api error, code: ${response.status}`);

  const data = response.json() as Promise<WitaiResponse>;
  return data;
}

export async function resolveSpeechWithWITAI(
  audioBuffer: Buffer,
  options?: WitaiOptions
): Promise<string> {
  const key = options?.key;
  if (!key) throw new Error("wit.ai API key wasn't specified.");

  const contenttype =
    "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little";
  const output = await extractSpeechIntent(key, audioBuffer, contenttype);

  if ("_text" in output) throw new Error("Wrong request data");
  if ("text" in output) return output.text;
  throw new Error("Something went very wrong");
}
