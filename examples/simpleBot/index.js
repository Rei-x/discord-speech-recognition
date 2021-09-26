const { Client, Message } = require("discord.js");
const { addSpeechEvent } = require("discord-speech-recognition");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES],
});
addSpeechEvent(client);

client.on("messageCreate", (msg) => {
  if (msg.member?.voice.channel) {
    msg.member.voice.channel.join();
  }
});

client.on("speech", (msg) => {
  msg.author.send(msg.content);
});

client.login("token");
