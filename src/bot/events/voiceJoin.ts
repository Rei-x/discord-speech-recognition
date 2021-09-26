import { getVoiceConnection } from "@discordjs/voice";
import { Client } from "discord.js";
import { SpeechOptions } from "../speechOptions";

export default (client: Client, speechOptions: SpeechOptions): void => {
  client.on("voiceStateUpdate", (_old, newVoiceState) => {
    if (!newVoiceState.channel) return;

    const connection = getVoiceConnection(
      newVoiceState.channel.guild.id,
      speechOptions.group
    );
    if (connection)
      client.emit(
        "voiceJoin",
        getVoiceConnection(newVoiceState.channel.guild.id, speechOptions.group)
      );
  });
};
