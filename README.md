# Discord Speech Recognition Extension

This is an extension for [discord.js](https://discord.js.org) library that makes creating discord speech recognition bots as easy as common text bots.

## Installation

**Discord.js v14** (Node.js 22.12 or newer):

```sh
npm i discord-speech-recognition discord.js @discordjs/voice @discordjs/opus
```

You need one opus library to decode voice. `@discordjs/opus` is the fastest, but it's a native module. If it doesn't install on your machine, use `opusscript` instead:

```sh
npm i discord-speech-recognition discord.js @discordjs/voice opusscript
```

Checkout simpleBot example in examples directory for ready-to-use bot.

**Discord.js v13**:

```sh
npm i discord-speech-recognition@2
```

**Discord.js v12**:

```sh
npm i discord-speech-recognition@1
```

## Docs

<https://discordsr.netlify.app/>

## Example usage for discord.js v14

```javascript
const { Client, GatewayIntentBits, Events } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { addSpeechEvent, SpeechEvents } = require("discord-speech-recognition");

const client = new Client({
  intents: [
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
  ],
});
addSpeechEvent(client);

client.on(Events.MessageCreate, (msg) => {
  const voiceChannel = msg.member?.voice.channel;
  if (voiceChannel) {
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });
  }
});

client.on(SpeechEvents.speech, (msg) => {
  // If bot didn't recognize speech, content will be empty
  if (!msg.content) return;

  msg.author.send(msg.content);
});

client.on(Events.ClientReady, () => {
  console.log("Ready!");
});

client.login("token");
```

You need to enable message content for this example, so it can react to messages in chat.

![](https://i.imgur.com/06doHXE.png)

The package works the same way with ES modules and TypeScript:

```javascript
import { addSpeechEvent, SpeechEvents } from "discord-speech-recognition";
```

## How it works

`addSpeechEvent(client, options)` adds `speech` event to the client. The bot listens on every voice channel it joins with `joinVoiceChannel`, as long as:

- the client has `Guilds` and `GuildVoiceStates` intents,
- the bot joined with `selfDeaf: false`, deafened bot doesn't listen to anyone.

When someone stops speaking, their speech is sent to speech recognition and `speech` event is emitted with a `VoiceMessage`:

| Property                       | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| `content`                      | Recognized text, empty if nothing was recognized          |
| `error`                        | Error thrown by speech recognition, if there was any      |
| `author`, `member`             | User who spoke                                            |
| `channel`, `guild`             | Voice channel the user spoke on                           |
| `duration`                     | Duration in seconds                                       |
| `startTimestamp`               | When the user started speaking, in milliseconds           |
| `audioBuffer`                  | PCM mono 16-bit audio with 48kHz sample rate              |
| `connection`                   | Voice connection, you can use it to play audio as a reply |
| `saveToFile(path)`             | Saves audio to .wav file                                  |
| `toWav()`                      | Returns audio as .wav file in a Buffer                    |
| `getWavEncodedToBase64Audio()` | Returns audio as .wav file encoded to base64              |

## Options

```javascript
const speechOptions = addSpeechEvent(client, {
  lang: "pl-PL",
  profanityFilter: false,
});

// Options can be changed at any time
speechOptions.lang = "en-US";
```

| Option                        | Default       | Description                                                                       |
| ----------------------------- | ------------- | --------------------------------------------------------------------------------- |
| `speechRecognition`           | Google Speech | Function that turns audio into text, `undefined` turns speech recognition off     |
| `ignoreBots`                  | `true`        | Don't listen to other bots                                                        |
| `shouldProcessSpeech`         |               | Function `(user, connection) => boolean`, return `false` to ignore the speech     |
| `minimalVoiceMessageDuration` | `1`           | Shorter voice messages are ignored, in seconds                                    |
| `maximalVoiceMessageDuration` | `19`          | Longer speech is split into multiple voice messages, in seconds                   |
| `silenceDuration`             | `300`         | How long the user has to be silent before the voice message ends, in milliseconds |
| `group`                       |               | Use it if you pass `group` to `joinVoiceChannel`                                  |

All other options are passed to the speech recognition function.

## Speech recognition

### Google Speech (default)

Works out of the box with a generic API key. The key should be used for personal or testing purposes only, as it may be revoked by Google at any time. You can obtain your own key [here](http://www.chromium.org/developers/how-tos/api-keys).

| Option            | Default | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `lang`            | `en-US` | Language of the speech               |
| `key`             |         | Your own API key                     |
| `profanityFilter` | `true`  | Replaces vulgar words with asterisks |

### wit.ai

```javascript
const {
  addSpeechEvent,
  resolveSpeechWithWitai,
} = require("discord-speech-recognition");

addSpeechEvent(client, {
  speechRecognition: resolveSpeechWithWitai,
  key: "server access token of your wit.ai app",
});
```

The language is set in the settings of your wit.ai app.

### Your own function

Speech recognition function receives PCM mono 16-bit audio with 48kHz sample rate and all options passed to `addSpeechEvent`. It returns recognized text.

```javascript
const { addSpeechEvent } = require("discord-speech-recognition");

async function recognize(audioBuffer, options) {
  const response = await fetch("https://your-speech-api.example", {
    method: "POST",
    headers: { Authorization: `Bearer ${options.apiKey}` },
    body: audioBuffer,
  });
  return (await response.json()).text;
}

addSpeechEvent(client, {
  speechRecognition: recognize,
  apiKey: "passed to the recognize function",
  // Raise the limit if your api handles longer audio
  maximalVoiceMessageDuration: 60,
});
```

The function also gets a third parameter with the user who spoke and the voice connection. Most services want a file and not raw audio, `pcmToWav` converts it:

```javascript
const { addSpeechEvent, pcmToWav } = require("discord-speech-recognition");

async function recognize(audioBuffer, options, { user, connection }) {
  const form = new FormData();
  form.append("file", new Blob([pcmToWav(audioBuffer)]), "speech.wav");
  // ...
}
```

## Recipes

### Voice commands with a wake word

Speech recognition often mishears short names, so accept a few similar words and compare whole words, not parts of the text.

```javascript
const wakeWords = ["alexa", "alexia", "alex"];

client.on(SpeechEvents.speech, (msg) => {
  const words = (msg.content ?? "").toLowerCase().split(/\s+/);
  const wakeWordIndex = words.findIndex((word) => wakeWords.includes(word));
  if (wakeWordIndex === -1) return;

  const [command, ...args] = words.slice(wakeWordIndex + 1);
  if (command === "play") play(msg, args.join(" "));
});
```

### Don't listen while the bot is busy

`shouldProcessSpeech` is called when someone starts speaking. If it returns `false`, the speech isn't sent to speech recognition and `speech` event isn't emitted.

```javascript
let isBusy = false;

addSpeechEvent(client, {
  shouldProcessSpeech: () => !isBusy,
});

client.on(SpeechEvents.speech, async (msg) => {
  if (!msg.content) return;
  isBusy = true;
  try {
    await answer(msg);
  } finally {
    isBusy = false;
  }
});
```

### Turn speech recognition on and off for each server or user

```javascript
const enabledGuilds = new Set();
const optedOutUsers = new Set();

addSpeechEvent(client, {
  shouldProcessSpeech: (user, connection) =>
    enabledGuilds.has(connection.joinConfig.guildId) &&
    !optedOutUsers.has(user.id),
});
```

### Different language for each server

```javascript
const {
  addSpeechEvent,
  resolveSpeechWithGoogleSpeechV2,
} = require("discord-speech-recognition");

const languages = new Map([["id of the guild", "pl-PL"]]);

addSpeechEvent(client, {
  speechRecognition: (audioBuffer, options, { connection }) =>
    resolveSpeechWithGoogleSpeechV2(audioBuffer, {
      ...options,
      lang: languages.get(connection.joinConfig.guildId) ?? "en-US",
    }),
});
```

### Only record audio

Turn speech recognition off to get the audio without sending it anywhere.

```javascript
addSpeechEvent(client, { speechRecognition: undefined });

client.on(SpeechEvents.speech, (msg) => {
  msg.saveToFile(`./recordings/${msg.author.id}-${msg.startTimestamp}.wav`);
});
```

### Tell errors from silence

`content` is empty both when nobody said anything understandable and when speech recognition failed. Check `error` to tell them apart.

```javascript
client.on(SpeechEvents.speech, (msg) => {
  if (msg.error) console.error("Speech recognition failed", msg.error);
});
```

### DisTube and other music libraries

Libraries like DisTube join the voice channel for you and use id of the bot as the `group`. This is detected automatically, so `addSpeechEvent(client)` is enough. For other groups pass `group` to `addSpeechEvent`.

Speech recognition finds the connection only if the music library uses the same copy of `@discordjs/voice` as your bot. Run `npm ls @discordjs/voice`, there should be one version in the tree.

## Troubleshooting

**The bot doesn't react to speech**

- Check if the client has `Guilds` and `GuildVoiceStates` intents.
- Check if the bot joined the channel with `selfDeaf: false`.
- If you use `group` in `joinVoiceChannel`, pass the same `group` to `addSpeechEvent`.
- If a music library joins the channel for you, check "DisTube and other music libraries" above.
- By default other bots are ignored, set `ignoreBots: false` to listen to them.
- Listen to `SpeechEvents.audioStreamError` event and check `msg.error` in `speech` event.

**The bot leaves the channel or doesn't come back after it was disconnected**

This package doesn't manage the voice connection. Handle disconnects the way [discord.js guide](https://discordjs.guide/voice/voice-connections) recommends.

**Recognized text is in the wrong language**

Pass `lang` option, for example `addSpeechEvent(client, { lang: "pl-PL" })`.

## Development

```sh
npm ci
npm run lint
npm run test:unit
```

Unit tests work offline. Integration tests use real services: copy `.env.example` to `.env` and fill it in to run tests that need two Discord bots and wit.ai key, they are skipped otherwise.

```sh
npm run test:integration
```
