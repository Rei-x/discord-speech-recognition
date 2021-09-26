import { VoiceConnection } from "@discordjs/voice";
import { Client, User } from "discord.js";
import {
  convertStereoToMono,
  getDurationFromMonoBuffer,
} from "../../utils/audio";
import { SpeechOptions } from "../speechOptions";
import VoiceMessage from "../voiceMessage";

export default async ({
  client,
  bufferData,
  user,
  connection,
  speechOptions,
}: {
  client: Client;
  bufferData: Uint8Array[];
  user: User;
  connection: VoiceConnection;
  speechOptions: SpeechOptions;
}): Promise<VoiceMessage | undefined> => {
  if (!connection.joinConfig.channelId) return undefined;

  const stereoBuffer = Buffer.concat(bufferData);
  const monoBuffer = convertStereoToMono(stereoBuffer);
  const duration = getDurationFromMonoBuffer(monoBuffer);
  if (duration < 1 || duration > 19) return undefined;

  let content;
  let error;
  try {
    content = await speechOptions.speechRecognition?.(
      monoBuffer,
      speechOptions
    );
  } catch (e) {
    error = e;
  }

  const channel = client.channels.cache.get(connection.joinConfig.channelId);
  if (!channel || !channel.isVoice()) return undefined;

  const voiceMessage = new VoiceMessage({
    client,
    data: {
      author: user,
      duration,
      audioBuffer: stereoBuffer,
      content,
      error,
      connection,
    },
    channel,
  });
  return voiceMessage;
};
