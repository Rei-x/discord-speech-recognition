import { Guild, GuildChannel } from "discord.js";

export function getChannelsFromGuildByType(guild: Guild, type: string) {
  return guild.channels.cache.filter((channel: GuildChannel) => {
    return channel.type == type;
  });
};
