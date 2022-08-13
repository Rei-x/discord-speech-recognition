# Discord Speech Recognition Extension

This is an extension for [discord.js](https://discord.js.org) library that makes creating discord speech recognition bots as easy as common text bots.

## Installation

**Discord.js v14**:

```
npm i discord-speech-recognition
```

Checkout simpleBot example in examples directory for ready-to-use bot.

**Discord.js v13**:

```
npm i discord-speech-recognition@2
```

**Discord.js v12**:

```
npm i discord-speech-recognition@1
```


## Docs

<https://discordsr.netlify.app/>

## Example usage for discord.js v14

```javascript
const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { addSpeechEvent } = require("discord-speech-recognition");

const client = new Client({
  intents: [
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
      ],
});
addSpeechEvent(client);

client.on("messageCreate", (msg) => {
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

client.on("speech", (msg) => {
  // If bot didn't recognize speech, content will be empty
  if (!msg.content) return;

  msg.author.send(msg.content);
});

client.on("ready", () => {
  console.log("Ready!");
});

client.login("token");
```
