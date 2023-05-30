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
