import { getVoiceConnection, VoiceConnection } from "@discordjs/voice";
import { Client } from "discord.js";
import { SpeechOptions, SpeechRecognition } from "../speechOptions";
import { SpeechEvents } from "../../events";

declare module "discord.js" {
  interface ClientEvents {
    /**
     * This event is emitted when speech recognition is attached to voice connection
     */
    voiceJoin: [connection: VoiceConnection | undefined];
  }
}

/**
 * Connections that already have (or are about to have) speech recognition attached.
 * Connection is added here before it's ready, so voice state updates that arrive
 * in the meantime don't attach speech recognition for the second time.
 */
const attachedConnections = new WeakMap<Client, WeakSet<VoiceConnection>>();

const getAttachedConnections = (client: Client): WeakSet<VoiceConnection> => {
  let connections = attachedConnections.get(client);
  if (!connections) {
    connections = new WeakSet();
    attachedConnections.set(client, connections);
  }
  return connections;
};

/**
 * Marks connection as handled
 * @returns false if the connection has been already marked
 */
export const markConnectionAsAttached = (
  client: Client,
  connection: VoiceConnection,
): boolean => {
  const connections = getAttachedConnections(client);
  if (connections.has(connection)) return false;
  connections.add(connection);
  return true;
};

/**
 * Lets the connection be picked up again, for example when it failed to become ready
 */
export const unmarkConnectionAsAttached = (
  client: Client,
  connection: VoiceConnection,
): void => {
  getAttachedConnections(client).delete(connection);
};

export default <T extends SpeechRecognition>(
  client: Client,
  speechOptions: SpeechOptions<T>,
): void => {
  client.on("voiceStateUpdate", (_old, newVoiceState) => {
    const guildId = newVoiceState.guild.id;
    const connection =
      getVoiceConnection(guildId, speechOptions.group) ??
      // DisTube and some other libraries use id of the bot as the group
      (speechOptions.group === undefined && client.user
        ? getVoiceConnection(guildId, client.user.id)
        : undefined);
    if (!connection) return;

    if (getAttachedConnections(client).has(connection)) return;

    client.emit(SpeechEvents.voiceJoin, connection);
  });
};
