import { OpusEncoder } from "@discordjs/opus";
import {
  EndBehaviorType,
  entersState,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Client } from "discord.js";
import { Transform } from "stream";
import { SpeechOptions } from "../speechOptions";
import VoiceMessage, { createVoiceMessage } from "../voiceMessage";

declare module "discord.js" {
  interface ClientEvents {
    speech: [voiceMessage: VoiceMessage];
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
const handleSpeakingEvent = ({
  client,
  connection,
  speechOptions,
}: {
  client: Client;
  connection: VoiceConnection;
  speechOptions: SpeechOptions;
}) => {
  connection.receiver.speaking.on(
    "start",
    function handleSpeechEventOnConnectionReceiver(userId) {
      if (speechOptions.ignoreBots && client.users.cache.get(userId)?.bot) {
        return;
      }

      const { receiver } = connection;
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 300,
        },
      });

      const bufferData: Uint8Array[] = [];
      opusStream
        .pipe(new OpusDecodingStream())
        .on("data", (data: Uint8Array) => {
          bufferData.push(data);
        });

      opusStream.on("end", async () => {
        const user = client.users.cache.get(userId);
        if (!user) return;

        const voiceMessage = await createVoiceMessage({
          client,
          bufferData,
          user,
          connection,
          speechOptions,
        });

        if (voiceMessage) client.emit("speech", voiceMessage);
      });
    }
  );
};

/**
 * Enables `speech` event on Client, which is called whenever someone stops speaking
 */
export default (client: Client, speechOptions: SpeechOptions): void => {
  client.on("voiceJoin", async (connection) => {
    if (!connection) {
      return;
    }

    await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    handleSpeakingEvent({ client, speechOptions, connection });
  });
};
