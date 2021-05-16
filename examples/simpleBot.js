const {Client} = require('discord.js');
const {DiscordSR} = require('../dist/index');

const client = new Client();
const discordSR = new DiscordSR(client);

client.on('message', (msg) => {
  if (msg.content.startsWith('!join') &&
   msg.member &&
   msg.member.voice.channel) {
    msg.member.voice.channel.join();
  }
});

client.on('speech', (msg) => {
  msg.author.send(msg.content);
});

client.login('token');
