import { VoiceConnection } from "@discordjs/voice";
import { Client, User } from "discord.js";
import {
  convertStereoToMono,
  getDurationFromMonoBuffer,
} from "../../utils/audio";
import { SpeechOptions, SpeechRecognition } from "../speechOptions";
import VoiceMessage from "./VoiceMessage";

export default async <T extends SpeechRecognition>({
  client,
  bufferData,
  user,
  connection,
  speechOptions,
  startTimestamp,
}: {
  client: Client;
  bufferData: Uint8Array[];
  user: User;
  connection: VoiceConnection;
  speechOptions: SpeechOptions<T>;
  startTimestamp?: number;
}): Promise<VoiceMessage | undefined> => {
  if (!connection.joinConfig.channelId) return undefined;

  const stereoBuffer = Buffer.concat(bufferData);
  const monoBuffer = convertStereoToMono(stereoBuffer);
  const duration = getDurationFromMonoBuffer(monoBuffer);

  const minimalDuration = speechOptions.minimalVoiceMessageDuration ?? 1;

  if (duration < minimalDuration) return undefined;

  let content: string | undefined;
  let error: Error | undefined;
  try {
    content = await speechOptions.speechRecognition?.(
      monoBuffer,
      speechOptions,
      { user, connection },
    );
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
  }

  const channel = client.channels.cache.get(connection.joinConfig.channelId);
  if (!channel || !channel.isVoiceBased()) return undefined;

  return new VoiceMessage({
    client,
    data: {
      author: user,
      duration,
      startTimestamp,
      audioBuffer: monoBuffer,
      content,
      error,
      connection,
    },
    channel,
  });
};
