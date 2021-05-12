# Discord Speech Recognition Extension

This is an extension for [discord.js](https://discord.js.org) library that makes creating discord speech recognition bots as easy as common text bots.

## Installation

`npm install discord-sr`

## Example usage

```javascript
const { Client, Message } = require('discord.js');
const { DiscordSR } = require('discord-sr');

const client = new Client();
const discordSR = new DiscordSR(client);

client.on('message', msg => {
  if (msg.member.voice.channel) {
    msg.member.voice.channel.join();
  }
})

client.on('speech', msg => {
    msg.author.send(msg.content);
})

client.login('token');
```
