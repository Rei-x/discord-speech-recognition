const {Client} = require('discord.js');
const {DiscordSR} = require('discord-speech-recognition');

const client = new Client();
const discordSR = new DiscordSR(client);

client.on('message', (msg) => {
  if (msg.content.startsWith('!join') && msg.member?.voice.channel) {
    msg.member.voice.channel.join();
  }
});

client.on('speech', (msg) => {
  msg.author.send(msg.content);
});

client.login('token');
