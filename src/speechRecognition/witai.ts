export interface WitaiOptions {
  /**
   * Server access token of your wit.ai app
   */
  key?: string;
}

interface WitaiSpeechResponse {
  text?: string;
}

/**
 * wit.ai streams the response from /speech endpoint as multiple JSON objects one after another, which isn't a valid JSON. You can check the docs here: https://wit.ai/docs/http/20240304/#post__speech_link
 * This function splits the response text into separate objects and parses each of them.
 * @param text
 * @returns
 */
const parseWitaiResponse = (text: string): Array<WitaiSpeechResponse> => {
  const chunks: Array<WitaiSpeechResponse> = [];
  let depth = 0;
  let start = -1;
  let inString = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (char === "\\") i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        chunks.push(JSON.parse(text.slice(start, i + 1)));
        start = -1;
      }
    }
  }

  return chunks;
};

/**
 * Performs speech recognition using the wit.ai API, voice messages can be up to 20 seconds long
 * @param audioBuffer PCM mono audio with 48kHz
 * @param options
 * @returns Recognized text from speech
 */
export async function resolveSpeechWithWitai(
  audioBuffer: Buffer,
  options?: WitaiOptions,
): Promise<string> {
  const key = options?.key;
  if (!key) throw new Error("wit.ai API key wasn't specified.");

  const response = await fetch("https://api.wit.ai/speech", {
    method: "POST",
    body: new Uint8Array(audioBuffer),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type":
        "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little",
    },
  });
  if (response.status !== 200)
    throw new Error(`Api error, code: ${response.status}`);

  let chunks: Array<WitaiSpeechResponse>;
  try {
    chunks = parseWitaiResponse(await response.text());
  } catch {
    throw new Error("Invalid API response");
  }

  const latestMessage = chunks.at(-1);
  if (!latestMessage) throw new Error("Invalid API response");

  return latestMessage.text ?? "";
}
