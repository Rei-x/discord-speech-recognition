import axios, {AxiosRequestConfig} from 'axios';

/**
 * You can obtain API key here [http://www.chromium.org/developers/how-tos/api-keys](http://www.chromium.org/developers/how-tos/api-keys)
 */
export interface GoogleSpeechV2Options {
  key?: string;
  lang: string;
}

/**
 * Performs speech recognition using the Google Speech Recognition API V2
 * @param audioBuffer PCM mono audio with 48k bitrate
 * @param options
 * @returns Recognized text from speech
 */
export async function resolveSpeechWithGoogleSpeechV2(audioBuffer: Buffer, options: GoogleSpeechV2Options = {lang: 'en-US'}): Promise<string> {
  const requestOptions = getGoogleRequestOptions(options);
  requestOptions.data = audioBuffer;
  const response = await axios(requestOptions);
  if (response.data.error) throw new Error('Google speech api error: ' + response.data);
  return response.data.result[0].alternative[0].transcript;
}

/**
 * If API key is not specified uses generic key that works out of the box.
 * If language is not specified uses ``"en-US"``
 * @param options
 * @returns Request config for {@link resolveSpeechWithGoogleSpeechV2}
 */
function getGoogleRequestOptions(options?: GoogleSpeechV2Options): AxiosRequestConfig {
  let key = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';
  let lang = 'en-US';

  if (options) {
    if (options.key) key = options.key;
    if (options.lang) lang = options.lang;
  }

  const googleRequestOptions: AxiosRequestConfig = {
    url: `https://www.google.com/speech-api/v2/recognize?output=json&lang=${lang}&key=${key}`,
    headers: {
      'Content-Type': 'audio/l16; rate=48000;',
    },
    method: 'POST',
    transformResponse: [(data) => {
      data = data.replace('{"result":[]}', '');
      try {
        return JSON.parse(data);
      } catch (e) {
        return {error: e};
      }
    }],
  };
  return googleRequestOptions;
}
