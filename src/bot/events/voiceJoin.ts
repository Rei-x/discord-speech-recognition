import { getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { Client } from "discord.js";
import { SpeechOptions, SpeechRecognition } from "../speechOptions";

declare module "discord.js" {
  interface ClientEvents {
    /**
     * This event is emitted when speech recognition is attached to voice connection
     */
    voiceJoin: [connection: VoiceConnection | undefined];
  }
}

/**
 * It's a bit hacky solution to check if speech handler has been already attached to connection receiver
 * It does it by checking if in the listeners of speaking map exists function with the same name as function
 * which handles speech event
 * @param connection
 * @returns
 */
const isSpeechHandlerAttachedToConnection = (
  connection: VoiceConnection
): boolean => {
  return Boolean(
    connection.receiver.speaking
      .listeners("start")
      .find((func) => func.name === "handleSpeechEventOnConnectionReceiver")
  );
};

/**
 * https://github.com/discordjs/discord.js/issues/9185
 *
 * Workaround from this comment: https://github.com/discordjs/discord.js/issues/9185#issuecomment-1459083216
 * @param connection
 */
const fixStoppingAfterOneMinute = (connection: VoiceConnection) => {
  const networkStateChangeHandler = (
    oldNetworkState: any,
    newNetworkState: any
  ) => {
    const newUdp = Reflect.get(newNetworkState, "udp");
    clearInterval(newUdp?.keepAliveInterval);
  };

  connection.on("stateChange", (oldState, newState) => {
    Reflect.get(oldState, "networking")?.off(
      "stateChange",
      networkStateChangeHandler
    );
    Reflect.get(newState, "networking")?.on(
      "stateChange",
      networkStateChangeHandler
    );
  });
};

export default <T extends SpeechRecognition>(
  client: Client,
  speechOptions: SpeechOptions<T>
): void => {
  client.on("voiceStateUpdate", (_old, newVoiceState) => {
    if (!newVoiceState.channel) return;

    const connection = getVoiceConnection(
      newVoiceState.channel.guild.id,
      speechOptions.group
    );
    if (connection && !isSpeechHandlerAttachedToConnection(connection)) {
      fixStoppingAfterOneMinute(connection);

      client.emit(
        "voiceJoin",
        getVoiceConnection(newVoiceState.channel.guild.id, speechOptions.group)
      );
    }
  });
};
