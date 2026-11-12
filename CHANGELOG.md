# Changelog

## 4.0.0

First release since 3.4.1.

### Breaking changes

- Node.js 22.12 or newer is required, the same as `@discordjs/voice` 0.19.
- `@discordjs/voice` 0.19 is required. It supports the encryption that Discord requires for voice channels now (DAVE), older versions can't connect anymore.
- `VoiceMessage.audioBuffer` is mono, as the documentation always said. It used to be stereo, so files saved with `saveToFile` and audio from `getWavEncodedToBase64Audio` were two times slower than the speech.
- Speech longer than 19 seconds is split into multiple voice messages. It used to be dropped without any information.
- When Google Speech doesn't recognize anything, `content` is an empty string and `error` isn't set. It used to set `error` to a parsing error.
- The bot doesn't rejoin the channel on its own when it gets disconnected.

### Added

- ES modules support, the package ships both CommonJS and ESM builds (#59, #63, #71).
- `opusscript` can be used instead of `@discordjs/opus`, which doesn't need native build tools.
- `maximalVoiceMessageDuration` and `silenceDuration` options.
- `shouldProcessSpeech` receives the voice connection as the second parameter, so speech recognition can be turned on and off for each guild.
- Speech recognition function receives the user and the voice connection as the third parameter, for example to use a different language in each guild.
- `speechRecognition: undefined` turns speech recognition off and only records audio.
- Voice connections created by DisTube (which uses id of the bot as the group) are found without setting `group`.
- `VoiceMessage.toWav()` and `VoiceMessage.startTimestamp`.
- `pcmToWav` function to convert audio in custom speech recognition functions.
- `SpeechRecognition`, `SpeechRecognitionContext`, `SpeechRecognitionOptions` and `VoiceMessageData` types are exported.
- README has recipes for wake words, pausing recognition, settings for each guild and music libraries.
- An error with instructions is thrown from `addSpeechEvent` when no opus library is installed.

### Fixed

- The same speech was sometimes emitted multiple times (#51).
- Memory leak warning about too many listeners (#64).
- Speech recognition stopped working for users that transmit without pauses (#69).
- Corrupted audio packet crashed the process.
- Unhandled promise rejection when voice connection didn't become ready in 20 seconds.
- Bot listened to users when it was deafened (#65).
- Speech of users that weren't in the cache was ignored.
- Speech recognition functions with required options or without options didn't match `SpeechRecognition` type.
- Both audio channels are used when converting to mono, not only the left one.

### Changed

- `axios`, `node-fetch` and `wav` dependencies are gone, the package uses built-in `fetch` (#46).
