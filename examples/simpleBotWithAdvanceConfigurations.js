const {Client} = require('discord.js');
const {DiscordSR, resolveSpeechWithGoogleSpeechV2} = require('discord-speech-recognition');

const client = new Client();
const discordSR = new DiscordSR(client, {
  speechRecognition: resolveSpeechWithGoogleSpeechV2,
  speechOptions: {
    lang: 'en-US', // RFC5646 language tag; Available language are same as in chromium : `<http://stackoverflow.com/a/14302134>`
    // key: 'API_KEY', // API key
    profanityFilter: true, // Google profanityFilter
  }
});

client.on('message', (msg) => {
  if (msg.content.startsWith('!join') && msg.member?.voice.channel) {
    msg.member.voice.channel.join();
  }
});

client.on('speech', (msg) => {
  msg.author.send(msg.content);
});

client.login('token');
