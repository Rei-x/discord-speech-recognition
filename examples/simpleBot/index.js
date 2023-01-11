const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel } = require("@discordjs/voice");
const { addSpeechEvent } = require("discord-speech-recognition");

const client = new Client({
  intents: [
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
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
