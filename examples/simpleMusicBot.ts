import { Channel, Message, VoiceChannel } from "discord.js";

import { Client } from 'discord.js';

import config from '../config.json';
import { exit } from '../src';
import { AlexaMaker } from '../src';
import { Song } from '../src';
import { getVideoFromQuery } from '../src';
import discordTTS from 'discord-tts';
import { getImageURLFromQuery } from '../src';


const client = new Client();

const alexaMaker = new AlexaMaker();

alexaMaker.addCommand('hello', (alexa, args) => {
  alexa.textChannel.send('hello ' + args);
});

alexaMaker.addCommand('play', (alexa, args) => {
  if (!args) return;
  getVideoFromQuery(args).then((data: any) => {
    const song = new Song(data.title, data.url);
    alexa.songs.push(song);
    alexa.playSongs();
  });
});

alexaMaker.addCommand('stop', (alexa) => {
  alexa.stopSong();
});

alexaMaker.addCommand('przycisz', (alexa) => {
  const dispatcher = alexa.connection.dispatcher;
  const newVolume = dispatcher.volume / 10;
  dispatcher.setVolume(newVolume);
});

alexaMaker.addCommand('powiedz', (alexa, args) => {
  alexa.connection.play(discordTTS.getVoiceStream(args, 'pl-PL', 2));
});

alexaMaker.addCommand('pokaż', (alexa, args) => {
  if (!args) return;
  getImageURLFromQuery(config.IMGUR_CLIENT_ID, args).then((url: string) => {
    alexa.textChannel.send(args, {
      files: [url],
    });
  });
});

alexaMaker.addCommand('wyłącz', () => {
  process.exit(1);
});

client.on('message', (msg: Message) => {
  if (!msg.guild) return;
  if (msg.channel.type != "text") return;

  if (msg.content.startsWith(config.PREFIX)) {
    const commandBody = msg.content.substring(config.PREFIX.length).split(' ');

    if (commandBody[0] === ('enter')) {
      const alexa = alexaMaker.getAlexa(
        msg.guild,
        msg.channel,
        { 'debug': true });
      alexa.join(msg.member!.voice.channel);
    };
    if (commandBody[0] === ('exit')) exit(msg);
    if (commandBody[0] === ('invite')) msg.channel.send('https://discord.com/api/oauth2/authorize?client_id=837783498831036468&permissions=0&scope=bot');
  }
});

client.login(config.BOT_TOKEN);

client.on('ready', () => {
  console.log(`\nONLINE\n`);

  (client.channels.cache.filter((channel: VoiceChannel | Channel) => {
    return channel.type == 'voice' && (channel as VoiceChannel).name == 'Alexa';
  }) as unknown as Map<string, VoiceChannel>)
    .forEach((channel: VoiceChannel) => {
      if (!channel.guild.systemChannel) return;
      const alexa = alexaMaker.getAlexa(channel.guild, channel.guild.systemChannel);
      alexa.join(channel);
    });
});