import { Guild, TextChannel, User } from "discord.js";
import { DebugOptions } from "./debug";

const { Alexa } = require('./alexa');

export type commandCallback = (alexa: typeof Alexa, args?: string, user?: User) => void;

export class AlexaMaker {
  /**
   * Map of commands that Alexa will response to using callback
   */
  commands: Map<string, commandCallback>;
  /**
   * Map of already working Alexas per guild.
   */
  alexas: Map<Guild, typeof Alexa>;
  /**
   * Class for initializing voice bots
   */
  constructor() {
    this.commands = new Map;
    this.alexas = new Map;
  }
  /**
   * Use this to add commands to your bot
   * @param command What should be said after wakeword to invoke callback
   * @param callback Here you specify what should happen after user speaks this command
   */
  addCommand(command: string, callback: commandCallback) {
    this.commands.set(command, callback);
  }
  /**
   * Function for creating or getting already created {@link Alexa}
   * @param guild Guild where bot is working
   * @param textChannel This is where bot will send messages
   * @param debugOptions Here you can specify debug options
   */
  getAlexa(guild: Guild, textChannel: TextChannel, debugOptions?: DebugOptions): typeof Alexa {
    if (!this.alexas.has(guild)) {
      this.alexas.set(guild, new Alexa(
        guild,
        textChannel,
        this.commands,
        debugOptions));
    }
    return this.alexas.get(guild);
  }
}
