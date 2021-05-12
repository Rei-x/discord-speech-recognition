/* eslint-disable @typescript-eslint/no-explicit-any */
import {Client, User, VoiceConnection} from 'discord.js';

import {resolveSpeechWithGoogleSpeechV2} from '../speechRecognition/googleV2';
import {convertStereoToMono, getDurationFromStereoBuffer} from '../utils/audio';
import {VoiceMessage} from './voiceMessage';


/**
 * Main class, use this to add new events to present [discord.Client](https://discord.js.org/#/docs/main/stable/class/Client)
 */
export default class DiscordSR {
  client: Client;
  speechOptions: Record<string, any>;
  constructor(client: Client, options: Record<string, any> = {lang: 'en-US', speechRecognition: resolveSpeechWithGoogleSpeechV2}) {
    this.client = client;
    this.speechOptions = options;

    this.setupVoiceJoinEvent();
    this.setupSpeechEvent();
  }

  /**
   * Enables `voiceJoin` event on Client
   */
  private setupVoiceJoinEvent(): void {
    this.client.on('voiceStateUpdate', (_old, newVoiceState) => {
      if (newVoiceState.connection) this.client.emit('voiceJoin', newVoiceState.connection);
    });
  }

  /**
   * Enables `speech` event on Client, which is called whenever someone stops speaking
   */
  private setupSpeechEvent(): void {
    this.client.on('voiceJoin', (connection: VoiceConnection) => {
      connection.once('ready', () => {
        this.handleSpeakingEvent(connection);
      });
    });
  }

  /**
   * Starts listening on connection and emits `speech` event when someone stops speaking
   * @param connection Connection to listen
   */
  private handleSpeakingEvent(connection: VoiceConnection) {
    connection.on('speaking', (user) => {
      const audioStream = connection.receiver.createStream(user, {mode: 'pcm'});
      const bufferData: Uint8Array[] = [];

      audioStream.on('data', (data) => {
        bufferData.push(data);
      });

      audioStream.on('end', async () => {
        const voiceMessage = await this.createVoiceMessage(bufferData, user, connection);
        if (voiceMessage) this.client.emit('speech', voiceMessage);
      });
    });
  }

  private async createVoiceMessage(bufferData: Uint8Array[], user: User, connection: VoiceConnection): Promise<VoiceMessage | void> {
    const stereoBuffer = Buffer.concat(bufferData);
    const duration = getDurationFromStereoBuffer(stereoBuffer);

    if (duration < 1 || duration > 19) return;

    const monoBuffer = convertStereoToMono(stereoBuffer);

    let content; let error;
    try {
      content = await this.speechOptions.speechRecognition(monoBuffer, this.speechOptions);
    } catch (e) {
      error = e;
    }

    const voiceMessage = new VoiceMessage(this.client, {
      author: user,
      duration: duration,
      audioBuffer: stereoBuffer,
      content,
      error,
    }, connection.channel);
    return voiceMessage;
  }
}
