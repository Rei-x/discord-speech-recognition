/**
 * You can obtain API key here [http://www.chromium.org/developers/how-tos/api-keys](http://www.chromium.org/developers/how-tos/api-keys)
 */
export interface GoogleSpeechV2Options {
  key?: string;
  /**
   * Language of the speech, for example `en-US` or `pl-PL`. Defaults to `en-US`
   */
  lang?: string;
  /**
   * Replaces vulgar words with asterisks. Defaults to true
   */
  profanityFilter?: boolean;
}

interface GoogleSpeechV2Response {
  result?: Array<{
    alternative?: Array<{ transcript?: string }>;
  }>;
}

/**
 * The API responds with one JSON object per line and the first one is usually
 * an empty `{"result":[]}`.
 */
const getTranscript = (text: string): string => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    let data: GoogleSpeechV2Response;
    try {
      data = JSON.parse(line);
    } catch {
      throw new Error("Google speech api error: failed to parse response");
    }

    const transcript = data.result?.[0]?.alternative?.[0]?.transcript;
    if (transcript) return transcript;
  }

  return "";
};

/**
 * Performs speech recognition using the Google Speech Recognition API V2
 * @param audioBuffer PCM mono audio with 48kHz
 * @param options
 * @returns Recognized text from speech, empty string if nothing was recognized
 */
export async function resolveSpeechWithGoogleSpeechV2(
  audioBuffer: Buffer,
  options: GoogleSpeechV2Options = {},
): Promise<string> {
  const params = new URLSearchParams({
    output: "json",
    lang: options.lang ?? "en-US",
    key: options.key ?? "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw",
    pFilter: (options.profanityFilter ?? true) ? "1" : "0",
  });

  const response = await fetch(
    `https://www.google.com/speech-api/v2/recognize?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "audio/l16; rate=48000;",
      },
      body: new Uint8Array(audioBuffer),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google speech api error: ${response.status} ${response.statusText}`,
    );
  }

  return getTranscript(await response.text());
}
