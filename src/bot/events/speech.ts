import {
  EndBehaviorType,
  entersState,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client, User } from "discord.js";
import { SpeechOptions, SpeechRecognition } from "../speechOptions";
import VoiceMessage, { createVoiceMessage } from "../voiceMessage";
import { SpeechEvents } from "../../events";
import { OpusDecodingStream } from "../../utils/opus";
import {
  markConnectionAsAttached,
  unmarkConnectionAsAttached,
} from "./voiceJoin";

declare module "discord.js" {
  interface ClientEvents {
    [SpeechEvents.speech]: [voiceMessage: VoiceMessage];
    [SpeechEvents.audioStreamError]: [error: Error];
  }
}

const DEFAULT_MAXIMAL_DURATION = 19;
const DEFAULT_SILENCE_DURATION = 300;
/** 16-bit stereo PCM with 48kHz sample rate */
const DECODED_BYTES_PER_SECOND = 48000 * 2 * 2;

const shouldListenTo = <T extends SpeechRecognition>(
  user: User,
  connection: VoiceConnection,
  speechOptions: SpeechOptions<T>,
): boolean => {
  const { shouldProcessSpeech } = speechOptions;
  if (shouldProcessSpeech && !shouldProcessSpeech(user, connection))
    return false;
  if (speechOptions.ignoreBots && user.bot) return false;
  return true;
};

/**
 * Starts listening on connection and emits `speech` event when someone stops speaking
 * @param connection Connection to listen
 */
const handleSpeakingEvent = <T extends SpeechRecognition>({
  client,
  connection,
  speechOptions,
}: {
  client: Client;
  connection: VoiceConnection;
  speechOptions: SpeechOptions<T>;
}) => {
  const { receiver } = connection;
  const activeListeners = new Set<string>();

  const emitError = (error: unknown) => {
    client.emit(
      SpeechEvents.audioStreamError,
      error instanceof Error ? error : new Error(String(error)),
    );
  };

  /**
   * Records the user until they go silent or the voice message gets too long
   */
  const listen = (userId: string) => {
    if (connection.joinConfig.selfDeaf) return;
    if (activeListeners.has(userId)) return;

    const cachedUser = client.users.cache.get(userId);
    if (cachedUser && !shouldListenTo(cachedUser, connection, speechOptions))
      return;

    activeListeners.add(userId);
    const startTimestamp = Date.now();

    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: speechOptions.silenceDuration ?? DEFAULT_SILENCE_DURATION,
      },
    });
    const decodingStream = new OpusDecodingStream();

    const maximalBytes =
      (speechOptions.maximalVoiceMessageDuration ?? DEFAULT_MAXIMAL_DURATION) *
      DECODED_BYTES_PER_SECOND;
    const bufferData: Buffer[] = [];
    let bufferedBytes = 0;
    let isCollecting = true;

    let isFinished = false;
    const finish = (error?: unknown) => {
      if (isFinished) return;
      isFinished = true;
      isCollecting = false;

      opusStream.unpipe(decodingStream);
      if (!decodingStream.destroyed) decodingStream.destroy();
      if (!opusStream.destroyed) opusStream.destroy();

      if (error) {
        emitError(error);
        return;
      }

      void (async () => {
        const user =
          cachedUser ??
          (await client.users.fetch(userId).catch(() => undefined));
        if (!user) return;
        if (!cachedUser && !shouldListenTo(user, connection, speechOptions))
          return;

        const voiceMessage = await createVoiceMessage({
          client,
          bufferData,
          user,
          connection,
          speechOptions,
          startTimestamp,
        });

        if (voiceMessage) client.emit(SpeechEvents.speech, voiceMessage);
      })().catch(emitError);
    };

    decodingStream.on("data", (data: Buffer) => {
      if (!isCollecting) return;
      bufferData.push(data);
      bufferedBytes += data.length;

      // Speech recognition can't handle more, the rest goes to the next voice message
      if (bufferedBytes >= maximalBytes) {
        isCollecting = false;
        opusStream.destroy();
      }
    });

    // Wait for the decoder, so the last packets aren't lost
    decodingStream.once("end", () => finish());
    decodingStream.once("error", (error) => finish(error));
    opusStream.once("error", (error) => finish(error));
    // Stream that was destroyed never emits `end`, so `close` is the only reliable event
    opusStream.once("close", () => {
      activeListeners.delete(userId);
      if (!decodingStream.writableEnded && !decodingStream.destroyed) {
        decodingStream.end();
      }

      // `start` is emitted only after a pause in transmission, so users that
      // are still transmitting have to be picked up here
      const isConnectionAlive =
        connection.state.status !== VoiceConnectionStatus.Destroyed;
      if (isConnectionAlive && receiver.speaking.users.has(userId)) {
        listen(userId);
      }
    });

    opusStream.pipe(decodingStream);
  };

  receiver.speaking.on("start", listen);
};

/**
 * Enables `speech` event on Client, which is called whenever someone stops speaking
 */
export default <T extends SpeechRecognition>(
  client: Client,
  speechOptions: SpeechOptions<T>,
): void => {
  client.on(SpeechEvents.voiceJoin, (connection) => {
    if (!connection) return;
    if (!markConnectionAsAttached(client, connection)) return;

    entersState(connection, VoiceConnectionStatus.Ready, 20e3).then(
      () => {
        handleSpeakingEvent({ client, speechOptions, connection });
      },
      () => {
        // Connection didn't become ready, it will be picked up again on the next voice state update
        unmarkConnectionAsAttached(client, connection);
      },
    );
  });
};
