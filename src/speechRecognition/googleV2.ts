/**
 * You can obtain API key here [http://www.chromium.org/developers/how-tos/api-keys](http://www.chromium.org/developers/how-tos/api-keys)
 */
export interface GoogleSpeechV2Options {
  key?: string;
  lang?: string;
  profanityFilter?: boolean;
}

/**
 * Performs speech recognition using the Google Speech Recognition API V2
 * @param audioBuffer PCM mono audio with 48kHz
 * @param options
 * @returns Recognized text from speech
 */
export async function resolveSpeechWithGoogleSpeechV2(
  audioBuffer: Buffer,
  options: GoogleSpeechV2Options = {},
): Promise<string> {
  const key = options.key ?? "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw";
  const lang = options.lang ?? "en-US";
  const profanityFilter =
    options.profanityFilter === undefined
      ? "1"
      : options.profanityFilter
        ? "1"
        : "0";

  const url = `https://www.google.com/speech-api/v2/recognize?output=json&lang=${lang}&key=${key}&pFilter=${profanityFilter}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "audio/l16; rate=48000;",
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    throw new Error(
      `Google speech api error: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  const fixedData = text.replace('{"result":[]}', "");

  let data;
  try {
    data = JSON.parse(fixedData);
  } catch {
    throw new Error(`Google speech api error: failed to parse response`);
  }

  return data.result[0].alternative[0].transcript;
}
