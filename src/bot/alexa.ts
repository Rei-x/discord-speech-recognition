import { Guild, Speaking, TextChannel, User, VoiceChannel, VoiceConnection } from "discord.js";
import { commandCallback } from "./alexaMaker";

import ytdl = require('ytdl-core');
import { DebugOptions } from "./debug";
const { resolveSpeech, createOutputStream } = require('../speechRecognition/speechRecognition');
const fs = require('fs');
const Debug = require('./debug');

/**
 * Voice bot
 */
export class Alexa {
  /**
  * Guild that this instance of bot operates in
  */
  guild: Guild;
  songs: Song[];
  /**
  * Is bot currently playing audio
  */
  playing: boolean;
  /**
  * Bots current voice channel
  */
  voiceChannel: VoiceChannel | undefined;
  /**
  * Currrent voice connection
  */
  connection: VoiceConnection | undefined;
  /**
  * Text channel where bot will send messages
  */
  textChannel: TextChannel;
  /**
  * Array for wake words that bot will response to
  */
  wakeWordArray: string[];
  /**
  * List of commands that bot will execute
  */
  commands: Map<string, commandCallback>;
  debug: typeof Debug;
  /**
  * Do not use, use instead {@link AlexaMaker.getAlexa}
  */
  private constructor(guild: Guild, textChannel: TextChannel, commands: Map<string, commandCallback>, debugOptions: DebugOptions = { 'debug': false }) {

    this.guild = guild;
    this.songs = [];
    this.playing = false;
    this.voiceChannel = undefined;
    this.connection;
    this.textChannel = textChannel;
    this.wakeWordArray = [
      "alexa",
      "oleksa",
      "olek",
      "aleksa",
      "oleks"
    ];
    this.commands = commands;
    if (debugOptions.debug) {
      this.debug = new Debug(
        guild,
        debugOptions);
    };
  }
  /**
   * Bot joins voice channel and starts listening
   * @param {discord.VoiceChannel} voiceChannel
   * @return {void}
   */
  join(voiceChannel: VoiceChannel) {
    voiceChannel.join()
      .then((conn: VoiceConnection) => {
        this.setVoiceChannelConnection(conn);
      });
  }

  playSongs() {
    const song = this.songs[0];

    if (this.connection && song) {
      this.connection.play(ytdl(song.url)).on('finish', () => {
        this.songs.shift();
        this.playSongs();
      });
      this.textChannel.send(`Playing ${song.title}`);
    }
  }

  stopSong() {
    if (this.connection && this.connection.dispatcher) {
      this.connection.dispatcher.end();
    }
  }

  /**
   * Checks for wake word in text and calls for the appropriate command, specified in {@link Alexa.wakeWordArray}
   */
  private resolveCommand(user: User, text: string): void {
    if (this.debug) this.debug.textChannel.send(user.username + ': ' + text);

    text = text.toLowerCase();

    if (!this.checkForWakeWordInString(text)) return;

    const command = text.split(' ')[1];
    const args = text.split(' ').slice(2).join(' ');

    const callback = this.commands.get(command);
    if (callback) callback(this, args, user);
  }

  /**
   * Setups voice connection and enables listener
   * @param connection 
   */
  protected setVoiceChannelConnection(connection: VoiceConnection): void {
    this.connection = connection;
    connection.on('speaking', (user, speaking) => {
      const promise = this.speechToText(user, speaking);
      if (promise) promise.then((text: string) => this.resolveCommand(user, text));
    });
  }

  /**
   * Receive audio stream from specific user and translates it to text
   * @param user User object, which one is speaking
   * @param speaking 
   * @returns 
   */
  private speechToText(user: User, speaking: Readonly<Speaking>): Promise<string> | undefined {
    if (speaking && this.connection) {
      console.log(`${user.username} started speaking`);

      const audioStream = this.connection.receiver.createStream(user, {
        mode: 'pcm',
      });

      const [fileStream, fileDir] = createOutputStream();
      audioStream.pipe(fileStream);

      return new Promise((resolve, reject) => {
        audioStream.on('end', () => {
          const fileSize = fs.statSync(fileDir).size;

          if (fileSize > 0) {
            resolve(resolveSpeech(fileDir));
          }
        });
      });
    }
  }

  /**
   * Checks for specific string in {@link Alexa.wakeWordArray}
   * @param text 
   * @returns 
   */
  private checkForWakeWordInString(text: string): boolean {
    let isWakeWord = false;
    this.wakeWordArray.forEach((wakeWord) => {
      if (text.toLowerCase().includes(wakeWord.toLowerCase())) {
        isWakeWord = true;
      }
    });
    return isWakeWord;
  }
}


export class Song {
  title: string;
  url: string;
  /**
   * Class for Songs
   * @param title 
   * @param url 
   */
  constructor(title: string, url: string) {
    this.title = title;
    this.url = url;
  }
}