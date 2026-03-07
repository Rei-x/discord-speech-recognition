import { OpusEncoder } from "@discordjs/opus";
import {
  EndBehaviorType,
  entersState,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client } from "discord.js";
import { Transform } from "stream";
import { SpeechOptions, SpeechRecognition } from "../speechOptions";
import VoiceMessage, { createVoiceMessage } from "../voiceMessage";
import { SpeechEvents } from "../../events";

declare module "discord.js" {
  interface ClientEvents {
    [SpeechEvents.speech]: [voiceMessage: VoiceMessage];
    [SpeechEvents.audioStreamError]: [error: Error];
  }
}

class OpusDecodingStream extends Transform {
  encoder: OpusEncoder;

  constructor() {
    super();
    this.encoder = new OpusEncoder(48000, 2);
  }

  _transform(data: any, encoding: any, callback: () => void) {
    this.push(this.encoder.decode(data));
    callback();
  }
}

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
  const activeListeners = new Set<string>();

  connection.receiver.speaking.on(
    "start",
    function handleSpeechEventOnConnectionReceiver(userId) {
      if (connection.joinConfig.selfDeaf) return;

      const user = client.users.cache.get(userId);

      // Shouldn't proceed if user is undefined, some checks will fail even if they shouldn't
      if (!user) return;

      const { shouldProcessSpeech } = speechOptions;
      if (shouldProcessSpeech && !shouldProcessSpeech(user)) {
        return;
      }

      if (speechOptions.ignoreBots && user.bot) {
        return;
      }

      if (activeListeners.has(userId)) return;
      activeListeners.add(userId);

      const { receiver } = connection;
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 300,
        },
      });

      const bufferData: Uint8Array[] = [];
      const decodingStream = new OpusDecodingStream();

      const cleanup = () => {
        activeListeners.delete(userId);
        decodingStream.destroy();
        if (!opusStream.destroyed) opusStream.destroy();
      };

      opusStream
        .pipe(decodingStream as unknown as NodeJS.WritableStream)
        .on("data", (data: Uint8Array) => {
          bufferData.push(data);
        });

      opusStream.on("end", () => {
        cleanup();
        void (async () => {
          const voiceMessage = await createVoiceMessage({
            client,
            bufferData,
            user,
            connection,
            speechOptions,
          });

          if (voiceMessage) client.emit(SpeechEvents.speech, voiceMessage);
        })();
      });

      opusStream.on("error", (err) => {
        cleanup();
        client.emit(SpeechEvents.audioStreamError, err);
      });
    },
  );

  connection.on(VoiceConnectionStatus.Disconnected, () => {
    activeListeners.clear();
    if (connection.state.status === VoiceConnectionStatus.Destroyed) return;
    try {
      if (connection.rejoinAttempts < 5) {
        connection.rejoin();
      } else {
        connection.destroy();
      }
    } catch {
      // Connection may already be destroyed
    }
  });
};

/**
 * Enables `speech` event on Client, which is called whenever someone stops speaking
 */
export default <T extends SpeechRecognition>(
  client: Client,
  speechOptions: SpeechOptions<T>,
): void => {
  client.on(SpeechEvents.voiceJoin, (connection) => {
    if (!connection) {
      return;
    }

    void entersState(connection, VoiceConnectionStatus.Ready, 20e3).then(() => {
      handleSpeakingEvent({ client, speechOptions, connection });
    });
  });
};
