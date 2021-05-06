import { Guild, PermissionResolvable, TextChannel } from "discord.js";

const discord = require('discord.js');
const { getChannelsFromGuildByType } = require('../utils/getChannelsFromGuildByType');


type debugTextChannel = TextChannel;

export interface DebugOptions {
  /**
   * Whether to enable debug mode
   */
  debug: boolean,
  /**
  * Text channel where debug messages will be send, if not specified will create private channel named "debug"
  */
  textChannel?: debugTextChannel
}

export class Debug {
  private textChannel: debugTextChannel;
  /**
   * Debug class, used for debugging {@link Alexa} in {@link Alexa.resolveCommand}
   */
  constructor(guild: Guild, debugOptions: DebugOptions) {
    if (!debugOptions.textChannel) {
      this.textChannel = getChannelsFromGuildByType(guild, 'text')
        .find((value: TextChannel) => value.name === 'debug');
    } else {
      this.textChannel = debugOptions.textChannel;
    }

    const denyViewPermission = {
      id: guild.roles.everyone,
      deny: (['VIEW_CHANNEL'] as PermissionResolvable),
    };

    if (!this.textChannel) {
      guild.channels.create('debug', {
        type: 'text',
        permissionOverwrites: [denyViewPermission],
        reason: 'Debug mode',
      }).then((textChannel: TextChannel) => {
        this.textChannel = textChannel;
      });
    }
  }
}